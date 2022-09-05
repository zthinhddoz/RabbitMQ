#!/bin/bash
# Author:       ThinhDDo
# Date:         2022-Aug-31
# Usage:        ./queuelist-services.sh start | restart | stop | delete development|factory|test|staging|production
# Description:

if [ -z "$1" ]
  then
    echo "No arguments (start || restart || stop || delete) supplied"
    exit 1;
fi
if [ -z "$2" ]
  then
    echo "No arguments for environment (development|factory|test|staging|produnction) supplied"
    exit 1;
fi

if [ "$1" = "start" ]
  then
    echo "Service start...."
    # Add .env to server, server just can read env from .env file
    cp ./server/.env.$2 ./server/.env
    docker-compose -p shine-queuelist-v2-$2 up -d
elif [ "$1" = "restart" ]
  then
    echo "Service restart...."
    docker-compose -p shine-queuelist-v2-$2 restart
elif [ "$1" = "stop" ]
  then
    echo "Service stop...."
    docker-compose -p shine-queuelist-v2-$2 stop
elif [ "$1" = "delete" ]
  then
    echo "Service down...."
    docker-compose -p shine-queuelist-v2-$2 down