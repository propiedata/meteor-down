const _ = require('underscore');
const util = require('util');
const urlParse = require('url').parse;
const DDPClient = require('ddp');

module.exports = Client;

function Client(options) {
   if (options.useSockJs === undefined) {
    options.useSockJs = true;
  }

  const ddpOptions = this._urlToDDPOptions(options.url);
  ddpOptions.useSockJs = options.useSockJs;
  DDPClient.call(this, ddpOptions);

  this.options = options;
  this.stats = options.stats;
  this._currentUser = null;
}

util.inherits(Client, DDPClient);

Client.prototype._call = Client.prototype.call;
Client.prototype.call = function () {
  if (!(arguments.length && typeof arguments[0] === 'string')) {
    throw new Error('Invalid arguments for method call');
  }

  const parameters = _.toArray(arguments);
  const methodName = parameters.shift();
  const callback = parameters[parameters.length - 1];

  if (typeof callback === 'function') {
    const startTime = Date.now();

    this._call(methodName, parameters, () => {
      const time = Date.now() - startTime;
      this.emit('stats', 'method-response-time', methodName, time);
      callback && callback.apply(null, arguments);
    });
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    this._call(methodName, parameters, (error, response) => {
      const time = Date.now() - startTime;
      this.emit('stats', 'method-response-time', methodName, time);

      if (error) {
        return reject(error);
      }

      return resolve(response);
    });
  });
}

Client.prototype._subscribe = Client.prototype.subscribe;
Client.prototype.subscribe = function () {
  if (!(arguments.length && typeof arguments[0] === 'string')) {
    throw new Error('Invalid arguments for subscription');
  }

  const parameters = _.toArray(arguments);
  const publicationName = parameters.shift();
  const callback = parameters[parameters.length - 1];

  if (typeof callback === 'function') {
    const callback = parameters.pop();
    const startTime = Date.now();

    return this._subscribe(publicationName, parameters, () => {
      const time = Date.now() - startTime;
      this.emit('stats', 'pubsub-response-time', publicationName, time);
      callback && callback.apply(null, arguments);
    });
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    this._subscribe(publicationName, parameters, (error, response) => {
      const time = Date.now() - startTime;
      this.emit('stats', 'pubsub-response-time', publicationName, time);

      if (error) {
        return reject(error);
      }

      return resolve(response);
    });
  });
}

Client.prototype.kill = function () {
  this.close();
  this.emit('disconnected');
}

Client.prototype._urlToDDPOptions = function(url) {
  const parsedUrl = urlParse(url);
  const pathname = parsedUrl.pathname.substr(1);

  let port = parsedUrl.port;
  const isSSL = /^https/.test(parsedUrl.protocol);

  if (!port) {
    port = (isSSL)? 443: 80;
  }

  return {
    path: pathname,
    host: parsedUrl.hostname,
    port,
    use_ssl: isSSL
  };
};

Client.prototype.init = function (callback) {
  this.connect((error) => {
    const params = this._getLoginParams();

    if (error) {
      callback(error);
    } else if(params) {
      this.login(params, callback);
    } else {
      callback(error);
    }
  });
}

Client.prototype.login = function (params, callback) {
  this._call('MeteorDown:login', params, (error, user) => {
    if (error) {
      const message = util.format('Login Error %s', error.message);
      error = new Error(message);
      callback(error);
    } else {
      this._currentUser = user;
      callback();
    }
  });
}

Client.prototype.user = function () {
  return this._currentUser;
}

Client.prototype.userId = function () {
  return this._currentUser && this._currentUser._id;
}

Client.prototype._getLoginParams = function () {
  const auth = this.options.auth;

  if (this.options.key && auth && auth.userIds && auth.userIds.length) {
    const userId = this._pickRandom(auth.userIds);
    return [this.options.key, {userId: userId}];
  }
};

Client.prototype._pickRandom = function (array) {
  return array[_.random(array.length-1)];
}

module.exports = Client;
