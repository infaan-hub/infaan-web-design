from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CustomUser
from .serializers import AdminUserSerializer, LoginSerializer, RegisterSerializer, UserSerializer


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class AdminRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AdminUserSerializer(data={**request.data, "role": CustomUser.Role.ADMIN})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


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
