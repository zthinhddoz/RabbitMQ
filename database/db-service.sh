#!/bin/bash
# Date:         2021-July-07
# Usage:        ./db-service.sh start | restart | stop | delete development|factory|test|staging|production
# Description:

if [ -z "$1" ]
  then
    echo "No arguments (start || restart || stop || delete) supplied"
    exit 1;
fi
if [ -z "$2" ]
  then
    echo "No arguments for environment (development|factory|test|staging|production) supplied"
    exit 1;
fi

if [ "$1" = "start" ]
  then
    echo "Service start...."
    cp .env.$2 .env
    docker-compose -p db-shinev2-$2 up -d
elif [ "$1" = "restart" ]
  then
    echo "Service restart...."
    docker-compose -p db-shinev2-$2 restart
elif [ "$1" = "stop" ]
  then
    echo "Service stop...."
    docker-compose -p db-shinev2-$2 stop
elif [ "$1" = "delete" ]
  then
    echo "Service down...."
    docker-compose -p db-shinev2-$2 down
fi