#!/usr/bin/env node

// set a high number for the maxSockets
// we don't need pooling here
require('http').globalAgent.maxSockets = 999999;

const vm = require('vm');
const fs = require('fs');

const MeteorDownClient = require('../lib/mdown')


const filePath = process.argv[2];

if (!filePath) {
  showHelp();
  process.exit(1);
}

const meteorDown = new MeteorDownClient();

const content = fs.readFileSync(filePath).toString();

const context = {
  require,
  meteorDown
};

// important: getOwnPropertyNames can get both enumerables and non-enumerables
Object.getOwnPropertyNames(global).forEach(function (key) {
  context[key] = global[key];
});

vm.runInNewContext(content, context);

/* ------------------------------------------------------------------------- */

setInterval(function () {
  printStats(meteorDown.stats.get());
  meteorDown.stats.reset();
}, 1000 * 5);

/* ------------------------------------------------------------------------- */

function showHelp() {
  // TODO improve help and CLI interface
  console.log(
    'USAGE:\n'+
    '  meteor-down <path-to-script>\n'
  );
}

function printStats(stats) {
  const duration = stats.end - stats.start;

  console.log('--------------------------------------------------')
  console.log('Time   : %s', stats.end.toLocaleString());

  if (stats.data['method-response-time']) {
    const methodSummary = stats.data['method-response-time'].summary;
    const methodBreakdown = stats.data['method-response-time'].breakdown;

    console.log('Method : average: %d/min %dms ',
      parseInt(methodSummary.count * 60000 / duration),
      parseInt(methodSummary.total / methodSummary.count));

    methodBreakdown.forEach(function (item) {
      console.log('         %s: %d/min %dms', item.name,
        parseInt(item.count * 60000 / duration),
        parseInt(item.total / item.count));
    });
  }

  if (stats.data['pubsub-response-time']) {
    const pubsubSummary = stats.data['pubsub-response-time'].summary;
    const pubsubBreakdown = stats.data['pubsub-response-time'].breakdown;

    console.log('PubSub : average: %d/min %dms ',
      parseInt(pubsubSummary.count * 60000 / duration),
      parseInt(pubsubSummary.total / pubsubSummary.count));

    pubsubBreakdown.forEach(function (item) {
      console.log('         %s: %d/min %dms', item.name,
        parseInt(item.count * 60000 / duration),
        parseInt(item.total / item.count));
    });
  }
}
