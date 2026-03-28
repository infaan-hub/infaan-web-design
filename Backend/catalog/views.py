from django.db import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

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


class AzamPayCallbackView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    success_statuses = {"success", "successful", "completed", "paid", "approved"}
    failed_statuses = {"failed", "failure", "cancelled", "canceled", "declined", "rejected"}

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {"payload": request.data}
        normalized_payload = self._normalize_mapping(payload)
        external_id = self._extract_value(
            normalized_payload,
            ("externalid", "reference", "merchantreference", "orderid", "transactionreference"),
        )
        payment_reference = self._extract_value(
            normalized_payload,
            (
                "paymentreference",
                "externalid",
                "transactionid",
                "transid",
                "operatorreferenceid",
                "operatorreference",
            ),
        )
        raw_status = self._extract_value(
            normalized_payload,
            ("status", "transactionstatus", "paymentstatus", "result", "message"),
        )
        normalized_status = str(raw_status or "").strip().lower()
        subscription = self._get_subscription(external_id, payment_reference)
        if subscription is None:
            return Response(
                {
                    "detail": "AzamPay callback received, but no matching subscription was found.",
                    "external_id": external_id,
                    "payment_reference": payment_reference,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        subscription.payment_method = subscription.payment_method or "azampay"
        subscription.payment_reference = payment_reference or subscription.payment_reference
        subscription.payment_callback_payload = payload

        if normalized_status in self.success_statuses:
            subscription.payment_status = Subscription.PaymentStatus.PAID
            subscription.status = Subscription.Status.ACTIVE
            if subscription.paid_at is None:
                subscription.paid_at = timezone.now()
        elif normalized_status in self.failed_statuses:
            subscription.payment_status = Subscription.PaymentStatus.PENDING
            subscription.status = Subscription.Status.CANCELLED

        subscription.save(
            update_fields=[
                "payment_method",
                "payment_reference",
                "payment_callback_payload",
                "payment_status",
                "status",
                "paid_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "AzamPay callback received.",
                "subscription_id": subscription.id,
                "payment_status": subscription.payment_status,
                "payment_reference": subscription.payment_reference,
            },
            status=status.HTTP_200_OK,
        )

    def _get_subscription(self, external_id, payment_reference):
        if external_id:
            subscription = Subscription.objects.filter(external_id=str(external_id)).first()
            if subscription:
                return subscription
            if str(external_id).isdigit():
                subscription = Subscription.objects.filter(pk=int(external_id)).first()
                if subscription:
                    return subscription

        if payment_reference:
            return Subscription.objects.filter(payment_reference=str(payment_reference)).first()
        return None

    def _normalize_mapping(self, value):
        normalized = {}
        if isinstance(value, dict):
            for key, item in value.items():
                normalized[str(key).replace("_", "").lower()] = item
        return normalized

    def _extract_value(self, data, keys):
        for key in keys:
            if key in data and data[key] not in (None, ""):
                return data[key]

        for item in data.values():
            if isinstance(item, dict):
                nested_value = self._extract_value(self._normalize_mapping(item), keys)
                if nested_value not in (None, ""):
                    return nested_value
        return None
