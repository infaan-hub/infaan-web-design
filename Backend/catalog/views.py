from django.db import OperationalError, ProgrammingError, transaction
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser
from accounts.views import IsAdminUserRole
from .models import (
    PackagePrice,
    PortfolioItem,
    Service,
    ServicePackage,
    Subscription,
    SubscriptionSystem,
    Tenant,
    TenantService,
    TenantServiceAdmin,
)
from .serializers import (
    ensure_subscription_control_records,
    PackagePriceSerializer,
    PortfolioItemSerializer,
    ServicePackageSerializer,
    ServiceSerializer,
    SubscriptionSerializer,
    SubscriptionSystemSerializer,
    TenantSerializer,
    TenantServiceAdminSerializer,
    TenantServiceSerializer,
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


class SubscriptionSystemViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSystemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        try:
            queryset = SubscriptionSystem.objects.select_related("service").prefetch_related("service__packages__prices")
            if self.request.user.is_authenticated and self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            if self.request.method in permissions.SAFE_METHODS:
                return queryset.filter(is_active=True)
            return queryset.all()
        except (ProgrammingError, OperationalError):
            return SubscriptionSystem.objects.none()

    def perform_destroy(self, instance):
        # Clear references explicitly before delete so admin deletes stay reliable.
        with transaction.atomic():
            instance.subscriptions.update(subscription_system=None)
            instance.delete()


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            queryset = Subscription.objects.select_related(
                "user", "package_price", "package_price__package", "package_price__package__service", "subscription_system"
            )
            if self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            return queryset.filter(user=self.request.user)
        except (ProgrammingError, OperationalError):
            return Subscription.objects.none()

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminUserRole()]
        return super().get_permissions()


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get_queryset(self):
        try:
            return Tenant.objects.select_related("owner").prefetch_related(
                "services",
                "services__feature_access",
                "services__admins",
                "services__subscription",
            )
        except (ProgrammingError, OperationalError):
            return Tenant.objects.none()


class TenantServiceViewSet(viewsets.ModelViewSet):
    serializer_class = TenantServiceSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get_queryset(self):
        try:
            for subscription in Subscription.objects.select_related("subscription_system", "package_price", "package_price__package", "user").filter(
                subscription_system__isnull=False,
                payment_status=Subscription.PaymentStatus.PAID,
            ):
                ensure_subscription_control_records(subscription)
            return TenantService.objects.select_related(
                "tenant", "subscription", "subscription_system"
            ).prefetch_related("feature_access", "admins")
        except (ProgrammingError, OperationalError):
            return TenantService.objects.none()

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.connection_status == TenantService.ConnectionStatus.ACTIVE and instance.connected_at is None:
            instance.connected_at = timezone.now()
            instance.save(update_fields=["connected_at", "updated_at"])


class TenantServiceAdminViewSet(viewsets.ModelViewSet):
    serializer_class = TenantServiceAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get_queryset(self):
        try:
            return TenantServiceAdmin.objects.select_related("tenant", "service").all()
        except (ProgrammingError, OperationalError):
            return TenantServiceAdmin.objects.none()


def _resolve_managed_service(request):
    service_id = request.data.get("service_id")
    license_key = request.data.get("license_key")
    api_key = request.data.get("api_key")
    api_secret = request.data.get("api_secret")
    domain = (request.data.get("domain") or "").strip().lower()

    if not service_id or not license_key:
        return None, Response({"detail": "service_id and license_key are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service = TenantService.objects.select_related("tenant", "subscription").prefetch_related("feature_access", "admins").get(
            id=service_id, license_key=license_key
        )
    except TenantService.DoesNotExist:
        return None, Response({"detail": "Managed service not found."}, status=status.HTTP_404_NOT_FOUND)

    if api_key and service.api_key != api_key:
        return None, Response({"detail": "Invalid API key."}, status=status.HTTP_403_FORBIDDEN)
    if api_secret and service.api_secret != api_secret:
        return None, Response({"detail": "Invalid API secret."}, status=status.HTTP_403_FORBIDDEN)
    if domain and service.domain and service.domain.lower() != domain:
        return None, Response({"detail": "Domain does not match the registered service."}, status=status.HTTP_403_FORBIDDEN)
    return service, None


def _service_payload(service):
    return {
        "service_id": service.id,
        "tenant_id": service.tenant_id,
        "tenant_name": service.tenant.business_name,
        "tenant_status": service.tenant.status,
        "service_name": service.name,
        "service_type": service.service_type,
        "domain": service.domain,
        "public_url": service.public_url,
        "admin_url": service.admin_url,
        "connection_status": service.connection_status,
        "subscription_status": service.subscription.get_effective_status(),
        "payment_status": service.subscription.payment_status,
        "active": service.is_subscription_active(),
        "expires_at": service.subscription.end_date,
        "grace_until": (
            service.subscription.end_date + timedelta(days=service.subscription.grace_period_days)
            if service.subscription.end_date
            else None
        ),
        "features": [
            {"feature_code": feature.feature_code, "enabled": feature.enabled}
            for feature in service.feature_access.all()
        ],
    }


class LicenseValidateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service, error_response = _resolve_managed_service(request)
        if error_response:
            return error_response
        return Response(_service_payload(service))


class SubscriptionStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service, error_response = _resolve_managed_service(request)
        if error_response:
            return error_response
        return Response(
            {
                "active": service.is_subscription_active(),
                "subscription_status": service.subscription.get_effective_status(),
                "payment_status": service.subscription.payment_status,
                "expires_at": service.subscription.end_date,
                "tenant_status": service.tenant.status,
                "connection_status": service.connection_status,
            }
        )


class FeatureAccessView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service, error_response = _resolve_managed_service(request)
        if error_response:
            return error_response
        return Response(
            {
                "active": service.is_subscription_active(),
                "features": [
                    {"feature_code": feature.feature_code, "enabled": feature.enabled}
                    for feature in service.feature_access.all()
                ],
            }
        )


class AdminAccessView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service, error_response = _resolve_managed_service(request)
        if error_response:
            return error_response
        return Response(
            {
                "active": service.is_subscription_active(),
                "admin_allowed": service.is_subscription_active(),
                "admins": [
                    {
                        "user_identifier": item.user_identifier,
                        "role": item.role,
                        "active": item.is_active,
                    }
                    for item in service.admins.filter(is_active=True)
                ],
            }
        )


class HeartbeatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service, error_response = _resolve_managed_service(request)
        if error_response:
            return error_response
        service.last_heartbeat_at = timezone.now()
        if service.connection_status != TenantService.ConnectionStatus.ACTIVE:
            service.connection_status = TenantService.ConnectionStatus.ACTIVE
            if service.connected_at is None:
                service.connected_at = timezone.now()
            service.save(update_fields=["last_heartbeat_at", "connection_status", "connected_at", "updated_at"])
        else:
            service.save(update_fields=["last_heartbeat_at", "updated_at"])
        return Response({"status": "ok", "active": service.is_subscription_active(), "last_heartbeat_at": service.last_heartbeat_at})
