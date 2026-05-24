#!/bin/bash
set -e

PI_USER="pi"
PI_HOST="192.168.0.29"
PI_PATH="/home/pi/vehicle"

if [ "$1" != "" ]; then
  PI_HOST="$1"
fi

echo "Deploying to pi@${PI_HOST}:${PI_PATH}"

rsync -avz --progress \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.git' \
  ./pi/ "${PI_USER}@${PI_HOST}:${PI_PATH}/"

echo "Done."
