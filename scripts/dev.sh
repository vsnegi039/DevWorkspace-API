#!/usr/bin/env bash
set -e

cleanup() {
    docker-compose -f docker-compose.dev.yml down
    trap '' EXIT INT TERM
    exit $?
}

trap cleanup SIGINT EXIT

# Make sure docker-compose is installed
if ! hash docker-compose 2>/dev/null; then
  echo -e '\033[0;31mplease install docker\033[0m'
  exit 1
fi

# Check if Docker network exists, create if not
if [ -z "$(docker network ls -qf name=^entropic$)" ]; then
  echo "Creating network"
  docker network create entropic >/dev/null
fi

# Start Docker services using docker-compose
COMPOSE_HTTP_TIMEOUT=120 docker-compose -f docker-compose.dev.yml up -d --force-recreate

# Add node_modules/.bin to PATH
export PATH=$PATH:$(pwd)/node_modules/.bin

# Run the TypeScript app using ts-node-dev
if ! ts-node-dev --respawn --transpile-only src/server.ts; then
  echo -e "\033[0;31mError starting the TypeScript server\033[0m"
  exit 1
fi
