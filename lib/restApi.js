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
    logger.info('Listening on port %s.', PORT);

    // add a route
    RestApi.addRoute('get', '/ping', ping);
    RestApi.addRoute('get', '/viewTables', viewTables);
    RestApi.addRoute('post', '/login', login);
    RestApi.addRoute('post', '/logout', logout);
    RestApi.addRoute('post', '/joinTable', joinTable);
    RestApi.addRoute('post', '/leaveTable', leaveTable);
    RestApi.addRoute('post', '/bet', bet);
    RestApi.addRoute('post', '/hit', hit);
    RestApi.addRoute('post', '/stand', stand);
    RestApi.addRoute('post', '/doubledown', doubledown);
    RestApi.addRoute('post', '/surrender', surrender);
    RestApi.addRoute('post', '/split', split);

    // debug routes, not for production
    if (!(is.nonEmptyStr(process.NODE_ENV) &&
        process.NODE_ENV.toLowerCase() === 'production')) {
        logger.info('Adding debug routes');
        RestApi.addRoute('post', '/debugCredits', debugCredits);
        RestApi.addRoute('post', '/debugGetPlayer', debugGetPlayer);
        RestApi.addRoute('post', '/debugGameState', debugGameState);
    }
});

function ping(req, res) {
    logger.info('/ping');
    res.json({success: true, cmd: 'ping', ping: 'pong'});
}

function viewTables(req, res) {
    var data;
    try {
        data = Tables.viewTables();
    } catch(err) {
        logger.error('/viewTables %s', err.message);
        logger.error('/viewTables stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'viewTables',
            error: 'Error viewing tables: '+err.message,
            stack: err.stack
        });
        return;
    }
    var info = {success: true, cmd: 'viewTables', tables: data};
    logger.info('/viewTables %j', info);
    res.json(info);
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
    var player;
    try {
        id  = Players.login(playerName);
        player = Players.getById(id);
        tables = Tables.viewTables();
    } catch(err) {
        logger.error('/login %s', err.message);
        logger.error('/login stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'login',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    var data = {
        success: true,
        cmd: 'login',
        playerId: id,
        player: player,
        tables: tables
    };
    if (player.tableId !== -1 && is.positiveInt(player.tableId))
        data.table = tables[player.tableId];
    res.json(data);
}

