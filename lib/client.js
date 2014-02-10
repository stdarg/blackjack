/**
 * This file drives the client.
 */
'use strict';

var assert = require('assert');
var is = require('is2');
var prompt = require('prompt');
var clientCall = require('./clientRestCalls');
var _ = require('lodash');
var async = require('async');
require('colors');

var playerId = false;
var tableId = false;
var tableState = false;
prompt.message = '';
prompt.delimiter = '';

/**
 * handles and valid command by making the HTTP rest call to the server
 * @param {String[]} cmd The command array. 0 is the command, and 1 is the
 *      operand
 * @param {Function} cb Callback of form fn(err, json) where json is the
 *      response body from the server.
 */
function handleCommand(cmd, cb) {
    assert.ok(is.nonEmptyArray(cmd));
    assert.ok(is.func(cb));
    assert.ok(is.nonEmptyStr(cmd[0]));
    logger.info('Processing command: %s', cmd[0]);

    switch (cmd[0]) {
        case 'viewTables':
            viewTables(cb);
            break;
        case 'joinTable':
            joinTable(cmd[1], cb);
            break;
        case 'leaveTable':
            leaveTable(cb);
            break;
        case 'bet':
            bet(cmd[1], cb);
            break;
        case 'hit':
            hit(cb);
            break;
        case 'stand':
            stand(cb);
            break;
        case 'quit':
            quit(cb);
            break;
        default:
            logger.error('Unknown command: %s', cmd[0]);
            break;
    }
}

/**
 * All the prompts have a callback with the same logic, so it was placed here.
 * @param {Error} err An error object.
 * @param {Object} result The result object from the prompt module.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function handlePromptCb(err, result, cb) {
    // Log the results.
    if (err) {
        logger.error('%s', err.message);
        logger.error('stack: ', err.stack);
        return cb(err);
    }
    var cmdAry = result.cmd.split(' ');
    assert.ok(is.nonEmptyArray(cmdAry));
    if (cmdAry.length === 2)
        cmdAry[1] = Math.floor(cmdAry[1]);
    handleCommand(cmdAry, cb);
}

/**
 * Handle prompt when the table is in a betting state.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function bettingPrompt(cb) {
    console.log('You may "bet #", "quit" or "leaveTable".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^bet [0-9]+$|^quit$|^leaveTable$/,
                message: 'Either "bet #", "leaveTable" or "quit".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}
/**
 * Handle the prompt for when the hands are in play.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function playingPrompt(cb) {
    console.log('You may "hit", "stand" "quit" or "leaveTable".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^hit$|^stand$|^quit$|^leaveTable$/,
                message: 'Either "hit", "stand", "quit" or "leaveTable".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}

/**
 * We're at a table, but we need to know the state, betting or playing to send
 * it the right prompt.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function tablePrompt(cb) {
    console.log('You are seated at table #%d.', tableId);
    switch (tableState) {
        case 'betting':
            bettingPrompt(cb);
            break;
        case 'dealing':
            playingPrompt(cb);
            break;
        default:
            assert.ok(false);
            break;
    }
}
/**
 * Give the prompt for when players are in the lobby.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function lobbyPrompt(cb) {
    console.log('You are in the lobby. You may "joinTable #" or "quit".');
    var schema = {
        properties: {
            cmd: {
                description: 'Enter your command'.bold.white+':',
                type: 'string',
                pattern: /^joinTable [0-9]+$|^quit$/,
                message: 'Either "joinTable #" or "quit".'.red,
                required: true,
            }
        }
    };

    prompt.start();     // Start the prompt

    // Get two properties from the user: email, password
    prompt.get(schema, function (err, result) {
        handlePromptCb(err, result, cb);
    });
}

/**
 * Look at the player's location (table or lobby) to figure out what prompt
 * they should get.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response object from the server.
 */
function gamePrompt(cb) {
    assert.ok(is.positiveInt(playerId));
    assert.ok(is.int(tableId));
    logger.warn('tableId %j', tableId);
    if (tableId === -1) {
        lobbyPrompt(cb);
    } else {
        tablePrompt(cb);
    }
}

/**
 * Loop to keep prompting the user.
 */
function gameLoop() {
    async.whilst(
        function() {            // sync continue test
            return true;
        },
        gamePrompt,             // action to do while true
        function(err) {         // handle errors, also executes when done
            if (err) {
                logger.error('%s',err.message);
                logger.error('stack: ',err.stack);
            }
        }
    );
}
/**
 * get the user name so we can login.
 * @param {Function} cb The callback of for fn(err, obj) where obj is the
 *      prompt result with the name.
 */
