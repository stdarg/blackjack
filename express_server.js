#!/usr/bin / env node

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app = express();

var Log = require('fuzelog');
var Config = require('config-js').Config;
var path = require('path');
var logPath = path.join(__dirname, '/', 'conf', 'config.js');
global.config = new Config(logPath);

app.use(morgan('dev')); // log requests to the console
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//api
var routes = require('./lib/express_restApi');
app.use('/api', routes);

const port = process.env.PORT || 4201; // set our port

var defaultOpts = {
    level: 'debug',
    name: 'blackjack_server',  // Category name, shows as %c in pattern

    // FileStream to log to (can be file name or a stream)
    file: './express_server.log',
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

//static index if you want...
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'jade');
app.get('/', function (req, res, next) {
    res.render('index', { title: '' });
});

app.listen(port, (err) => {
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
});