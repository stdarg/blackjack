/**
 * @fileOverview
 * Defines the routes for the REST API of the Blackjack server.
 */
'use strict';
var JsonRestApi = require('json-rest-api').RestApi;
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

    // debug routes, not for production
    if (is.nonEmptyStr(process.NODE_ENV) &&
        process.NODE_ENV.toLowerCase() !== 'production') {
        RestApi.addRoute('post', '/debug/credits', debugCredits);
        RestApi.addRoute('post', '/debug/getPlayer', debugGetPlayer);
    }
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
            error: 'Error viewing tables: '+err.message,
            stack: err.stack
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
            error: 'Invalid name field: '+json.playerName
        });
        return;
    }
    var playerName = json.playerName;
    var id;
    var tables;
    try {
        id  = Players.login(playerName);
        tables = Tables.viewTables();
    } catch(err) {
        res.json({success: false, cmd: 'login', error: err.message});
        return;
    }
    res.json({success: true, cmd: 'login', playerId: id, tables: tables});
}

function joinTable(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'joinTable', {tableFromId: true});
    if (info === false)
        return;
    var table;
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.addPlayer(json.playerId);
        table = info.table.view();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'joinTable',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({success: true, cmd: 'joinTable', table: table});
}

function leaveTable(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'leaveTable', {table: true});
    if (info === false)
        return;
    var tables;
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.rmPlayer(json.playerId);
        tables = Tables.viewTables();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({success: true, cmd: 'leaveTable', tables: tables});
}

function bet(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'bet', {table: true});
    if (info === false)
        return;
    var table;
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.bet(json.playerId, json.bet);
        table = info.table.view();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'bet',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'bet',
        bet: json.bet,
        hand: info.player.hand,
        table: table
    });
}

function hit(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'hit', {table: true});
    if (info === false)
        return;
    var table;
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.hit(json.playerId, json.hand);
        table = info.table.view();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'hit',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    var data = {
        success: true,
        cmd: 'hit',
        hand: info.player.hand,
        table: table
    };
    if (info.player.hand2)
        data.hand2 = info.player.hand2;
    res.json(data);
}

function stand(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'stand', {table: true});
    if (info === false)
        return;
    var table;
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.stand(json.playerId, json.hand);
        table = info.table.view();
    } catch(err) {
        res.json({
            success: false,
            cmd: 'stand',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({success:true, cmd:'stand', hand:info.player.hand, table:table});
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

function debugCredits(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'debug/credits', {player: true});
    try {
        assert.ok(is.obj(json));
        assert.ok(is.int(json.credits));
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        info.player.credits = json.credits;
    } catch(err) {
        res.json({
            success: false,
            cmd: 'debug/credits',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({success:true, cmd:'debug/credits', player:info.player});
}


function debugGetPlayer(req, res, json) {
    var info = getInfoFromReq(req, res, json, 'debug/getPlayer', {player:true});
    try {
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
    } catch(err) {
        res.json({
            success: false,
            cmd: 'debug/getPlayer',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({success:true, cmd:'debug/getPlayer', player:info.player});
}

////////////////////////////////////////////////////////////////////////////////

function getInfoFromReq(req, res, json, cmd, opts) {
    assert.ok(is.nonEmptyObj(opts));
    assert.ok(is.nonEmptyObj(json));
    var data = {};
    if (opts.player || opts.table) {
        data.player = getPlayerFromReq(req, res, json, cmd);
        if (data.player === false)
            return false;
    }
    if (opts.table) {
        data.table = getTableFromReq(req,res, json, cmd, data.player);
        if (data.table === false)
            return false;
    } else if (opts.tableFromId) {
        assert.ok(is.positiveInt(json.tableId));
        data.table = getTableFromId(req, res, json, cmd);
        if (data.table === false)
            return false;
    }
    return data;
}

function getPlayerFromReq(req, res, json, cmd) {
    if (!is.positiveInt(json.playerId)) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'Invalid player id: '+json.playerId,
        });
        return false;
    }
    var player = Players.getById(json.playerId);
    if (is.undef(player)) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'No player with id: '+json.playerId,
        });
        return false;
    }
    assert.ok(is.nonEmptyObj(player));
    return player;
}

function getTableFromReq(req, res, json, cmd, player) {
    var tableId = player.tableId;
    if (!is.positiveInt(tableId)) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'Bad table id on player: '+tableId,
        });
        return false;
    }
    var table = Tables.getById(tableId);
    if (!is.nonEmptyObj(table)) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'Player '+json.playerId+' has a bad table id: '+tableId,
        });
        return false;
    }
    return table;
}

function getTableFromId(req, res, json, cmd) {
    if (!is.positiveInt(json.tableId)) {
        res.json({success: false, cmd: cmd, error: 'Bad table id: '+
                 json.tableId});
        return false;
    }
    assert.ok(is.obj(Tables.all));
    if (Tables.all.length <= json.tableId) {
        res.json({success: false, cmd: cmd, error: 'No such table id: '+
                 json.tableId});
        return false;
    }
    var table = Tables.all[json.tableId];
    assert.ok(is.nonEmptyObj(table));
    return table;
}

/*
function viewPlayersTable(req, res, cmd, table) {
    var data;
    try {
        data = table.view();
    } catch(err) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'Error viewing current table: '+err.message
        });
        return false;
    }
    return data;
}
*/
