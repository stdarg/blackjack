/**
 * @fileOverview
 * Tests for the code in ./lib/cards.js
 */
'use strict';
var assert = require('assert');
var is = require('is2');
var cards = require('../lib/cards');

describe('shoe', function() {
    it('should construct a randomized deck of 52 cards', function(done) {
        var DealerShoe = new cards.Shoe(1);
        var inOrderCnt = 0;

        assert.ok(is.array(DealerShoe.cards));
        assert.ok(DealerShoe.cards.length === 52);

        // ensure the cards are randomized to some degree
        // we assume less than 10% of the cards retain their original spot
        var idx = 0;
        for (var i=0; i<DealerShoe.cards.length; i++) {
            assert.ok(is.int(DealerShoe.cards[i]));
            idx = i % 52;
            if (DealerShoe.cards[i] === idx)
                inOrderCnt++;
        }

        var percentInOrder = Math.floor((inOrderCnt/DealerShoe.cards.length) *
                                        100);

        if (percentInOrder > 5) {
            return done(new Error(percentInOrder+'% of cards are in-order.'));
        }

        //console.log('\nPercent in-order:',percentInOrder);
        done();
    });

    it('should construct 8 randomized decks of 52 cards each', function(done) {
        var DealerShoe = new cards.Shoe(8);
        var inOrderCnt = 0;

        assert.ok(is.array(DealerShoe.cards));
        assert.ok(DealerShoe.cards.length === 8*52);

        // ensure the cards are randomized to some degree
        // we assume less than 10% of the cards retain their original spot
        for (var i=0; i<DealerShoe.cards.length; i++) {
            assert.ok(is.int(DealerShoe.cards[i]));
            var ocIdx = i%52;
            if (DealerShoe.cards[i] === ocIdx) {
                inOrderCnt++;
            }
        }

        var percentInOrder = Math.floor((inOrderCnt/DealerShoe.cards.length) *
                                        100);

        if (percentInOrder > 5) {
            return done(new Error(percentInOrder+'% of cards are in-order.'));
        }

        //console.log('\nPercent in-order:',percentInOrder);
        done();
    });

    it('should deal 1 or more cards, removing them from the top',
       function(done) {
        var DealerShoe = new cards.Shoe(1);

        assert.ok(is.array(DealerShoe.cards));
        assert.ok(DealerShoe.cards.length === 52);

        var first = DealerShoe.cards[0];
        var dealtCard = DealerShoe.deal();
        assert.ok(DealerShoe.cards.length === 51);
        assert.deepEqual(first, dealtCard);

        var fcards = [];
        fcards[0] = DealerShoe.cards[0];
        fcards[1] = DealerShoe.cards[1];

        var dealtCards = DealerShoe.deal(2);
        assert.ok(DealerShoe.cards.length === 49);
        assert.deepEqual(fcards, dealtCards);

        done();
    });

});
