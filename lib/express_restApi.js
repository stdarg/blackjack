/**
 * @fileOverview
 * Defines the routes for the REST API of the Blackjack server.
 */
'use strict';
var express = require('express');
var router = express.Router();
//var JsonRestApi = require('json-rest-api');
var is = require('is2');
var assert = require('assert');

var Tables = require('./tables');
var Players = require('./players');
var debug = require('debug')('blackjack:restApi');



router.use(function (req, res, next) {
    console.log('express_restApi');
    next();
});

router.get('/', function (req, res) {
    res.json({ message: 'api' });
});


//login
router.route('/login')

    .get(function (req, res) {
        //console.log('login');
    })

    .post(function (req, res) {

        var json = req.body.name; //replaced json param

        if (!is.nonEmptyStr(json.playerName)) {
            res.json({
                success: false,
                cmd: 'login',
                error: 'Invalid name field: ' + json.playerName
            });
            return;
        }
        var playerName = json.playerName;
        var id;
        var tables;
        var player;
        try {
            id = Players.login(playerName);
            player = Players.getById(id);
            tables = Tables.viewTables();
        } catch (err) {
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
    })


//joinTable
router.route('/jointable')

    .get(function (req, res) {
        //
    })

    .post(function (req, res) {

        var json = req.body.name;

        var table;
        var info;
        var player;
        try {
            logger.debug('joinTable json %j', json);
            if (!is.obj(Tables.all[json.tableId])) {
                var err = new Error('There is no table with id: ' + json.tableId);
                res.json({
                    success: false,
                    cmd: 'joinTable',
                    error: err.message,
                    stack: err.stack
                });
                return;
            }
            info = getInfoFromReq(req, res, json, 'joinTable', { tableFromId: true });
            if (info === false)
                return;
            assert.ok(info !== false);
            assert.ok(is.nonEmptyObj(info));
            assert.ok(is.nonEmptyObj(info.table));
            info.table.addPlayer(json.playerId);
            table = info.table.view();
            player = Players.getById(json.playerId);
        } catch (err) {
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

    })


    /////////////////////////////////

function getInfoFromReq(req, res, json, cmd, opts) {
    assert.ok(is.nonEmptyObj(opts));
    assert.ok(is.nonEmptyObj(json));
    if (is.string(json.player)) {
        var playerId = Math.floor(json.playerId);
        if (is.nan(json.player)) {
            res.json({
                success: false,
                cmd: cmd,
                error: 'Invalid player id: ' + json.playerId,
            });
            return false;
        }
        json.playerId = playerId;
    }
    var data = {};
    if (opts.player || opts.table) {
        data.player = getPlayerFromReq(req, res, json, cmd);
    }
    if (opts.table) {
        data.table = getTableFromReq(req, res, json, cmd, data.player);
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
            error: 'Invalid player id: ' + json.playerId,
        });
        return false;
    }
    var player = Players.getById(json.playerId);
    if (is.undef(player)) {
        res.json({
            success: false,
            cmd: cmd,
            error: 'No player with id: ' + json.playerId,
        });
        return false;
    }
    assert.ok(is.nonEmptyObj(player));
    return player;
}

function getTableFromReq(req, res, json, cmd, player) {
    var tableId = player.tableId;
    if (!is.positiveInt(tableId))
        return false;
    var table = Tables.getById(tableId);
    if (!is.nonEmptyObj(table))
        return false;
    return table;
}

function getTableFromId(req, res, json) {
    if (!is.positiveInt(json.tableId))
        return false;
    assert.ok(is.obj(Tables.all));
    if (Tables.all.length <= json.tableId)
        return false;
    var table = Tables.all[json.tableId];
    assert.ok(is.nonEmptyObj(table));
    return table;
}



module.exports = router;

