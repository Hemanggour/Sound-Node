#!/bin/sh

export PYTHONPATH=/app

echo "Waiting for database..."
python wait_for_db.py

python manage.py migrate --noinput

echo "Creating superuser if not exists..."
python manage.py create_superuser

python manage.py collectstatic --noinput

exec python -m gunicorn project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3
