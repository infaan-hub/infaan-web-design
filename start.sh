#!/usr/bin/env bash
set -o errexit

cd Backend
gunicorn infaan_backend.wsgi:application
