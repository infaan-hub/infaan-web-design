#!/usr/bin/env bash
set -o errexit

cd Backend
gunicorn infaan_backend.wsgi:application --bind 0.0.0.0:${PORT:-10000}
