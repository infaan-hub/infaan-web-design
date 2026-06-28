import json
import re
from urllib import error, parse, request as urllib_request
from urllib.parse import urlparse

from django.conf import settings
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser
from .serializers import AdminUserSerializer, LoginSerializer, RegisterSerializer, UserSerializer


def build_auth_response(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        },
        status=status_code,
    )


def build_unique_username(email):
    base = re.sub(r"[^a-zA-Z0-9_]+", "_", email.split("@")[0]).strip("_") or "customer"
    username = base[:150]
    suffix = 1
    while CustomUser.objects.filter(username=username).exclude(email=email).exists():
        suffix += 1
        username = f"{base[:140]}_{suffix}"
    return username


def is_allowed_request_origin(origin):
    normalized_origin = (origin or "").rstrip("/")
    if not normalized_origin:
        return False
    if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
        return True
    if normalized_origin in {item.rstrip("/") for item in getattr(settings, "CORS_ALLOWED_ORIGINS", [])}:
        return True
    for pattern in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []):
        if re.match(pattern, normalized_origin):
            return True
    return False


def normalize_redirect_origin(redirect_uri):
    parsed = urlparse((redirect_uri or "").strip())
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return ""


def exchange_google_code(code, redirect_uri):
    payload = parse.urlencode(
        {
            "code": code,
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode()

    token_request = urllib_request.Request(
        "https://oauth2.googleapis.com/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib_request.urlopen(token_request) as token_response:
        return json.loads(token_response.read().decode())


def fetch_google_userinfo(access_token):
    userinfo_request = urllib_request.Request(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib_request.urlopen(userinfo_request) as userinfo_response:
        return json.loads(userinfo_response.read().decode())




class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_response(user, status.HTTP_201_CREATED)


class AdminRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminUserSerializer(data={**request.data, "role": CustomUser.Role.ADMIN})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_auth_response(user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return build_auth_response(user)


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.headers.get("X-Requested-With") != "XmlHttpRequest":
            raise ValidationError("Invalid Google login request.")

        if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
            raise ValidationError("Google OAuth is not configured on the server.")

        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")
        if not code or not redirect_uri:
            raise ValidationError("Google authorization code is required.")

        request_origin = normalize_redirect_origin(redirect_uri)
        if not is_allowed_request_origin(request_origin):
            raise ValidationError("This origin is not allowed for Google login.")

        try:
            token_data = exchange_google_code(code, redirect_uri)
            userinfo = fetch_google_userinfo(token_data["access_token"])
        except (error.HTTPError, error.URLError, KeyError, json.JSONDecodeError):
            raise ValidationError("Unable to verify the Google login.")

        email = userinfo.get("email")
        if not email or not userinfo.get("email_verified"):
            raise ValidationError("Google account email is not verified.")

        user = CustomUser.objects.filter(email__iexact=email).first()
        if user and user.role != CustomUser.Role.CUSTOMER:
            raise ValidationError("Google login is available for customer accounts only.")

        if not user:
            user = CustomUser(
                username=build_unique_username(email),
                email=email,
                first_name=userinfo.get("given_name", ""),
                last_name=userinfo.get("family_name", ""),
                role=CustomUser.Role.CUSTOMER,
                is_active=True,
            )
            user.set_unusable_password()
            user.save()
        else:
            updated = False
            if user.first_name != userinfo.get("given_name", ""):
                user.first_name = userinfo.get("given_name", "")
                updated = True
            if user.last_name != userinfo.get("family_name", ""):
                user.last_name = userinfo.get("family_name", "")
                updated = True
            if updated:
                user.save(update_fields=["first_name", "last_name"])

        return build_auth_response(user)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def profile(request):
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by("id")
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdminUserSerializer
        return UserSerializer

    def perform_create(self, serializer):
        serializer.save()
