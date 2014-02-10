#!/usr/bin/env node

var Log = require('fuzelog');
var Config = require('config-js').Config;
var path = require('path');
var logPath = path.join(__dirname, '..', 'conf', 'config.js');
global.config = new Config(logPath);

var defaultOpts = {
    level: 'debug',
    name: 'blackjack_server',  // Category name, shows as %c in pattern

    // FileStream to log to (can be file name or a stream)
    file:  './server.log',
    fileFlags: 'w',             // Flags used in fs.createWriteStream to
                                //   create log file
    consoleLogging: true,       // Flag to direct output to console
    colorConsoleLogging: true,  // Flag to color output to console

    // Usage of the log4js layout
    logMessagePattern: '[%d{ISO8601}] [%p] %c - %m{1}'
};

// get logging setup from config
var opts = config.get('server.logging', defaultOpts);
global.logger = new Log(opts);

// start the rest api
require('../lib/restApi');

