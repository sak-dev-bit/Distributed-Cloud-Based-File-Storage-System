#!/usr/bin/env bash
set -euo pipefail

# Simple build script for local or CI usage.

docker build -t dcfs-app:latest .

