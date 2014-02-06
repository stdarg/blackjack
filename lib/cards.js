/**
 * @fileOverview
 * Holds the constructor for the Shoe object and contains the ordered deck of
 * cards.
 */
'use strict';

// an ordered deck of all cards use to create shuffled decks to be dealt from.
var orderedDeck = [
    { suit: 'clubs', rank: 'Ace', value: [ 1, 10 ] },
    { suit: 'clubs', rank: '2', value: 2 },
    { suit: 'clubs', rank: '3', value: 3 },
    { suit: 'clubs', rank: '4', value: 4 },
    { suit: 'clubs', rank: '5', value: 5 },
    { suit: 'clubs', rank: '6', value: 6 },
    { suit: 'clubs', rank: '7', value: 7 },
    { suit: 'clubs', rank: '8', value: 8 },
    { suit: 'clubs', rank: '9', value: 9 },
    { suit: 'clubs', rank: '10', value: 10 },
    { suit: 'clubs', rank: 'Jack', value: 10 },
    { suit: 'clubs', rank: 'Queen', value: 10 },
    { suit: 'clubs', rank: 'King', value: 10 },

    { suit: 'diamonds', rank: 'Ace', value: [ 1, 10 ] },
    { suit: 'diamonds', rank: '2', value: 2 },
    { suit: 'diamonds', rank: '3', value: 3 },
    { suit: 'diamonds', rank: '4', value: 4 },
    { suit: 'diamonds', rank: '5', value: 5 },
    { suit: 'diamonds', rank: '6', value: 6 },
    { suit: 'diamonds', rank: '7', value: 7 },
    { suit: 'diamonds', rank: '8', value: 8 },
    { suit: 'diamonds', rank: '9', value: 9 },
    { suit: 'diamonds', rank: '10', value: 10 },
    { suit: 'diamonds', rank: 'Jack', value: 10 },
    { suit: 'diamonds', rank: 'Queen', value: 10 },
    { suit: 'diamonds', rank: 'King', value: 10 },

    { suit: 'hearts', rank: 'Ace', value: [ 1, 10 ] },
    { suit: 'hearts', rank: '2', value: 2 },
    { suit: 'hearts', rank: '3', value: 3 },
    { suit: 'hearts', rank: '4', value: 4 },
    { suit: 'hearts', rank: '5', value: 5 },
    { suit: 'hearts', rank: '6', value: 6 },
    { suit: 'hearts', rank: '7', value: 7 },
    { suit: 'hearts', rank: '8', value: 8 },
    { suit: 'hearts', rank: '9', value: 9 },
    { suit: 'hearts', rank: '10', value: 10 },
    { suit: 'hearts', rank: 'Jack', value: 10 },
    { suit: 'hearts', rank: 'Queen', value: 10 },
    { suit: 'hearts', rank: 'King', value: 10 },

    { suit: 'spades', rank: 'Ace', value: [ 1, 10 ] },
    { suit: 'spades', rank: '2', value: 2 },
    { suit: 'spades', rank: '3', value: 3 },
    { suit: 'spades', rank: '4', value: 4 },
    { suit: 'spades', rank: '5', value: 5 },
    { suit: 'spades', rank: '6', value: 6 },
    { suit: 'spades', rank: '7', value: 7 },
    { suit: 'spades', rank: '8', value: 8 },
    { suit: 'spades', rank: '9', value: 9 },
    { suit: 'spades', rank: '10', value: 10 },
    { suit: 'spades', rank: 'Jack', value: 10 },
    { suit: 'spades', rank: 'Queen', value: 10 },
    { suit: 'spades', rank: 'King', value: 10 }
];

// we need to define the orderedDeck before we export it, functions get forward
// references, but not data in the global scope.
module.exports = {
    Shoe: Shoe,
    orderedDeck: orderedDeck
};

var is = require('is2');
var _ = require('lodash');
var assert = require('assert');
var MersenneTwister = require('mersenne-twister');
var have = require('have');

// MersenneTwister uses Date().getTime() as a default seed
var generator = new MersenneTwister();

// ensure the ordered deck is as expected
assert.ok(is.array(orderedDeck));
assert.ok(orderedDeck.length === 52);

/**
 * Constructor for Shoe, which holds numDecks of shuffled cards for dealing
 * to players and the dealer.
 * @constructor
 * @param {Number} numDecks The number of shuffled decks to place into the shoe.
 */
function Shoe(numDecks) {
    var self = this;
    have(arguments, { numDecks: 'num' });
    self.cards = [];     // holds all the cards
    self.maxSize = 0;
    for (var i=0; i<numDecks; i++) {
        self.addShuffledDeck();
    }
}

/**
 * Create a new deck of cards from orderedDeck, then shuffle the new deck and
 * place the newly shuffled cards onto the shoe.
 */
Shoe.prototype.addShuffledDeck = function() {
    var self = this;
    assert.ok(is.array(self.cards));
    assert.ok(is.array(orderedDeck));

    // Create a new deck, with new card objects we want new card objects, in
    // case we decide to alter the cards later.
    var newDeck = [];
    var i;
    for (i=0; i<orderedDeck.length; i++) {
        newDeck.push(_.clone(orderedDeck[i]));
    }

    // shuffle the new deck and place on the shoe
    for (i=0; i<newDeck.length; i++) {
        var target = Math.floor(generator.random() * newDeck.length);
        swap(newDeck, i, target);
        target = Math.floor(generator.random() * newDeck.length);
        swap(newDeck, i, target);
        self.cards.push(newDeck[i]);
    }

    // increase max size of deck
    self.maxSize += orderedDeck.length;
};

/**
 * Deal a card or cards from the shoe. The card should no longer be in the shoe.
 * @param {Number} [num] Optional number of cards to deal, if not present, deals 1.
 * @return {Object} An object that has the card information.
 */
Shoe.prototype.deal = function(num) {
    var self = this;
    if (is.undefined(num))
        num = 1;
    assert.ok(is.positiveInt(num));
    assert.ok(self.cards.length > num);

    if (num === 1) {
        return self.cards.shift();
    }

    // case where num > 1
    var cards = [];
    for (var i=0; i<num; i++) {
        cards.push(self.cards.shift());
    }
    return cards;
};

/**
 * True if dealt over 75% of the cards in the deck
 * @return {Boolean} true if past cut point and false otherwise
 */
Shoe.prototype.pastCutPoint = function() {
    var self = this;
    assert.ok(is.array(self.cards));
    var percentLeft = Math.floor((self.cards.length / self.maxSize) * 100);
    if (percentLeft < 25)
        return true;
    return false;
};

/**
 * Convenience function to swap 2 cards in a deck.
 * @param {Object[]} deck The deck in which to swap two cards.
 * @param {Number} card1Idx Index of the first card to be swapped.
 * @param {Number} card2Idx Index of the second card to be swapped.
 */
function swap(deck, card1Idx, card2Idx) {
    have(arguments, {deck: 'obj array', card1Idx: 'num', card2Idx: 'num'});
    assert.ok(is.int(card1Idx) && card1Idx > -1);
    assert.ok(is.int(card2Idx) && card2Idx > -1);
    assert.ok(deck.length > card1Idx);
    assert.ok(deck.length > card2Idx);

    var tmp = deck[card1Idx];
    deck[card1Idx] = deck[card2Idx];
    deck[card2Idx] = tmp;
}


