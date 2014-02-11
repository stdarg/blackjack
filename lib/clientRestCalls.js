/**
 * @fileOverview
 * A re-usable API for clients to employ when making calls to the server REST
 * API.
 */

'use strict';
var request = require('request');

var Config = require('config-js').Config;
var path = require('path');
var logPath = path.join(__dirname, '..', 'conf', 'config.js');
var config = new Config(logPath);

var PORT = config.get('port', 4201);
var HOST = config.get('host', 'localhost');
var URL = 'http://'+HOST+':'+PORT;

/**
 * logs a player into the game
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function login(body, cb) {
    cmd('login', 'POST', body, cb);
}

/**
 * get all the tables in the game with the players at them
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function viewTables(cb) {
    cmd('viewTables', 'GET', true, cb);
}

/**
 * join a table to start playing a game
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function joinTable(body, cb) {
    cmd('joinTable', 'POST', body, cb);
}

/**
 * leave a table and return to the lobby
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function leaveTable(body, cb) {
    cmd('leaveTable', 'POST', body, cb);
}

/**
 * set the bet for the next hand
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function bet(body, cb) {
    cmd('bet', 'POST', body, cb);
}

/**
 * player is requesting another card
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function hit(body, cb) {
    cmd('hit', 'POST', body, cb);
}

/**
 * player wants to stand on current hand
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function stand(body, cb) {
    cmd('stand', 'POST', body, cb);
}

/**
 * set the amount of credits a player has
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function debugCredits(body, cb) {
    cmd('debugCredits', 'POST', body, cb);
}

/**
 * get player information
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function debugGetPlayer(body, cb) {
    cmd('debugGetPlayer', 'POST', body, cb);
}

/**
 * get all game state information
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function debugGameState(body, cb) {
    cmd('debugGameState', 'POST', body, cb);
}

/**
 * makes HTTP request using the request module.
 * @param {String} apiCmd The name of the api command we are acting for
 * @param {String} method The HTTP method we are using.
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function cmd(apiCmd, method, body, cb) {
    var opts = {
        method:method,
        json:body,
        uri: URL+'/'+apiCmd,
        pool: false
    };

    request(opts,
        function(err, res, json) {
            if (err) {
                logger.error('%s: %j', apiCmd, json);
                return cb(err);
            } else if (json.success === false) {
                logger.error('%s: %j', apiCmd, json);
                return cb(new Error(json.error), json);
            } else {
                logger.debug('%s: %j', apiCmd, json);
            }
            cb(null, json);
        }
    );
}

// exports for use by other files
module.exports = {
    login: login,
    viewTables: viewTables,
    joinTable: joinTable,
    leaveTable: leaveTable,
    bet: bet,
    hit: hit,
    stand: stand,
    debugCredits: debugCredits,
    debugGetPlayer: debugGetPlayer,
    debugGameState: debugGameState
};
