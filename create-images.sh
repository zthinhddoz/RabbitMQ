#!/bin/bash
# Author:       ManhVu
# Date:         2022-June-xx
# Usage:        ./create-images.sh
# This script will auto create all needed image for shinev2 product deployment

# Create shine server image
docker build -t queue-list-service -f ./server/Dockerfile .