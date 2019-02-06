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

/* login */
router.route('/login')

    .get(function (req, res) {

        console.log('login');

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

module.exports = router;

