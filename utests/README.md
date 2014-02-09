User Tests
==========

These tests simulate an arbitrary number of users playing the game. Upon
creation, each user randomly adopts a strategy. A strategy is a pattern of play,
a player may have multiple strategies. Valid strategies might be:

**Pre-Play Behavior**

* Do only the following: login, view tables, join table, leave table, logout
* Do only the following: login, join table, leave table, logout
* Do only the following: login, join table, logout
* Do only the following: login and logout
* Do only the following: login, join table
* Do only the following: login
* Do a random command

**Play Behaviors**

* During each hand, randomly decide to hit or stand.
* During each hand, hit on 17 or less.
* During each hand, continue to hit until busting on every hand
* During each hand, stand on every hand
* During each hand, hit once, then stand
* During each hand, randomize the bet amount
* During each hand, constant bet amount every time
* During each hand, do a random action

**Post-Play Behavior**

* After every hand, change tables
* After every hand, logout and then log back in

# Requirements

## Pre-Play Behaviors

* Need to track at a table or in lobby
* Need to track if logged in or not.
    * If there are play behaviors that follow, that implies a login and a join
        table

## Play Behaviors

* Create an end-point POST /debug/addCredits with a request body:

    { playerId: 3, credits: 10000 }

    * Sets the player&39a;s number of credits to 10000.
* Need to track hand state, to know if to hit or stand.

