#!/usr/bin/env bash
set -euo pipefail

# Bring up the full stack (app + db + redis + nginx) using docker-compose.
# Expects env/.env.app to exist (you can copy from env/.env.app.example).

docker-compose up --build

