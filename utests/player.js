/**
 * An object to do player actions to test the server.
 */
'use strict';

module.exports = Player;

var async = require('async');
var randomName = require('names');
var is = require('is2');
//var restApi = require('./restApi');
var restApi = require('../lib/clientRestCalls');
var assert = require('assert');
var _ = require('lodash');
var MersenneTwister = require('mersenne-twister');

// MersenneTwister uses Date().getTime() as a default seed
var generator = new MersenneTwister();

/**
 * Player constructor
 * @constructor
 * @param {Number} behavior An integer identifying the behavior pattern.
 */
function Player(behaviorId) {
    var self = this;
    self.name = randomName();
    assert.ok(is.nonEmptyStr(self.name));
    self.behaviorId = behaviorId;
    assert.ok(is.int(self.behaviorId));
    self.loggedIn = false;
    self.tableId = -1;
}

/**
 * login and join a table picked at random.
 * @param {Number} table Table id of table to join.
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.loginJoinTable = function(table, cb) {
    var self = this;
    var body = {playerName: self.name};
    logger.debug('loginJoinTable');
    self.login(body, function(err, json) {
        logger.debug('loginJoinTable - cb json: %j', json);
        if (err) {
            logger.error('login: %s json: %j',err.message, json);
            return cb(err);
        }
        self.loggedIn = true;
        assert.ok(is.nonEmptyObj(json.player));
        assert.ok(is.int(json.player.tableId));
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;

        if (json.player.tableId > 0)
            return cb();

        var tableId = table;
        if (!is.positiveInt(table) || table < 1) {
            var keys = _.keys(json.tables);
            var target = keys[Math.floor((generator.random()*keys.length))];
            tableId = json.tables[target].id;
            assert.ok(is.positiveInt(tableId));
        }

        self.joinTable(tableId, true, function(err, json) {
            if (err) {
                logger.error('%s', err.message);
                return cb(err);
            }
            assert.ok(is.positiveInt(json.table.id));
            assert.ok(is.positiveInt(json.player.tableId));
            self.tableId = json.player.tableId;
            logger.debug('%s joined table %d', self.name, self.tableId);
            cb();
        });
    });
};

/**
 * Causes the player to take the next appropriate action give its game state
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.act = function(cb) {
    var self = this;
    async.series([
            // Bind is to enable calling of methods on this object.
            self.setupForAction.bind(self),
            self.doBehavior.bind(self)
        ],
        function(err) {
            if (err)
                logger.error('act: %s', err.message);
            cb(err);
        }
    );
};

/**
 * Before the player acts, we get the game state, so we know what to do.
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.setupForAction = function(cb) {
    var self = this;
    async.series([
        function(cb) {                        // get the current game state
            self.debugGameState(true, function(err) {
                if (err)
                    logger.error('Player.getGameState: %s', err.message);
                cb(err);
            });
        },
        function(cb) {                        // ensure the player has credits
            self.debugCredits(1000, true, function(err) {
                if (err)
                    logger.error('Player.debugCredits: %s', err.message);
                cb(err);
            });
        }
    ],
    function(err) {
        cb(err);
    });
};

////////////////////////////////////////////////////////////////////////////////
// Behavior-related code

/**
 * Here we dispatch, based on self.behaviorId to the correct implementation.
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.doBehavior = function(cb) {
    var self = this;
    // ensure we have a behavior for this id
    assert.ok(is.func(self.Behavior[self.behaviorId]));
    // create a function bound to this object instance
    var behavior = self.Behavior[self.behaviorId].bind(self);
    behavior(cb);
};

/**
 * Create an object on the player prototype to hold the behaviors for easy
 * dispatch. Normally, I avoid "clever" hacks like this because they can be
 * hard for others to maintain, but it saves a lot of time to be able to have
 * each key in the object map to self.behaviorId. 
 *
 * Before we call any of the functions in this object, we have to bind this,
 * to a Player object reference. Small price to pay, though.
 */
Player.prototype.Behavior = {};

/**
 * This behavior has the following attributes:
 * 1. Bets a random amount from 1 - self.player.credits
 * 2. Stands on every hand.
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.Behavior[1] = function(cb) {
    var self = this;
    assert.ok(is.func(cb));
    assert.ok(is.nonEmptyObj(self.player));
    assert.ok(is.positiveInt(self.player.tableId));
    assert.ok(is.nonEmptyStr(self.table.state));

    logger.info('%s doing play behavior %d',self.name, self.behavior);

    if (self.table.state === 'betting') {
        var betAmt = Math.floor(Math.random() * (self.player.credits-1))+1;
        logger.warn('%s bets %d', self.name, betAmt);
        self.bet(betAmt, true, function(err) {
            cb(err);
        });
        return;
    } else {
        // always stand
        logger.debug('%s stands', self.name);
        self.stand(true, function(err) {
            if (err) {
                logger.error('%s', err.message);
                return cb(err);
            }
            cb(err);
        });
    }
};

/**
 * This behavior has the following attributes:
 * 1. Bets a random amount from 1 - self.player.credits
 * 2. Hits 1x on every hand.
 * @param {Function} cb Callback of form fn(err) where err is an Error object.
 */
