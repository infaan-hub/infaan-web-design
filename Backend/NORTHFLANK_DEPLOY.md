# Northflank Django Deployment

Deploy this backend on Northflank as a Dockerfile service from the `Backend` directory.

## Build settings

- Repository root: your GitHub repository
- Dockerfile path: `Backend/Dockerfile`
- Docker build context: `Backend`
- Public HTTP port: `8080`

Northflank can expose the service on a generated `*.code.run` domain or on your custom domain. Put the final HTTPS backend URL in `APP_PUBLIC_URL`.

## Runtime variables

Set these in the Northflank service runtime variables:

```env
DJANGO_SECRET_KEY=your-long-random-production-secret
DJANGO_DEBUG=False
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
PORT=8080
APP_PUBLIC_URL=https://your-northflank-service.code.run
ALLOWED_HOSTS=.code.run,localhost,127.0.0.1,infaanwebdesign.vercel.app
CSRF_TRUSTED_ORIGINS=https://*.code.run,https://infaanwebdesign.vercel.app
CORS_ALLOWED_ORIGINS=https://infaanwebdesign.vercel.app
CORS_ALLOWED_ORIGIN_REGEXES=https://.*\.vercel\.app,https://.*\.code\.run
CORS_ALLOW_ALL_ORIGINS=False
SEED_INFAAN_DATA=true
SYSTEM_SUBSCRIPTION_API_URL=https://your-northflank-service.code.run/api
```

Only add the email and Google OAuth variables if you use those features.

## Frontend

In Vercel, set:

```env
VITE_API_BASE_URL=https://your-northflank-service.code.run/api
```

Then redeploy the frontend.
