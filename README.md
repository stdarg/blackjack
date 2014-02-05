Requirements
============

* Server must have an REST API for playing Blackjack
* Must support: way to receive 2 starting cards & dealer&#39;s initial card
* Must support player actions:
    * login
    * quit
    * view the tables
    * join a table
    * leave a table
    * bet
    * hit
    * stand
    * double down
    * surrender
    * split
* After player&#39;s final action in hand, should learn the outcome
* Use typical dealer strategy of standing on 17 or greater
* Will support multiple players
* Will support multiple blackjack games
* Will use an 8-deck shoe with a cut-point 75% into the shoe
* If a player is not at a table, they are in the "lobby"
    * From the lobby, players can join tables and view tables

Stretch goals

* Character-based Node.js client
* Discovery between client and server using UDP broadcast
* Test framework with multiple concurrent clients that do set actions and random
  actions
* Chat functionality for players
* Player persistance for score (winnings)

# REST API

All responses have:

* a JSON body
* a "cmd" property with the name of the command
* a "success" boolean property that is either "true" or "false"
* if "success" if false, there is an "error" property with a string message

If the request is a POST, then the request body is JSON.

The REST API commands follow.

## login
Allows players to login to the game, where they can view tables and join a
game.

**Request Format**

* Method: `POST`
* URI path: `/login`

**JSON Request Body**

    { "playername": "Edmond" }

* **name** - the name you want to play as.

**JSON Response**

    { "playerid": 3 }

* **id** - player id, a positive integer, to be re-used for all subsequent
  requests

## viewTables
Allows players to see the tables and who is at each table.

**Request Format**

* Method: `GET`
* URI path: `/viewTables`

**JSON Response**

    {
        "success": true,
        "cmd": "viewTables",
        "tables": {
            "1": {
                "players": { "Edmond", "Robert" },
                "state": "betting"
            },
            "2": {
                "players": { "James" },
                "state": "dealing"
            }
        }
    }

* **tables** - an arary of all the tables where the key is the table id and the
    data describes the table
    * **players** - array of the players at the table
    * **state** - game state for the table

## joinTable
Allows players to join a table and play the next hand dealt. Because a hand may
be progress at the time, clients have to check back on an interval to get their
hand. This means a keep-alive connection should be used, however at scale, this
would not be ideal, as you&#39;d want to keep the connections to a minimum to
scale.

**Request Format**

* Method: `POST`
* URI path: `/joinTable`

**JSON Request Body**

    { "playerid": 3 }

* **id** - the player id received on login

**JSON Response**

    { "success": true, "cmd": "joinTab;e", "interval": 1000, "balance": 400 }

* **interval** - time to check for next hand of dealt cards in milliseconds
* **balance** - player&#39;s winnings (or losses)

## leaveTable
Allows the player to leave the table. If a hand is in play, the player will lose
the bet to the house. The player returns to the lobby.

**Request Format**

* Method: `POST`
* URI path: `/leaveTable`

**JSON Request Body**

    { "playerid": 3 }

* **id** - the player id received on login

**JSON Response**

    { "sucess": true, "cmd": "leaveTable", "interval": 1000, "balance": 400 }

* **interval** - time to check for next hand of dealt cards in milliseconds
* **balance** - player&#39;s winnings (or losses)

## quitGame
Allows players to drop out of the game.

**Request Format**

* Method: `POST`
* URI path: `/quitGame`

**JSON Request Body**

    { "playerId": 3 }

* **id** - player id, a positive integer, to be re-used for all subsequent
  requests

**JSON Response**

    { "success": true, "cmd": "quitGame", "balance": 4556 }

* **balance** - the player&#39;s winnings or losses when they left

## bet
Indicates players are in on the next hand and the amount they are betting.

**Request Format**

* Method: `POST`
* URI path: `/bet`

**JSON Request Body**

    { "playerId": 3, "bet": 10 }

* **id** - player id received when joining the game
* **bet** - amount of currency to bet on the next hand

**JSON Response**

    {
        "success": true,
        "cmd": "bet",
        "balance": 390,
        "hand": [ 4, 7 ],
        "total": 12,
        "h1Over21": false,
        "done": false
    }

* **balance** - player&#39;s currency balance minus the bet they just placed
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, from a split, there will also be a h2Over21
* **done** - True if the player&#39;s interest in the hand is concluded

## hit
Informs the dealer to add another card to the player&#39;s hand. If the player
exceeds 21, the player loses the hand.

**Request Format**

* Method: `POST`
* URI path: `/hit`

**JSON Request Body**

    { "playerId": 3, hand: 3 }

* **id** - player id given when the player joins the game
* **hand** - hand, upon which, to hit:
    * 1 - for default, if not specified, 1 is assumed
    * 2 - stand on the second hand only
    * 3 - stand on both hands

