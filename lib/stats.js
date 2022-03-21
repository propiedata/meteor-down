const _ = require('underscore');

function Stats () {
  this.reset();
}

Stats.prototype.reset = function() {
  this.start = new Date();
  this.data = {};
}

Stats.prototype.track = function (type, name, value) {
  this.data[type] = this.data[type] || {};
  this.data[type][name] = this.data[type][name] || [];
  this.data[type][name].push(value);
}

Stats.prototype.get = function () {
  const stats = {start: this.start, end: new Date(), data: {}};

  this._getData().forEach(function (item) {
    stats.data[item.type] = item;
    delete stats.data[item.type].type;
  });

  return stats;
}

Stats.prototype._getData = function () {
  return _.map(this.data, function (data, type) {
    const addFn = function (x, y) { return x + y };
    const breakdown = _.map(data, function (values, name) {
      return {
        name: name,
        total: values.reduce(addFn, 0),
        count: values.length
      };
    });

    const summary = breakdown.reduce(function (total, current) {
      return {
        total: total.total + current.total,
        count: total.count + current.count
      };
    }, {total: 0, count: 0});

    return {
      type,
      summary,
      breakdown
    }
  });
}

module.exports = Stats;
