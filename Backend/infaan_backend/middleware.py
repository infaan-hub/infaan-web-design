import re

from django.conf import settings
from django.http import HttpResponse


def _origin_allowed(origin):
    normalized_origin = (origin or "").rstrip("/")
    if not normalized_origin:
        return False
    if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
        return True
    allowed_origins = {item.rstrip("/") for item in getattr(settings, "CORS_ALLOWED_ORIGINS", [])}
    if normalized_origin in allowed_origins:
        return True
    for pattern in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []):
        if re.match(pattern, normalized_origin):
            return True
    return False


class ApiCorsFallbackMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        if request.method == "OPTIONS" and request.path.startswith("/api/"):
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)
        return self._apply_headers(request, response, origin)

    def _apply_headers(self, request, response, origin):
        if not request.path.startswith("/api/"):
            return response
        if not _origin_allowed(origin):
            return response

        response["Access-Control-Allow-Origin"] = origin
        response["Vary"] = "Origin"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        requested_headers = request.headers.get("Access-Control-Request-Headers")
        response["Access-Control-Allow-Headers"] = requested_headers or "Authorization, Content-Type, X-Requested-With"
        return response