**JSON Reponse**

    {
        "success": true,
        "cmd": "hit",
        "balance": 390,
        "card": 47,
        "hand": [ 4, 16, 2, 47 ]
        "total": 18,
        "h1Over21": false,
        "done": false
    }

* **balance** - player&#39;s currency balance minus the bet they just placed.
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

## stand
Informs the dealer, you want to stand on your hand, no more cards are to be
dealt. Once all players are concluded, the dealer will handle their hand and the
results are known.

**Request Format**

* Method: `POST`
* URI path: `/stand`

**JSON Request Body**

    { "playerId": 3, "hand": 1 }

* **id** - The player id given when the player joins the game
* **hand** - The hand upon which, to stand:
    * 1 - for default, if not specified, 1 is assumed
    * 2 - stand on the second hand only
    * 3 - stand on both hands

**JSON Reponse:**

    {
        "success": true,
        "cmd": "stand",
        "balance": 390,
        "hand": [ 4, 16, 2 ]
        "total": 18,
        "h1Over21": false
        "done": true
    }

* **balance** - the player&#39;s currency balance minus the bet they just
  placed
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - total value of the hand. If there is an ace present the value
  t will be an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

## doubledown
The player may increase the initial bet by up to 100% in exchange for
committing to stand after receiving exactly one more card. The additional bet
is placed in the betting box next to the original bet. Some games do not permit
the player to increase the bet by amounts other than 100%. Non-controlling
players may double their wager or decline to do so, but they are bound by the
controlling player&#39;s decision to take only one card.

Signal: Place additional chips beside the original bet outside the betting box,
and point with one finger.

**Request Format**

* Method: `POST`
* URI path: `/doubledown`

**JSON Request Body**

    { "playerId": 3 }

**JSON Reponse**

    {
        "success": true,
        "cmd": "doubledown",
        "balance": 390,
        "bet": 10,
        "card": 2
        "hand": [ 4, 16, 2 ]
        "total": 18,
        "h1Over21": false
        "done": true
    }

* **balance** - player&#39;s currency balance minus the bet they just
  placed
* **bet** - player&#39s current bet
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - The total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

## surrender
Only available as first decision of a hand: Some games offer the option to
&#34;surrender&#34;, usually in hole-card games and directly after the dealer
has checked for blackjack When the player surrenders, the house takes half the
player&#39;s bet and returns the other half to the player; this terminates the
player&#39;s interest in the hand. The request to surrender is made verbally,
there being no standard hand signal.

**Request Format**

* Method: `POST`
* URI path: `/surrender`

**JSON Request Body**

    { "playerId": 3 }

**JSON Reponse**

    {
        "success": true,
        "cmd": "surrender"
        "balance": 390,
        "bet": 10,
        "hand": [ 4, 2 ]
        "totaa"l: 6,
        "h1Over21": false
        "done": true
    }

* **balance** - the player&#39;s currency balance minus the bet they just
  placed
* **bet** - the player&#39s current bet
* **hand** - The cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - The total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

## split
Only available as the first decision of a hand: If the first two cards have the
same value, the player can split them into two hands, by moving a second bet
equal to the first into an area outside the betting box. The dealer separates
the two cards and draws an additional card on each, placing one bet with each
hand. The player then plays out the two separate hands in turn, with some
restrictions. Occasionally, in the case of ten-valued cards, some casinos allow
splitting only when the cards have the identical ranks; for instance, a hand of
10-10 may be split, but not one of 10-king. However, usually all 10-value cards
are treated the same. Doubling and further splitting of post-split hands may be
restricted, and blackjacks after a split are counted as non-blackjack 21 when
comparing against the dealer&#39;s hand. Hitting split aces is usually not
allowed. Non-controlling players may follow the controlling player by putting
down an additional bet or decline to do so, instead associating their existing
wager with one of the two post-split hands. In that case they must choose which
hand to play behind before the second cards are drawn. Some casinos do not give
non-controlling players this option, and require that the wager of a player not
electing to split remains with the first of the two post-split hands.

Signal: Place additional chips next to the original bet outside the betting
box; point with two fingers spread into a V formation.


**Request Format**

* Method: `POST`
* URI path: `/split`

**Request Body**

    { "playerId": 3 }

**JSON Reponse**

    {
        "success": true,
        "cmd": "split",
        "balance": 390,
        "bet": [ 10, 10 ],
        "hand": [ 9 ]
        "hand2": [ 9 ]
        "total": [ 9, 9]
        "h1Over21": false
        "h2Over21": false
        "done": false
    }

* **balance** - player&#39;s currency balance minus the bet they just placed
* **bet** - player&#39s current bet which is now an array, 1 bet for each hand
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

