/**
 * @fileOverview
 * Defines the routes for the REST API of the Blackjack server.
 */

'use strict';
var JsonRestApi = require('json-rest-api').RestApi;
//var inspect = require('util').inspect;
var is = require('is2');
var assert = require('assert');

var Tables = require('./tables');
var Players = require('./players');
var debug = require('debug')('blackjack:restApi');
var PORT = 4201;

var RestApi = new JsonRestApi({port: PORT}, function(err) {
    if (err) {
        debug('error:',err.message);
        return;
    }
    console.log('Listening on port %s.', PORT);

    // add a route
    RestApi.addRoute('get', '/ping', ping);
    RestApi.addRoute('get', '/viewTables', viewTables);
    RestApi.addRoute('post', '/login', login);
    RestApi.addRoute('post', '/joinTable', joinTable);
    RestApi.addRoute('post', '/leaveTable', leaveTable);
    RestApi.addRoute('post', '/bet', bet);
    RestApi.addRoute('post', '/hit', hit);
    RestApi.addRoute('post', '/stand', stand);
    RestApi.addRoute('post', '/doubledown', doubledown);
    RestApi.addRoute('post', '/surrender', surrender);
    RestApi.addRoute('post', '/split', split);
});


function ping(req, res) {
    res.json({success: true, cmd: 'ping', ping: 'pong'});
}

function viewTables(req, res) {
    var data;
    try {
        data = Tables.viewTables();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'viewTables',
            error: 'Error viewing tables: '+err.message
        });
        return;
    }
    res.json({success: true, cmd: 'viewTables', tables: data});
}

function login(req, res, json) {
    if (!is.nonEmptyStr(json.playerName)) {
        res.json({
            success: false,
            cmd: 'login',
            error: 'Invalid name field: '+json.playerName,
        });
        return;
    }
    var playerName = json.playerName;
    var id = Players.login(playerName);
    res.json({success: true, cmd: 'viewTables', playerId: id});
}

function joinTable(req, res, json) {
    if (!is.positiveInt(json.playerId)) {
        res.json({
            success: false,
            cmd: 'joinTable',
            error: 'Invalid player id: '+json.playerId,
        });
        return;
    }
    if (!is.positiveInt(json.tableId)) {
        res.json({
            success: false,
            cmd: 'joinTable',
            error: 'Invalid table id: '+json.tableId,
        });
        return;
    }
    var table = Tables.all[json.tableId];
    if (is.undef(table)) {
        res.json({
            success: false,
            cmd: 'joinTable',
            error: 'No table found for table id: '+json.tableId,
        });
        return;
    }

    try {
        table.addPlayer(json.playerId);
    } catch(err) {
        res.json({
            success: false,
            cmd: 'joinTable',
            error: 'Error joining table: '+err.message
        });
        return;
    }

    res.json({success: true, cmd: 'joinTable'});
}

function leaveTable(req, res, json) {
    if (!is.positiveInt(json.playerId)) {
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: 'Invalid player id: '+json.playerId,
        });
        return;
    }
    var player = Players.getById(json.playerId);
    if (is.undef(player)) {
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: 'No player with id: '+json.playerId,
        });
        return;
    }
    assert.ok(is.nonEmptyObj(player));
    var tableId = player.tableId;
    if (!is.positiveInt(tableId)) {
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: 'Bad table id on player: '+tableId,
        });
        return;
    }
    var table = Tables.getById(tableId);
    if (!is.nonEmptyObj(table)) {
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: 'Player '+json.playerId+' has a bad table id: '+tableId,
        });
        return;
    }

    table.rmPlayer(json.playerId);
    res.json({success: true, cmd: 'leaveTable'});
}

function bet(req, res, json) {
    if (!is.positiveInt(json.playerId)) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'Invalid player id: '+json.playerId,
        });
        return;
    }
    if (!is.positiveInt(json.bet)) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'Invalid bet: '+json.bet
        });
        return;
    }
    var player = Players.getById(json.playerId);
    if (is.undef(player)) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'No player with id: '+json.playerId,
        });
        return;
    }
    assert.ok(is.nonEmptyObj(player));
    var tableId = player.tableId;
    if (!is.positiveInt(tableId)) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'Bad table id on player: '+tableId,
        });
        return;
    }
    var table = Tables.getById(tableId);
    if (!is.nonEmptyObj(table)) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'Player '+json.playerId+' has a bad table id: '+tableId,
        });
        return;
    }
    try {
        table.bet(json.playerId, json.bet);
    } catch(err) {
        res.json({
            success: false,
            cmd: 'bet',
            error: 'Error betting: '+err.message
        });
        return;
    }

    res.json({success: true, cmd: 'bet', bet: json.bet});
}

function hit(req, res) {
    res.json({success: true, cmd: 'hit', ping: 'pong'});
}

function stand(req, res) {
    res.json({success: true, cmd: 'stand', ping: 'pong'});
}

function doubledown(req, res) {
    res.json({success: true, cmd: 'doubledown', ping: 'pong'});
}

function surrender(req, res) {
    res.json({success: true, ping: 'pong'});
}

function split(req, res) {
    res.json({success: true, ping: 'pong'});
}
