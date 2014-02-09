/**
 * An object to do player actions to test the server.
 */
'use strict';

module.exports = Player;

var async = require('async');
var randomName = require('names');
var is = require('is2');
var restApi = require('./restApi');
var assert = require('assert');
var _ = require('lodash');
var MersenneTwister = require('mersenne-twister');
// MersenneTwister uses Date().getTime() as a default seed
var generator = new MersenneTwister();

var PREPLAY = 0;
var PLAY = 1;
var POSTPLAY = 2;

/**
 *
 */
function Player(pre, play, post) {
    var self = this;
    self.name = randomName();
    self.next = 0;
    self.pre = pre;
    self.play = play;
    self.post = post;
    self.loggedIn = false;
    self.tableId = -1;
}

/**
 *
 */
Player.prototype.act = function(cb) {
    var self = this;
    async.series([
            self.actPart1.bind(self),
            self.actPart2.bind(self)
        ],
        function(err) {
            if (err)
                logger.error('act: %s', err.message);
            cb(err);
        }
    );
};

Player.prototype.actPart1 = function(cb) {
    var self = this;
    async.series([
        function(cb) {
            if (self.loggedIn)
                return cb();
            self.loginJoinTable(function(err) {
                return cb(err);
            });
        },
        function(cb) {
            self.debugGameState(true, function(err) {
                if (err)
                    logger.error('actPart1: %s', err.message);
                cb(err);
            });
        }
    ],
    function(err) {
        cb(err);
    });
};

Player.prototype.actPart2 = function(cb) {
    var self = this;
    switch(self.next) {
        case PREPLAY:
            self.next = PLAY;
            self.prePlayBehavior(cb);
            break;
        case PLAY:
            self.playBehavior(cb);
            //logger.info('act self: %j', self);
            if (self.player && self.player.done)
                self.next = POSTPLAY;
            break;
        case POSTPLAY:
            self.next = PREPLAY;
            self.postPlayBehavior(cb);
            break;
        default:
            assert.ok(false);
            break;
    }
};

/**
 *
 */
Player.prototype.prePlayBehavior = function(cb) {
    var self = this;
    if (self.pre < 0) {
        if (self.loggedIn) {
            return cb();
        }
        self.loginJoinTable(function(err) {
            return cb(err);
        });
        return;
    }
    logger.info('%s doing pre-play behavior',self.name);
    // randomly select behavior if num is udef
    switch (self.pre) {
        case 1:
            self.login(true, function(err, json) {
                if (err) {
                    logger.error('login: %s json: %j',err.message, json);
                    return;
                }
            });
            break;
    }
    cb();
};

/**
 *
 */
Player.prototype.playBehavior = function(cb) {
    var self = this;
    if (self.play < 0)
        return cb();

    logger.info('%s doing play behavior',self.name);

    if (!self.player || !self.player.tableId ||  self.player.tableId === -1) {
        logger.error('Attempt to play when not at a table.');
        self.next = POSTPLAY;
        return cb();
    }

    logger.error('self.table.state: %s', self.table.state);
    if (self.table.state === 'betting') {
        logger.warn('BETTING');
        self.bet(1, true, function(err) {
            cb(err);
        });
        return;
    } else {
        logger.warn('NOT betting');
    }

    // randomly select behavior if num is udef
    switch (self.play) {
    case 1:
        logger.debug('hit me!');
        self.hit(true, function(err, json) {
            if (err) {
                logger.error('%s', err.message);
                return cb(err);
            }
            logger.error('hit %j', json);
            cb(null, json);
        });
        break;
    case 2:
        logger.debug('stand!');
        self.stand(true, function(err, json) {
            if (err) {
                logger.error('%s', err.message);
                return cb(err);
            }
            logger.error('stand %j', json);
            cb(null, json);
        });
        break;
    default:
        assert.ok(false);
        break;
    }
};

/**
 *
 */
Player.prototype.postPlayBehavior = function(cb) {
    var self = this;
    if (self.play < 0)
        return cb();
    logger.info('%s doing post-play behavior',self.name);
    // randomly select behavior if num is udef
    cb();
};

////

Player.prototype.loginJoinTable = function(cb) {
    var self = this;
    var body = {playerName: self.name};
    logger.debug('loginJoinTable');
    self.login(body, function(err, json) {
        logger.debug('loginJoinTable - cb json: %j', json);
        if (err) {
            logger.error('login: %s json: %j',err.message, json);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json.player));
        assert.ok(is.int(json.player.tableId));
        assert.ok(is.nonEmptyObj(json.tables));

        if (json.player.tableId > 0)
            return cb(null, json);

        var keys = _.keys(json.tables);
        logger.debug('keys %j', keys);
        var target = keys[Math.floor((generator.random()*keys.length))];
        logger.debug('tables: %j', json.tables);
        logger.debug('target: %j', target);
        logger.debug('json.tables[target]: %j', json.tables[target]);
        var tableId = json.tables[target].id;
        assert.ok(is.positiveInt(tableId));
        self.joinTable(tableId, true, function(err, json) {
            if (err) {
                logger.error('%s', err.message);
                return cb(err);
            }
            assert.ok(is.positiveInt(json.table.id));
            cb(null,json);
        });
    });
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
        logger.debug('====login self: %j', self);
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
        logger.warn('joinTable self: %j',self);
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
        var inspect = require('util').inspect;
        logger.error('>>> hit:\n%s',inspect(json, {depth:null}));
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
        assert.ok(is.nonEmptyObj(json.hand));
        self.hand = json.hand;
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
        cb(null, json);
    });
};

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
        if (json.table)
            self.table = json.table;
        assert.ok(is.nonEmptyObj(json.player));
        self.player = json.player;
        assert.ok(is.nonEmptyObj(json.tables));
        self.tables = json.tables;
        logger.warn('debug/GameState self: %j',self);
        cb(null, json);
    });
};
