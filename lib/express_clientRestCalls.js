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
var URL = 'http://' + HOST + ':' + PORT + '/api';

/**
 * logs a player into the game
 * @param {Object} body The body of the HTTP message
 * @param {Function} cb error callback of form fn(err, json), where json is the
 *      json response body from the server.
 */
function login(body, cb) {
    //var qs = null;
    //cmd('login', 'POST', body, qs, cb);
    request.post(URL + '/login', {
        json: {
            name: body
        }
    }, (error, res, body) => {
        if (error) {
            console.error(error);
            return
        }
        cb(null, body);
    });



}

// exports for use by other files
module.exports = {
    login: login
};
