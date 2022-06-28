#!/bin/bash
# Author:       ManhVu
# Date:         2021-Oct-13
# Usage:        ./create-images.sh
# This script will auto create all needed image for shinev2 product deployment

# Create shine server image
# docker build -t shinev2_server -f ./server/docker/create.Dockerfile .
docker build -t doex-service -f ./server/Dockerfile .

# Create shine cdn image
# docker build -t shinev2_cdn -f ./gateway/cdn/Dockerfile .

# Create shine database image
# docker build -t shinev2_db -f ./database/Dockerfile .