from django.db import OperationalError, ProgrammingError
from rest_framework import permissions, viewsets

from accounts.models import CustomUser
from accounts.views import IsAdminUserRole
from .models import PackagePrice, PortfolioItem, Service, ServicePackage, Subscription
from .serializers import (
    PackagePriceSerializer,
    PortfolioItemSerializer,
    ServicePackageSerializer,
    ServiceSerializer,
    SubscriptionSerializer,
)


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role == CustomUser.Role.ADMIN)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]


class ServicePackageViewSet(viewsets.ModelViewSet):
    queryset = ServicePackage.objects.select_related("service").prefetch_related("prices").all()
    serializer_class = ServicePackageSerializer
    permission_classes = [IsAdminOrReadOnly]


class PackagePriceViewSet(viewsets.ModelViewSet):
    queryset = PackagePrice.objects.select_related("package", "package__service").all()
    serializer_class = PackagePriceSerializer
    permission_classes = [IsAdminOrReadOnly]


class PortfolioItemViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        try:
            return PortfolioItem.objects.select_related("service", "package").all()
        except (ProgrammingError, OperationalError):
            return PortfolioItem.objects.none()


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Subscription.objects.select_related(
            "user", "package_price", "package_price__package", "package_price__package__service"
        )
        if self.request.user.role == CustomUser.Role.ADMIN:
            return queryset.all()
        return queryset.filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminUserRole()]
        return super().get_permissions()
