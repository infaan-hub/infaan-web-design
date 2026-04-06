import json
import re
import secrets
from datetime import timedelta
from urllib import error, parse, request as urllib_request
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import DatabaseError, OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CustomUser, EmailOTP
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


def mask_email_address(email):
    local_part, _, domain = (email or "").partition("@")
    if not local_part or not domain:
        return email
    if len(local_part) <= 2:
        visible_local = local_part[:1]
    else:
        visible_local = f"{local_part[:2]}{'*' * max(len(local_part) - 2, 2)}"
    return f"{visible_local}@{domain}"


def generate_otp_code():
    return f"{secrets.randbelow(900000) + 100000:06d}"


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


def build_otp_payload(otp):
    now = timezone.now()
    resend_after = max(int((otp.resend_available_at - now).total_seconds()), 0)
    expires_in = max(int((otp.expires_at - now).total_seconds()), 0)
    return {
        "requires_verification": True,
        "verification_token": otp.verification_token,
        "email": otp.user.email,
        "masked_email": mask_email_address(otp.user.email),
        "resend_after_seconds": resend_after,
        "expires_in_seconds": expires_in,
    }


def build_otp_challenge_response(user, detail="Verification code sent to your email.", status_code=status.HTTP_200_OK):
    try:
        otp = create_otp_for_user(user)
    except ValidationError:
        raise
    except (ProgrammingError, OperationalError, DatabaseError):
        raise ValidationError("Email verification is not ready on the server yet. Please run the latest database migrations.")
    except Exception:
        raise ValidationError("Unable to send the verification code email right now.")

    return Response(
        {
            "detail": detail,
            "user": UserSerializer(user).data,
            **build_otp_payload(otp),
        },
        status=status_code,
    )


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


def send_otp_email(user, code):
    sender = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    if not sender:
        raise ValidationError("Email sender is not configured on the server.")
    if not user.email:
        raise ValidationError("This account does not have an email address for verification.")
    if settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend":
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            raise ValidationError("SMTP email is not configured on the server.")

    send_mail(
        subject="Your email verification code",
        message=f"Your verification code is: {code}\nThis code expires in 10 minutes.",
        from_email=sender,
        recipient_list=[user.email],
        fail_silently=False,
    )


def create_otp_for_user(user, purpose=EmailOTP.Purpose.GOOGLE_LOGIN):
    EmailOTP.objects.filter(user=user, purpose=purpose, is_verified=False).delete()
    code = generate_otp_code()
    now = timezone.now()
    otp = EmailOTP.objects.create(
        user=user,
        purpose=purpose,
        verification_token=secrets.token_urlsafe(32),
        otp_hash=make_password(code),
        expires_at=now + timedelta(minutes=10),
        resend_available_at=now + timedelta(seconds=60),
    )
    send_otp_email(user, code)
    return otp


def get_pending_otp(verification_token, purpose=EmailOTP.Purpose.GOOGLE_LOGIN):
    otp = EmailOTP.objects.filter(
        verification_token=verification_token,
        purpose=purpose,
        is_verified=False,
    ).select_related("user").first()
    if not otp:
        raise ValidationError("Verification session was not found. Please login again.")
    return otp


def verify_pending_otp(verification_token, entered_code, purpose=EmailOTP.Purpose.GOOGLE_LOGIN):
    otp = get_pending_otp(verification_token, purpose)

    if otp.is_expired():
        otp.delete()
        raise ValidationError("This verification code has expired. Please request a new one.")

    if otp.attempts >= otp.max_attempts:
        otp.delete()
        raise ValidationError("Too many invalid attempts. Please request a new code.")

    if not check_password(entered_code, otp.otp_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        raise ValidationError("Invalid verification code.")

    otp.is_verified = True
    otp.verified_at = timezone.now()
    otp.save(update_fields=["is_verified", "verified_at"])
    EmailOTP.objects.filter(user=otp.user, purpose=purpose, is_verified=False).exclude(id=otp.id).delete()
    return otp.user


def resend_pending_otp(verification_token, purpose=EmailOTP.Purpose.GOOGLE_LOGIN):
    otp = get_pending_otp(verification_token, purpose)
    now = timezone.now()
    if otp.is_expired():
        otp.delete()
        raise ValidationError("This verification code has expired. Please login again.")
    if otp.resend_available_at > now:
        seconds_left = max(int((otp.resend_available_at - now).total_seconds()), 1)
        raise ValidationError(f"Please wait {seconds_left} seconds before requesting another code.")

    code = generate_otp_code()
    otp.otp_hash = make_password(code)
    otp.expires_at = now + timedelta(minutes=10)
    otp.resend_available_at = now + timedelta(seconds=60)
    otp.attempts = 0
    otp.save(update_fields=["otp_hash", "expires_at", "resend_available_at", "attempts"])
    send_otp_email(otp.user, code)
    return otp


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return build_otp_challenge_response(
            user,
            detail="Registration successful. Verification code sent to your email.",
            status_code=status.HTTP_201_CREATED,
        )


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
        return build_otp_challenge_response(user)


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

        return build_otp_challenge_response(user)


class VerifyEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        verification_token = (request.data.get("verification_token") or "").strip()
        otp_code = (request.data.get("otp_code") or "").strip()
        if not verification_token or not otp_code:
            raise ValidationError("Verification token and OTP code are required.")
        if not otp_code.isdigit() or len(otp_code) != 6:
            raise ValidationError("Enter the 6-digit verification code.")

        user = verify_pending_otp(verification_token, otp_code)
        return build_auth_response(user)


class ResendEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        verification_token = (request.data.get("verification_token") or "").strip()
        if not verification_token:
            raise ValidationError("Verification token is required.")

        try:
            otp = resend_pending_otp(verification_token)
        except Exception as exc:
            if isinstance(exc, ValidationError):
                raise
            raise ValidationError("Unable to resend the verification code right now.")

        return Response(
            {
                "detail": "A new verification code has been sent to your email.",
                **build_otp_payload(otp),
            },
            status=status.HTTP_200_OK,
        )


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
