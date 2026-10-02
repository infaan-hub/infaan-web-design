#!/usr/bin/env bash
set -o errexit

cd infaan-next
npm install
npm run build:prod
