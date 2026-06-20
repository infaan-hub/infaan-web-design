import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
try:
    load_dotenv(BASE_DIR / ".env")
except OSError:
    pass


def env_bool(name, default=False):
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


def env_value(name, default=""):
    value = os.getenv(name, default).strip().strip("\"'")
    prefix = f"{name}="
    if value.startswith(prefix):
        value = value[len(prefix) :].strip().strip("\"'")
    return value


DEBUG = env_bool("DJANGO_DEBUG", True)
SECRET_KEY = (
    env_value("DJANGO_SECRET_KEY")
    or env_value("SECRET_KEY")
    or "django-insecure-infaan-web-and-design-local-key"
)
if not DEBUG and SECRET_KEY == "django-insecure-infaan-web-and-design-local-key":
    raise RuntimeError("DJANGO_SECRET_KEY is not set.")

ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost",
) or ["*"]
APP_PUBLIC_URL = env_value("APP_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "accounts.apps.AccountsConfig",
    "catalog.apps.CatalogConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "infaan_backend.middleware.ApiCorsFallbackMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "infaan_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "infaan_backend.wsgi.application"
ASGI_APPLICATION = "infaan_backend.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.CustomUser"

CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173",
)
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES", "")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000",
)

CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", False)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", False)
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", False)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=7),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", False)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
SYSTEM_SUBSCRIPTION_API_URL = (
    os.getenv("SYSTEM_SUBSCRIPTION_API_URL", "http://127.0.0.1:8000/api") or ""
).rstrip("/")
