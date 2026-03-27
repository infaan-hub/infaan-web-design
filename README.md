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
