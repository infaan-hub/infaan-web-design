#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

if [ "${SEED_INFAAN_DATA:-true}" = "true" ]; then
  python manage.py seed_infaan_data
fi
