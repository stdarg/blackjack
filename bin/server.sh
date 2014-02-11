#!/bin/bash
export NODE_ENV="PRODUCTION"

if [ ! -f "./bin/server.js" ]
then
    echo "Run this script is the root directory of blackjack."
    echo "That is where the package.json resides."
    exit 1
fi


./bin/server.js

