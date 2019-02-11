Blackjack
=========

# Running with Express

* server: `node express_server.js`
* client: `node express_client.js`

# Running

First start the server:

* cd to the root of this project where the package.json is
* Run: `./bin/server.sh`

Then, start a client:

* cd to the root of this project where the package.json is
* Run: `./bin/client.sh`

# Requirements

* Server must have an REST API for playing Blackjack (done)
* Must support: way to receive 2 starting cards & dealer&#39;s initial card
  (done)
* Must support player actions:
    * login (done)
    * logout (done)
    * view the tables (done)
    * join a table (done)
    * leave a table (done)
    * bet (done)
    * hit (done)
    * stand (done)
    * double down (not implemented)
    * surrender (not implemented)
    * split (not implemented)
* After a player&#39;s final action in a hand, they should learn the outcome
  (done)
* Use a typical dealer strategy of standing on 17 or greater (done)
    * Dealer will draw on soft 17 (done)
    * Dealer will draw if under hard 17 and player has a better hand (done)
* Support multiple players (done)
    * Works, but multiple players at the same table is not tested
    * The client needs to poll to detect when hand is over (not
      implemented)
* Support multiple concurrent blackjack games (done)
    * Works, limit 1 player per table
* Use an 8-deck shoe with a cut-point 75% into the shoe (done)
    * After each hand, if the deck is past the cut point, the old shoe is
      discarded and a new shoe is created (done)
* If a player is not at a table, they are in the "lobby" (done)
    * From the lobby, players can join tables, view tables and quit (done)
* When players leave a table or quit and have a bet on a hand in-progress, they
  should lose the bet (done)

**Stretch goals**

* Character-based Node.js client (done)
* Test framework with multiple concurrent clients that do set actions and random
  actions (done)
* Discovery between client and server using UDP broadcast (not implemented)
* Chat functionality for players (not implemented)
* Player persistance for score (winnings) (not implemented)

# Comments

I was able to complete this amount of work by leveraging existing modules.
Mocha, async, prompt and request all saved an immense amount of time.

Additionally, many of the modules were written previously by myself:

