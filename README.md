# Infaan Web and Design

This workspace contains:

- `Backend/`: Django REST API with a `CustomUser` model, service/package/price/subscription management, Django admin support, and seed data for Infaan Web and Design.
- `Frontend/`: React + Vite frontend with branded JSX forms and styling for customers and admins.

## Backend setup

Use a real Python installation, then create the requested virtual environment inside `Backend`:

```powershell
cd Backend
py -m venv myvenv
.\myvenv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_infaan_data
python manage.py runserver
```

Seed command default admin credentials:

- Username: `admin`
- Password: `Admin12345!`

## Frontend setup

```powershell
cd Frontend
npm install
npm run dev
```

The frontend expects the Django API at `http://127.0.0.1:8000/api`.

## Environment files

Backend environment files:

- `Backend/.env`
- `Backend/.env.example`

Frontend environment files:

- `Frontend/.env`
- `Frontend/.env.example`

## Render deployment

Deployment files added:

- `render.yaml`
- `Backend/build.sh`
- `Backend/Procfile`

Render backend env vars used by Django:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `ALLOWED_HOSTS`
- `CORS_ALLOW_ALL_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL`
- `SEED_INFAAN_DATA`
- `SYSTEM_SUBSCRIPTION_API_URL`

Render frontend env vars used by Vite:

- `VITE_API_BASE_URL`

For subsystem-to-subsystem subscription control, set:

- `SYSTEM_SUBSCRIPTION_API_URL`

Example:

```env
SYSTEM_SUBSCRIPTION_API_URL=https://your-backend-domain/api
```

Paid system subscription responses now include:

- `control_details.api_url`
- `control_details.api_key`
- `control_details.license_key`

and direct endpoint URLs such as:

- `control_details.license_validate_url`
- `control_details.subscription_status_url`
- `control_details.heartbeat_url`

If Render is configured from the repo root instead of `Backend`, use:

```bash
./build.sh
```

and:

```bash
./start.sh
```
