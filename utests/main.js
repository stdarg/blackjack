/**
 * Driver for user tests.
 */
'use strict';
var async = require('async');
var Player = require('./player');

// create global config object
var Config = require('config-js').Config;
var path = require('path');
var logPath = path.join(__dirname, '..', 'conf', 'config.js');
global.config = new Config(logPath);

var players;    // an array of all the simulated players

/**
 *
 */
function userTest(player, cb) {
    logger.info('userTest for %s',player.name);
    player.act(function(err) {
        if (err) {
            logger.error('usertest %s',err.message);
            logger.error('usertest %s',err.stack);
        }
        //logger.info('completed userTest for %s',player.name);
        cb(err);
    });
}

/**
 *
 */
function runUserTests(cb) {
    async.each(players, userTest, function(err) {
        if (err) {
            logger.error('runUserTests %s',err.message);
            logger.error('runUserTests %s',err.stack);
        }
        cb();
    });
}

/**
 *
 */
function testLoop() {
    async.whilst(
        // synch truth test to perform before each execution of runUserTests
        function() {
            return true;
        },
        runUserTests,       // async action
        function(err) {     // end action, called on error or when test is false
            if (err) {
                logger.error('async.whilst %s',err.message);
                logger.error('async.whilst %s',err.stack);
            }
            logger.info('User tests ended.');
        }
    );
}

/**
 *
 */
function main() {
    // create a logger
    var Log = require('fuzelog');
    var defaultOpts = {
        level: 'debug',
        name: 'utests',            // Category name, shows as %c in pattern
        file: __dirname + '/utests.log',
        fileFlags: 'w',             // Flags used in fs.createWriteStream
        consoleLogging: true,       // Flag to direct output to console
        colorConsoleLogging: true,  // Flag to color output to console
        logMessagePattern: '[%d{ISO8601}] [%p] %c - %m{1}'
    };
    var opts = config.get('utests.logging', defaultOpts);
    global.logger = new Log(opts);

    // create a player, with a behavior
    players = [
        new Player(1),
        new Player(2),
        new Player(1),
        new Player(2),
        new Player(1),
        new Player(2)
    ];

    // log all the players into the game
    var tableId = 1;
    async.each(players,
        function logIn(player, cb) {
            player.loginJoinTable(tableId++, function(err) {
                if (err) {
                    logger.debug('%s error on login: %s', player.name,
                                 err.message);
                } else {
                    logger.debug('%s logged in.', player.name);
                }
                cb(err);
            });
        },
        function end(err) {
            if (err) {
                logger.error('logIn %s',err.message);
                logger.error('logIn %s',err.stack);
                return;
            }
            testLoop();
        }
    );
}

main();         // program execution starts here.
