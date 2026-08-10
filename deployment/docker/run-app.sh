#!/bin/sh

# Watchdog for an app container.
# Run npm install on startup for the sake of platform-sensitive packages.
npm install

# execute migrations once database is up
npm run create
until npm run migrate
do
npm run create
done

while true; do
    npm run http
    echo "Process exited with code $?.  Respawning.." >&2
    sleep 1
done
