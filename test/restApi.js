/**
 * Unit tests for the rest api.
 */

'use strict';
var assert = require('assert');
var is = require('is2');
var restApi = require('../lib/clientRestCalls');
var tcpPortUsed = require('tcp-port-used');
var randomName = require('names');

// ../lib/clientRestCalls uses the config, so make one
//var Config = require('config-js').Config;
//var path = require('path');
//var logPath = path.join(__dirname, '..', 'conf', 'config.js');
//global.config = new Config(logPath);

//console.log('\nPORT: %s',config.get('port',6666));

// ../lib/clientRestCalls uses the logger, so make a fake one for it
if (!global.logger) {
    global.logger = {
        debug: function() {},
        error: function() {},
        info: function() {},
        warn: function() {}
    };
}

var playerId;
var tables;

// ensure the server is running
tcpPortUsed.check(4201, '127.0.0.1')
    .then(function(inUse) {
        if (!inUse) {
            console.error('The server needs to be running to test the '+
                        'rest api\n');
            return;
        }
        doRestTests();
    },
    function(err) {
        console.error('Error on check:', err.message);
    }
);

function doRestTests() {
    describe('REST API', function() {
        var name = randomName();
        it('login should return a player id', function(done) {
            var body = { playerName: name };
            restApi.login(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('login',JSON.stringify(json));
                playerId = json.playerId;
                assert.ok(json.success === true);
                assert.ok(is.positiveInt(json.playerId));
                done();
            });
        });

        it('viewTables should return all the available tables', function(done) {
            restApi.viewTables(function(err, json) {
                if (err)
                    return done(err);
                //console.log('viewTables',JSON.stringify(json));
                assert.ok(json.success === true);
                tables = json.tables;
                assert.ok(is.nonEmptyObj(tables));
                assert.ok(Object.keys(json.tables).length > 1);
                done();
            });
        });

        it('joinTable should place a user at a table', function(done) {
            var body = { playerId: playerId, tableId: 1 };
            restApi.joinTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('joinTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(is.obj(json.player));
                assert.ok(is.obj(json.table));
                assert.ok(json.player.tableId === 1);
                done();
            });
        });

        it('leaveTable should place a user in the lobby', function(done) {
            var body = { playerId: playerId };
            restApi.leaveTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('leaveTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(is.obj(json.tables));
                assert.ok(json.player.tableId === -1);
                done();
            });
        });

        it('joinTable should place a user back at a table', function(done) {
            var body = { playerId: playerId, tableId: 2 };
            restApi.joinTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('joinTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(is.obj(json.table));
                assert.ok(json.player.tableId === 2);
                done();
            });
        });

        it('bet should cause a hand to be dealt', function(done) {
            var body = { playerId: playerId, bet: 10 };
            restApi.bet(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('\nbet',JSON.stringify(json));
                //var inspect = require('util').inspect;
                //console.log('\nbet', inspect(json, {depth:null,colors:true}));
                assert.ok(json.success === true);
                assert.ok(json.player.bet === 10);
                done();
            });
        });

        it('hit should get the player another card', function(done) {
            var body = { playerId: playerId, hand: 1 };
            restApi.hit(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('json.player',json.player);
                if (json.table.state === 'betting') {
                    var p = json.player.result.players[playerId];
                    assert.ok(p.hand.length === 3);
                } else {
                    assert.ok(json.player.hand.length === 3);
                }
                done();
            });
        });

        it('leaveTable should place a user in the lobby (again)',
        function(done) {
            var body = { playerId: playerId };
            restApi.leaveTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('leaveTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(json.player.tableId === -1);
                done();
            });
        });

        it('joinTable should place a user at a different table',
        function(done) {
            var body = { playerId: playerId, tableId: 3 };
            restApi.joinTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('joinTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(json.player.tableId === 3);
                done();
            });
        });

        it('bet should cause a hand to be dealt', function(done) {
            var body = { playerId: playerId, bet: 10 };
            restApi.bet(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('bet',JSON.stringify(json));
                assert.ok(json.success === true);
                //console.log('\nBET player: ',json.player);
                //console.log('\nBET table: ',json.table);
                assert.ok(json.player.hand.length === 2);
                done();
            });
        });

        it('stand should end the hand for the player', function(done) {
            var body = { playerId: playerId, hand: 1 };
            restApi.stand(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('stand',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(is.obj(json.player.result));
                done();
            });
        });

        it('leaveTable should place a user in the lobby (again)',
        function(done) {
            var body = { playerId: playerId };
            restApi.leaveTable(body, function(err, json) {
                if (err)
                    return done(err);
                //console.log('leaveTable',JSON.stringify(json));
                assert.ok(json.success === true);
                assert.ok(json.player.tableId === -1);
                done();
            });
        });
    });
}
