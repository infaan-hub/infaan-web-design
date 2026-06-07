FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# settings.py requires DATABASE_URL; use a build-only value for collectstatic.
RUN DJANGO_SECRET_KEY=build-only-secret \
    DJANGO_DEBUG=False \
    DATABASE_URL=sqlite:////tmp/build.sqlite3 \
    python manage.py collectstatic --noinput

EXPOSE 8080

CMD ["sh", "-c", "python manage.py migrate --noinput && if [ \"${SEED_INFAAN_DATA:-false}\" = \"true\" ]; then python manage.py seed_infaan_data; fi && gunicorn infaan_backend.wsgi:application --bind 0.0.0.0:${PORT:-8080}"]