* [config-js](https://www.npmjs.org/package/config-js "NPM page") - config
  module. Support for regions and auto-load when file changes
* [fuzelog](https://www.npmjs.org/package/fuzelog "NPM page") - logger fusing
  log.js with log4js's layouts and colors, supporting console and file logging
* [is2](https://www.npmjs.org/package/is2 "NPM page") - type checking library
  where each function returns either true or false
* [json-rest-api](https://www.npmjs.org/package/json-rest-api "NPM page") -
  lightweight REST API that receives and responds to JSON HTTP requests,
  supports all verbs
* [sprintf.js](https://www.npmjs.org/package/sprintf.js "NPM page") - almost
  complete implementation of the printf and sprintf
* [tcp-port-used](https://www.npmjs.org/package/tcp-port-used "NPM page") -
  check if a TCP port is already bound

# Reflections

I'm happy with how it came out. The try/catch on the end-points enabled liberal
use of "assert" and "have" worry-free since everything happens as a result of a
REST call and there is no asynchronous code outside of the networking, due to no
persistence (so domains were not needed).

There are things I would change, though:

* More unit tests.
* More behaviors for the user tests.
* The mersenne-twister module is entirely JavaScript and is too slow.
    * You can see how the creation of the 8-deck shoe takes over 100ms (too
      long) by running the unit tests
* The representation of the cards as self-describing objects in the decks made
  the client simplier, but for a production system, I would use indicies
  referring to the ordered deck to reduce the memory footprint.
* json-rest-api, while faster than express.js (due to simplicity), needs a
  concept of middleware and I was surprised I did not add support for query
  strings. If I was serious about this, I'd either switch to express or put
  work into json-rest-api.
* In a production system there would be async calls for persistance, and with
  that, I would need to add support for domains.
* config-js really needs to use NODE_ENV to have support for development,
  staging and production configuration files.

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

```JSON
{ "playername": "Edmond" }
```

* **name** - the name you want to play as.

**JSON Response**

```JSON
{
  "success": true,
  "cmd": "login",
  "playerId": 1,
  "tables": {
    "1": {
      "id": 1,
      "players": { },
      "numPlayers": 0,
      "state": "waiting for players"
    }
  }
}
```

* **id** - player id, a positive integer, to be re-used for all subsequent
  requests

## viewTables
Allows players to see the tables and who is at each table.

**Request Format**

* Method: `GET`
* URI path: `/viewTables`

**JSON Response**

```JSON
{
  "success": true,
  "cmd": "viewTables",
  "tables": {
    "1": {
      "id": 1,
      "players": { },
      "numPlayers": 0,
      "state": "waiting for players"
    }
  }
}
```

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

```JSON
{ "playerid": 3 }
```

* **id** - the player id received on login

**JSON Response**

```JSON
{
  "success": true,
  "cmd": "joinTable",
  "table": {
    "id": 1,
    "players": {
      "1": {
        "name": "Edmond",
        "bet": -1,
        "hand": [ ],
        "done": false,
        "busted": false
      }
    },
    "numPlayers": 1,
    "state": "betting"
  }
}
```
* **interval** - time to check for next hand of dealt cards in milliseconds
* **balance** - player&#39;s winnings (or losses)

## leaveTable
Allows the player to leave the table. If a hand is in play, the player will lose
the bet to the house. The player returns to the lobby and then receices
information describing all the tables.

**Request Format**

* Method: `POST`
* URI path: `/leaveTable`

**JSON Request Body**

```JSON
{ "playerid": 3 }
```

* **id** - the player id received on login

**JSON Response**

```JSON
{
  "success": true,
  "cmd": "leaveTable",
  "tables": {
    "1": {
      "id": 1,
      "players": { },
      "numPlayers": 0,
      "state": "waiting for players"
    }
  }
}
```

* **interval** - time to check for next hand of dealt cards in milliseconds
* **balance** - player&#39;s winnings (or losses)

## logout
Allows players to drop out of the game.

**Request Format**

* Method: `POST`
* URI path: `/logout`

**JSON Request Body**

```JSON
{ "playerId": 3 }
```

* **id** - player id, a positive integer, to be re-used for all subsequent
  requests

**JSON Response**

    { "success": true, "cmd": "logout", "credits": 1023 }

## bet
Indicates players are in on the next hand and the amount they are betting.

**Request Format**

* Method: `POST`
* URI path: `/bet`

**JSON Request Body**

```JSON
{ "playerId": 3, "bet": 10 }
```

* **id** - player id received when joining the game
* **bet** - amount of currency to bet on the next hand

**JSON Response**

```JSON
{
  "success": true,
  "cmd": "bet",
  "bet": 10,
  "hand": [
    { "suit": "spades", "rank": "Queen", "value": 10 },
    { "suit": "spades", "rank": "2", "value": 2 }
  ],
  "table": {
    "id": 1,
    "players": {
      "1": {
        "name": "Edmond",
        "bet": 10,
        "hand": [
          { "suit": "spades", "rank": "Queen", "value": 10 },
          { "suit": "spades", "rank": "2", "value": 2 }
        ],
        "done": false,
        "busted": false
      }
    },
    "dealer": {
      "name": "Dealer",
      "hand": [
        { "suit": "hearts", "rank": "4", "value": 4 },
        "face down card"
      ]
    },
    "numPlayers": 1,
    "state": "dealing"
  }
}
```

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

```JSON
{ "playerId": 3, hand: 3 }
```

* **id** - player id given when the player joins the game
* **hand** - hand, upon which, to hit:
    * 1 - for default, if not specified, 1 is assumed
    * 2 - stand on the second hand only
    * 3 - stand on both hands

**JSON Reponse**

```JSON
{
  "success": true,
  "cmd": "hit",
  "hand": [
    { "suit": "spades", "rank": "Queen", "value": 10 },
    { "suit": "spades", "rank": "2", "value": 2 },
    { "suit": "clubs", "rank": "2", "value": 2 }
  ],
  "table": {
    "id": 1,
    "players": {
      "1": {
        "name": "Edmond",
        "bet": 10,
        "hand": [
          { "suit": "spades", "rank": "Queen", "value": 10 },
          { "suit": "spades", "rank": "2", "value": 2 },
          { "suit": "clubs", "rank": "2", "value": 2 }
        ],
        "done": false,
        "busted": false
      }
    },
    "dealer": {
      "name": "Dealer",
      "hand": [
        { "suit": "hearts", "rank": "4", "value": 4 },
        "face down card"
      ]
    },
    "numPlayers": 1,
    "state": "dealing"
  }
}
```

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
* **hand** - Optional. If not present, 1 is the default. The hand upon which, to
  stand:
    * 1 - for default, if not specified, 1 is assumed
    * 2 - stand on the second hand only
    * 3 - stand on both hands

**JSON Reponse:**

```JSON
{
   "success": true,
   "cmd": "stand",
   "hand": [

   ],
   "table": {
      "id": 1,
      "players": {
         "1": {
            "name": "Edmond",
            "bet": -1,
            "hand": [
            ],
            "done": true,
            "busted": false
         }
      },
      "dealer": {
         "name": "Dealer",
         "hand": [ { "suit": "hearts", "rank": "4", "value": 4 },
            { "suit": "clubs", "rank": "4", "value": 4 },
            { "suit": "clubs", "rank": "Jack", "value": 10 }
         ]
      },
      "numPlayers": 1,
      "state": "betting"
   }
}
```

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


* **balance** - player&#39;s currency balance minus the bet they just placed
* **bet** - player&#39s current bet which is now an array, 1 bet for each hand
* **hand** - cards in the player&#39s hand. By index position in a deck. If
  player has split, there will also be a &#34;hand2&#34;
* **total** - total value of the hand. If there is an ace present the value
  will an array containing all possible values
* **h1Over21** - True, if the player value is over 21 on hand1. If there is a
  hand2, there will also be a h2_over21
* **done** - True if the player&#39;s interest in the hand is concluded

## debugCredits
Allows developers to set the amount of credits a player has to any value.

**Request Format**

* Method: POST`
* URI path: `/debugCredits`

**Request Body**

```JSON
{ "playerId": 3, "credits": 999 }
```

## debugGetPlayer
Allows developers to get the player information. It uses a POST because I was
too pressed for time to expand json-rest-api to handle query strings.

**Request Format**

* Method: POST`
* URI path: `/debugGetPlayer`

**Request Body**

```JSON
{ "playerId": 3 }
```

