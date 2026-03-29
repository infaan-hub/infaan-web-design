#!/usr/bin/env bash
set -o errexit
set -o pipefail

pip install --upgrade pip
pip install -r requirements.txt

# Print migration plan first so deploy logs clearly show schema state.
python manage.py showmigrations --plan
python manage.py migrate
python manage.py collectstatic --noinput

if [ "${SEED_INFAAN_DATA:-true}" = "true" ]; then
  python manage.py seed_infaan_data
fi