Player.prototype.Behavior[2] = function(cb) {
    var self = this;
    assert.ok(is.func(cb));
    assert.ok(is.nonEmptyObj(self.player));
    assert.ok(is.positiveInt(self.player.tableId));
    assert.ok(is.nonEmptyStr(self.table.state));
    assert.ok(is.array(self.player.hand));

    logger.info('%s doing play behavior %d',self.name, self.behavior);

    if (self.table.state === 'betting') {
        var betAmt = Math.floor(Math.random() * (self.player.credits-1))+1;
        logger.warn('%s bets %d', self.name, betAmt);
        self.bet(betAmt, true, function(err) {
            cb(err);
        });
        return;
    } else {
        if (self.player.hand.length === 2) {
            // hit 1x
            logger.debug('%s hits', self.name);
            self.hit(true, function(err) {
                if (err) {
                    logger.error('%s', err.message);
                    return cb(err);
                }
                cb(err);
            });
        } else {
            // always stand
            logger.debug('%s stands', self.name);
            self.stand(true, function(err) {
                if (err) {
                    logger.error('%s', err.message);
                    return cb(err);
                }
                cb(err);
            });
        }
    }
};

////////////////////////////////////////////////////////////////////////////////
// REST API methods

/**
 *
 */
Player.prototype.login = function(success, cb) {
    var self = this;
    logger.debug('%s is logging in!',self.name);
    var body = {playerName: self.name};
    logger.debug('restApi.login');
    restApi.login(body, function(err, json) {
        logger.debug('restApi.login - cb');
        if (err) {
            logger.error('login: %s',err.message);
            logger.error('login: stack %s',err.stack);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'login');
        assert.ok(is.positiveInt(json.playerId));
        assert.ok(is.nonEmptyObj(json.tables));
        self.playerId = json.playerId;
        self.loggedIn = true;
        self.tables = json.tables;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.viewTables = function(success, cb) {
    var self = this;
    logger.debug('%s is viewing the tables!',self.name);
    restApi.viewTables(function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'viewTables');
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.joinTable = function(tableId, success, cb) {
    var self = this;
    logger.debug('%s is joining table %d!',self.name, tableId);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(tableId));
    logger.debug('self: %j',self);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId, tableId: tableId};
    restApi.joinTable(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'joinTable');
        assert.ok(is.nonEmptyObj(json.table));
        assert.ok(is.nonEmptyObj(json.player));
        assert.ok(is.positiveInt(json.table.id));
        self.tableId = json.table.id;
        self.table = json.table;
        self.player = json.player;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.leaveTable = function(success, cb) {
    var self = this;
    logger.debug('%s is leaving table %d!',self.name, self.tableId);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.leaveTable(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'leaveTable');
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.bet = function(bet, success, cb) {
    var self = this;
    logger.debug('%s is betting %d!',self.name, bet);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    assert.ok(is.positiveInt(bet));
    var body = {playerId: self.playerId, bet: bet};
    restApi.bet(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'bet');
        assert.ok(bet === json.player.bet);
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.hit = function(success, cb) {
    var self = this;
    logger.debug('%s is going to hit!',self.name);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.hit(body, function(err, json) {
        if (err)
            return cb(err);
        //var inspect = require('util').inspect;
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'hit');
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.stand = function(success, cb) {
    var self = this;
    logger.debug('%s is going to stand!',self.name);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.stand(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'stand');
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.debugCredits = function(credits, success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    assert.ok(is.positiveInt(credits));
    var body = {playerId: self.playerId, credits: credits};
    restApi.debugCredits(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'debug/credits');
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.debugGetPlayer = function(success, cb) {
    var self = this;
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.debugGetPlayer(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'debug/getPlayer');
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        cb(null, json);
    });
};

/**
 *
 */
Player.prototype.debugGameState = function(success, cb) {
    var self = this;
    logger.debug('%s is getting debug game state!',self.name);
    assert.ok(self.loggedIn);
    assert.ok(is.positiveInt(self.playerId));
    var body = {playerId: self.playerId};
    restApi.debugGameState(body, function(err, json) {
        if (err)
            return cb(err);
        assert.ok(is.nonEmptyObj(json));
        if (is.bool(success))
            assert.ok(json.success === success);
        assert.ok(json.cmd === 'debug/gameState');
        assert.ok(is.nonEmptyObj(json.table));
        self.table = json.table;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        cb(null, json);
    });
};