function logout(req, res, json) {
    var info;
    try {
        logger.debug('logout json %j', json);
        info = getInfoFromReq(req, res, json, 'logout', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        assert.ok(is.nonEmptyObj(info.table));
        if (info.player.tableId !== -2)
            info.table.rmPlayer(json.playerId);
    } catch(err) {
        logger.error('/logout %s', err.message);
        logger.error('/logout stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'logout',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'logout',
        credits: info.player.credits
    });
}

function joinTable(req, res, json) {
    var table;
    var info;
    var player;
    try {
        logger.debug('joinTable json %j', json);
        if (!is.obj(Tables.all[json.tableId])) {
            var err = new Error('There is no table with id: '+json.tableId);
            res.json({
                success: false,
                cmd: 'joinTable',
                error: err.message,
                stack: err.stack
            });
        }
        info = getInfoFromReq(req, res, json, 'joinTable', {tableFromId: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.addPlayer(json.playerId);
        table = info.table.view();
        player = Players.getById(json.playerId);
    } catch(err) {
        logger.error('/joinTable %s', err.message);
        logger.error('/joinTable stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'joinTable',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'joinTable',
        table: table,
        player: player
    });
}

function leaveTable(req, res, json) {
    var tables;
    var info;
    try {
        info = getInfoFromReq(req, res, json, 'leaveTable', {table: true});
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        assert.ok(is.nonEmptyObj(info.player));
        info.table.rmPlayer(json.playerId);
        tables = Tables.viewTables();
        assert.ok(info.player.tableId === -1);
    } catch(err) {
        logger.error('/leaveTable %s', err.message);
        logger.error('/leaveTable stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'leaveTable',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'leaveTable',
        player: info.player,
        tables: tables
    });
}

function bet(req, res, json) {
    var info;
    var table;
    try {
        info = getInfoFromReq(req, res, json, 'leaveTable', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.table));
        assert.ok(is.nonEmptyObj(info.player));
        if (json.bet > info.player.credits) {
            var err = new Error('Bet amount '+json.bet+' is more than you '+
                                'currently have: '+info.player.credits);
            res.json({
                success: false,
                cmd: 'bet',
                error: err.message,
                stack: err.stack
            });
            return;
        }
        info.table.bet(json.playerId, json.bet);
        table = info.table.view();
    } catch(err) {
        logger.error('/bet %s', err.message);
        logger.error('/bet stack %s', err.stack);
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
        player: info.player,
        table: table
    });
}

function hit(req, res, json) {
    var info;
    var table;
    try {
        info = getInfoFromReq(req, res, json, 'leaveTable', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        if (!is.positiveInt(json.hand))
            json.hand = 1;
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.hit(json.playerId, json.hand);
        table = info.table.view();
    } catch(err) {
        logger.error('/hit %s', err.message);
        logger.error('/hit stack %s', err.stack);
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
        player: info.player,
        table: table
    };
    res.json(data);
}

function stand(req, res, json) {
    var info;
    var table;
    try {
        info = getInfoFromReq(req, res, json, 'leaveTable', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        assert.ok(is.nonEmptyObj(info.table));
        info.table.stand(json.playerId, json.hand);
        table = info.table.view();
    } catch(err) {
        logger.error('/stand %s', err.message);
        logger.error('/stand stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'stand',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'stand',
        player: info.player,
        table: table
    });
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
    var info;
    try {
        info = getInfoFromReq(req, res, json, 'debug/credits', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.obj(json));
        assert.ok(is.int(json.credits));
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
        info.player.credits = json.credits;
    } catch(err) {
        logger.error('/debug/credits %s', err.message);
        logger.error('/debug/credits stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'debug/credits',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success: true,
        cmd: 'debug/credits',
        player: info.player,
        table: info.table.view(),
    });
}

function debugGetPlayer(req, res, json) {
    var info;
    try {
        info = getInfoFromReq(req, res, json, 'debug/credits', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
    } catch(err) {
        logger.error('/debug/getPlayer %s', err.message);
        logger.error('/debug/getPlayer stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'debug/getPlayer',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    res.json({
        success:true,
        cmd: 'debug/getPlayer',
        player: info.player,
        table: info.table.view()
    });
}

function debugGameState(req, res, json) {
    var info;
    try {
        info = getInfoFromReq(req, res, json, 'debug/credits', {table: true});
        if (info === false)
            return;
        assert.ok(info !== false);
        assert.ok(is.nonEmptyObj(info));
        assert.ok(is.nonEmptyObj(info.player));
    } catch(err) {
        logger.error('/debug/gameState %s', err.message);
        logger.error('/debug/gameState stack %s', err.stack);
        res.json({
            success: false,
            cmd: 'debug/gameState',
            error: err.message,
            stack: err.stack
        });
        return;
    }
    var data = {
        success:true,
        cmd: 'debug/gameState',
        player: info.player,
        table: info.table.view(),
        tables: Tables.viewTables()
    };
    logger.info('/debug/gameState %j', data);
    res.json(data);
}

////////////////////////////////////////////////////////////////////////////////

function getInfoFromReq(req, res, json, cmd, opts) {
    assert.ok(is.nonEmptyObj(opts));
    assert.ok(is.nonEmptyObj(json));
    var data = {};
    if (opts.player || opts.table) {
        data.player = getPlayerFromReq(req, res, json, cmd);
    }
    if (opts.table) {
        data.table = getTableFromReq(req,res, json, cmd, data.player);
    } else if (opts.tableFromId) {
        assert.ok(is.positiveInt(json.tableId));
        data.table = getTableFromId(req, res, json, cmd);
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