function getUserName(cb) {
    var schema = {
        properties: {
            name: {
                description: 'Enter your name'.bold.white+':',
                type: 'string',
                pattern: /^[a-zA-Z\s\-]+$/,
                message: 'Name must be only letters, spaces, or dashes.'.red,
                required: true,
                default: process.env.USER
            }
        }
    };

    prompt.start();     // Start the prompt

    prompt.get(schema, function (err, result) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        cb(null, result.name);
    });
}

/**
 * get the user name, then format the request body and then login to the server.
 * @param {Function} cb The callback of for fn(err, json) where json is the 
 *      json response from the server.
 */
function loginSequence(cb) {
    async.waterfall([
        getUserName,
        function(name, cb) {
            return cb(null, { playerName: name });
        },
        clientCall.login
    ],
    function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        cb(null, json);
    });
}

/**
 * Display the tables to standard out.
 * @param {Object} tables An object where the keys are the table ids.
 */
function displayTables(tables) {
    assert.ok(is.nonEmptyObj(tables));
    printf('%12s %15s\n', 'table #', 'num players');
    printf('%12s %15s\n', '=======', '===========');
    _.forEach(tables, function(table) {
        printf('%9d %13d\n', table.id, table.numPlayers);
    });
}

/**
 * Display a hand of cards.
 * @param {String} txt The lead-in text describing what we are showing.
 * @param {Object[]} hand An array of card objects.
 */
function displayHand(txt, hand) {
    assert.ok(is.str(txt));
    assert.ok(is.nonEmptyArray(hand));
    console.log(txt);
    _.forEach(hand, function(card) {
        if (is.str(card)) {
            printf('    %s\n', card);
        } else if (is.nonEmptyObj(card)) {
            printf('    %s of %s\n', card.rank, card.suit);
        }
    });
}

/**
 * Display the dealer's and the player's hand of cards to standard out.
 * @param {Object} table The table object
 * @param {Object} player The player object
 */
function displayHands(table, player) {
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    displayHand('Dealers hand:', dealerHand);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand);
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand);
        if (player.result.players[playerId].push) {
            console.log('Push. You have %s credits.', player.credits);
        } else {
            console.log('You %s %s and currently have %s credits.',
                    (player.result.players[playerId].win ? 'won' : 'lost'),
                    player.result.players[playerId].bet,
                    player.credits);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// commands

/**
 * Return an object of all the tables from the server.
 * @param {Function} cb The callback of for fn(err, json) where json is the 
 *      json response from the server.
 */
function viewTables(cb) {
    assert.ok(is.func(cb));
    clientCall.viewTables(function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json));
        assert.ok(is.nonEmptyObj(json.tables));
        displayTables(json.tables);
        cb();
    });
}

/**
 * Join a table to play a game.
 * @param {Number} tabl The id of the tabl to join.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function joinTable(table, cb) {
    assert.ok(is.positiveInt(table));
    assert.ok(is.func(cb));
    var body = { playerId: playerId, tableId: table };
    clientCall.joinTable(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(json.player.tableId === table);
        tableId = json.player.tableId;
        tableState = json.table.state;
        cb();
    });
}

/**
 * Leaves a table and puts the player in the lobby.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function leaveTable(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.leaveTable(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(is.nonEmptyObj(json));
        assert.ok(is.nonEmptyObj(json.tables));
        displayTables(json.tables);
        tableId = -1;
        cb();
    });
}

/**
 * Set a bet amount for the hand.
 * @param {Number} amt The amount of credits to bet.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function bet(amt, cb) {
    assert.ok(is.positiveInt(amt));
    assert.ok(is.func(cb));
    var body = { playerId: playerId, bet: amt };
    clientCall.bet(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        assert.ok(json.player.bet === amt);
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}

/**
 * Request a nother card from the dealer.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function hit(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.hit(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}
/**
 * Players wants no more cards and risks the bet on the current hand.
 * @param {Function} cb The callback of for fn(err, json) where json is the
 *      json response from the server.
 */
function stand(cb) {
    assert.ok(is.func(cb));
    var body = { playerId: playerId };
    clientCall.stand(body, function(err, json) {
        if (err) {
            logger.error('%s', err.message);
            logger.error('stack: ', err.stack);
            return cb(err);
        }
        tableId = json.player.tableId;
        tableState = json.table.state;
        assert.ok(is.obj(json.player));
        assert.ok(is.array(json.player.hand));
        displayHands(json.table, json.player);
        cb();
    });
}

/**
 * quits the game
 * FIXME needs a rest call to take the player out of the table.
 */
function quit() {
    console.log('\nGoodbye!');
    process.exit(0);
}

////////////////////////////////////////////////////////////////////////////////
// this is where it starts

loginSequence(function(err, json) {
    if (err) {
        logger.error('%s', err.message);
        logger.error('stack: ', err.stack);
        return;
    }
    logger.info('logged in: %j', json);
    playerId = json.playerId;
    tableId = json.player.tableId;
    displayTables(json.tables);
    gameLoop();
});
