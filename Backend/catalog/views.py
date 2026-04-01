from django.db import DatabaseError, OperationalError, ProgrammingError, transaction
from django.db.models.deletion import ProtectedError
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import timedelta
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import CustomUser
from accounts.views import IsAdminUserRole
from .models import (
    PackagePrice,
    PackageSubscriptionOrder,
    PortfolioItem,
    Service,
    ServicePackage,
    Subscription,
    SubscriptionSystem,
    SystemSubscriptionOrder,
    Tenant,
    TenantService,
    TenantServiceAdmin,
)
from .serializers import (
    ensure_subscription_control_records,
    ensure_system_order_control_records,
    LogoPosterPackageSerializer,
    PackagePriceSerializer,
    PackageSubscriptionOrderSerializer,
    PortfolioItemSerializer,
    ServiceCheckoutSerializer,
    ServicePackageSerializer,
    ServiceSerializer,
    SystemSubscriptionCheckoutSerializer,
    SystemSubscriptionOrderSerializer,
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

    def get_queryset(self):
        try:
            queryset = ServicePackage.objects.select_related("service").prefetch_related("prices")
            if self.request.user.is_authenticated and self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            if self.request.method in permissions.SAFE_METHODS:
                return queryset.filter(is_active=True, service__is_active=True)
            return queryset.all()
        except (ProgrammingError, OperationalError):
            return ServicePackage.objects.none()

    @staticmethod
    def _package_has_historical_references(instance):
        return instance.prices.filter(
            package_subscription_orders__isnull=False
        ).exists() or instance.prices.filter(
            system_subscription_orders__isnull=False
        ).exists() or instance.prices.filter(
            subscriptions__isnull=False
        ).exists()

    @staticmethod
    def _soft_delete_package(instance):
        if instance.is_active:
            instance.is_active = False
            instance.save(update_fields=["is_active", "updated_at"])

    def perform_destroy(self, instance):
        try:
            with transaction.atomic():
                if self._package_has_historical_references(instance):
                    self._soft_delete_package(instance)
                    return
                instance.delete()
        except ProtectedError:
            self._soft_delete_package(instance)


class LogoPosterPackageViewSet(ServicePackageViewSet):
    serializer_class = LogoPosterPackageSerializer

    def get_queryset(self):
        try:
            queryset = ServicePackage.objects.select_related("service").prefetch_related("prices").filter(
                service__category=Service.Category.LOGO_POSTER
            )
            if self.request.user.is_authenticated and self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            if self.request.method in permissions.SAFE_METHODS:
                return queryset.filter(is_active=True, service__is_active=True)
            return queryset.all()
        except (ProgrammingError, OperationalError):
            return ServicePackage.objects.none()


class PackagePriceViewSet(viewsets.ModelViewSet):
    queryset = PackagePrice.objects.select_related("package", "package__service").all()
    serializer_class = PackagePriceSerializer
    permission_classes = [IsAdminOrReadOnly]


class PortfolioItemViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        try:
            queryset = PortfolioItem.objects.select_related("service", "package")
            if self.request.user.is_authenticated and self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            if self.request.method in permissions.SAFE_METHODS:
                return queryset.filter(is_active=True)
            return queryset.all()
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

def build_subscription_response_data(instance, serializer_factory):
    try:
        return serializer_factory(instance).data
    except (DatabaseError, OperationalError, ProgrammingError, ObjectDoesNotExist, AttributeError):
        return {
            "id": instance.id,
            "user": instance.user_id,
            "package_price": instance.package_price_id,
            "subscription_system": instance.subscription_system_id,
            "status": instance.status,
            "payment_status": instance.payment_status,
            "payment_method": instance.payment_method,
            "payment_contact": instance.payment_contact,
            "payment_amount": str(instance.payment_amount) if instance.payment_amount is not None else None,
            "payment_currency": instance.payment_currency,
            "business_name": instance.business_name,
            "contact_email": instance.contact_email,
            "contact_phone": instance.contact_phone,
            "notes": instance.notes,
            "start_date": instance.start_date,
            "end_date": instance.end_date,
            "next_billing_date": instance.next_billing_date,
            "auto_renew": instance.auto_renew,
            "grace_period_days": instance.grace_period_days,
            "created_at": instance.created_at,
            "updated_at": instance.updated_at,
        }


def create_checkout_response(request, input_serializer_class, allow_system_provision, response_serializer):
    serializer = input_serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)
    validated = serializer.validated_data

    start_date = validated.get("start_date") or timezone.localdate()
    subscription = Subscription(
        user=request.user,
        package_price=validated["package_price"],
        subscription_system=validated.get("subscription_system"),
        payment_status=validated.get("payment_status", Subscription.PaymentStatus.PENDING),
        payment_method=validated.get("payment_method", ""),
        payment_contact=validated.get("payment_contact", ""),
        payment_amount=validated.get("payment_amount"),
        payment_currency=validated.get("payment_currency") or "USD",
        business_name=validated["business_name"].strip(),
        contact_email=validated["contact_email"].strip(),
        contact_phone=validated["contact_phone"].strip(),
        notes=validated.get("notes", ""),
        auto_renew=validated.get("auto_renew", False),
        grace_period_days=validated.get("grace_period_days", 3),
    )

    if subscription.payment_status == Subscription.PaymentStatus.PAID:
        subscription.status = Subscription.Status.ACTIVE
        subscription.assign_service_window(start_date)
    else:
        subscription.status = Subscription.Status.PENDING
        subscription.start_date = start_date

    subscription.save()

    if allow_system_provision:
        try:
            ensure_subscription_control_records(subscription)
        except (DatabaseError, OperationalError, ProgrammingError, ObjectDoesNotExist, AttributeError):
            pass

    data = build_subscription_response_data(subscription, response_serializer)
    return Response(data, status=status.HTTP_201_CREATED)


class SystemSubscriptionCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SystemSubscriptionCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        start_date = validated.get("start_date") or timezone.localdate()
        order = SystemSubscriptionOrder(
            user=request.user,
            package_price=validated["package_price"],
            subscription_system=validated["subscription_system"],
            payment_status=validated.get("payment_status", SystemSubscriptionOrder.PaymentStatus.PENDING),
            payment_method=validated.get("payment_method", ""),
            payment_contact=validated.get("payment_contact", ""),
            payment_amount=validated.get("payment_amount"),
            payment_currency=validated.get("payment_currency") or "USD",
            business_name=validated["business_name"].strip(),
            contact_email=validated["contact_email"].strip(),
            contact_phone=validated["contact_phone"].strip(),
            notes=validated.get("notes", ""),
            auto_renew=validated.get("auto_renew", False),
            grace_period_days=validated.get("grace_period_days", 3),
        )
        if order.payment_status == SystemSubscriptionOrder.PaymentStatus.PAID:
            order.status = SystemSubscriptionOrder.Status.ACTIVE
            order.assign_service_window(start_date)
        else:
            order.status = SystemSubscriptionOrder.Status.PENDING
            order.start_date = start_date
        order.save()
        try:
            ensure_system_order_control_records(order)
        except (DatabaseError, OperationalError, ProgrammingError, ObjectDoesNotExist, AttributeError):
            pass
        return Response(build_subscription_response_data(order, lambda instance: SystemSubscriptionOrderSerializer(instance)), status=status.HTTP_201_CREATED)


class PackageSubscriptionCheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ServiceCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        start_date = validated.get("start_date") or timezone.localdate()
        order = PackageSubscriptionOrder(
            user=request.user,
            package_price=validated["package_price"],
            payment_status=validated.get("payment_status", PackageSubscriptionOrder.PaymentStatus.PENDING),
            payment_method=validated.get("payment_method", ""),
            payment_contact=validated.get("payment_contact", ""),
            payment_amount=validated.get("payment_amount"),
            payment_currency=validated.get("payment_currency") or "USD",
            business_name=validated["business_name"].strip(),
            contact_email=validated["contact_email"].strip(),
            contact_phone=validated["contact_phone"].strip(),
            notes=validated.get("notes", ""),
            auto_renew=validated.get("auto_renew", False),
            grace_period_days=validated.get("grace_period_days", 3),
        )
        if order.payment_status == PackageSubscriptionOrder.PaymentStatus.PAID:
            order.status = PackageSubscriptionOrder.Status.ACTIVE
            order.assign_service_window(start_date)
        else:
            order.status = PackageSubscriptionOrder.Status.PENDING
            order.start_date = start_date
        order.save()
        return Response(
            build_subscription_response_data(order, lambda instance: PackageSubscriptionOrderSerializer(instance)),
            status=status.HTTP_201_CREATED,
        )


class PackageSubscriptionOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSubscriptionOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            queryset = PackageSubscriptionOrder.objects.select_related(
                "user", "package_price", "package_price__package", "package_price__package__service"
            )
            if self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            return queryset.filter(user=self.request.user)
        except (ProgrammingError, OperationalError):
            return PackageSubscriptionOrder.objects.none()

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsAdminUserRole()]
        return super().get_permissions()


class SystemSubscriptionOrderViewSet(viewsets.ModelViewSet):
    serializer_class = SystemSubscriptionOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        try:
            queryset = SystemSubscriptionOrder.objects.select_related(
                "user", "package_price", "package_price__package", "package_price__package__service", "subscription_system"
            )
            if self.request.user.role == CustomUser.Role.ADMIN:
                return queryset.all()
            return queryset.filter(user=self.request.user)
        except (ProgrammingError, OperationalError):
            return SystemSubscriptionOrder.objects.none()

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
