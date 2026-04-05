from django.utils import timezone
from django.db import DatabaseError, OperationalError, ProgrammingError
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from rest_framework import serializers

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
    TenantServiceFeatureAccess,
)


def build_feature_codes(package):
    feature_codes = []
    for feature in package.features or []:
        code = "-".join(str(feature).lower().split())
        if code:
            feature_codes.append(code[:120])
    return feature_codes


def build_service_connection_details(tenant_service):
    api_url = (getattr(settings, "SYSTEM_SUBSCRIPTION_API_URL", "") or "").rstrip("/")
    return {
        "tenant_id": tenant_service.tenant_id,
        "tenant_name": tenant_service.tenant.business_name,
        "service_id": tenant_service.id,
        "service_name": tenant_service.name,
        "license_key": tenant_service.license_key,
        "api_key": tenant_service.api_key,
        "api_secret": tenant_service.api_secret,
        "api_url": api_url,
        "license_validate_url": f"{api_url}/license/validate/" if api_url else "",
        "subscription_status_url": f"{api_url}/subscription/status/" if api_url else "",
        "features_url": f"{api_url}/features/" if api_url else "",
        "admin_access_url": f"{api_url}/admin-access/" if api_url else "",
        "heartbeat_url": f"{api_url}/heartbeat/" if api_url else "",
        "connection_status": tenant_service.connection_status,
        "admin_url": tenant_service.admin_url,
        "public_url": tenant_service.public_url,
        "is_enabled": tenant_service.is_enabled,
    }


def ensure_subscription_control_records(subscription):
    if not subscription.subscription_system_id or subscription.payment_status != Subscription.PaymentStatus.PAID:
        return None

    tenant, _ = Tenant.objects.get_or_create(
        owner=subscription.user,
        business_name=subscription.business_name,
        defaults={"status": Tenant.Status.ACTIVE},
    )

    if tenant.status != Tenant.Status.ACTIVE:
        tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["status", "updated_at"])

    credentials = TenantService.issue_credentials()
    service_defaults = {
        "subscription_system": subscription.subscription_system,
        "name": subscription.subscription_system.name,
        "service_type": TenantService.ServiceType.DJANGO_SYSTEM,
        "public_url": subscription.subscription_system.system_url or "",
        "admin_url": subscription.subscription_system.admin_url or "",
        "license_key": credentials["license_key"],
        "api_key": credentials["api_key"],
        "api_secret": credentials["api_secret"],
        "connection_status": TenantService.ConnectionStatus.ACTIVE,
        "is_enabled": True,
        "connected_at": timezone.now(),
    }
    tenant_service, created = TenantService.objects.get_or_create(
        subscription=subscription,
        defaults={"tenant": tenant, **service_defaults},
    )

    updated_fields = []
    if tenant_service.tenant_id != tenant.id:
        tenant_service.tenant = tenant
        updated_fields.append("tenant")
    if tenant_service.subscription_system_id != subscription.subscription_system_id:
        tenant_service.subscription_system = subscription.subscription_system
        updated_fields.append("subscription_system")
    if tenant_service.name != subscription.subscription_system.name:
        tenant_service.name = subscription.subscription_system.name
        updated_fields.append("name")
    if not tenant_service.public_url and subscription.subscription_system.system_url:
        tenant_service.public_url = subscription.subscription_system.system_url
        updated_fields.append("public_url")
    if not tenant_service.admin_url and subscription.subscription_system.admin_url:
        tenant_service.admin_url = subscription.subscription_system.admin_url
        updated_fields.append("admin_url")
    if subscription.get_effective_status() in {Subscription.Status.ACTIVE, Subscription.Status.GRACE_PERIOD}:
        desired_tenant_status = Tenant.Status.ACTIVE
        if tenant_service.connection_status == TenantService.ConnectionStatus.PENDING:
            tenant_service.connection_status = TenantService.ConnectionStatus.ACTIVE
            updated_fields.append("connection_status")
        if tenant_service.connected_at is None:
            tenant_service.connected_at = timezone.now()
            updated_fields.append("connected_at")
    else:
        desired_tenant_status = Tenant.Status.INACTIVE
        if tenant_service.connection_status != TenantService.ConnectionStatus.INACTIVE:
            tenant_service.connection_status = TenantService.ConnectionStatus.INACTIVE
            updated_fields.append("connection_status")
        if tenant_service.is_enabled:
            tenant_service.is_enabled = False
            updated_fields.append("is_enabled")
    if tenant.status != desired_tenant_status:
        tenant.status = desired_tenant_status
        tenant.save(update_fields=["status", "updated_at"])
    if updated_fields:
        tenant_service.save(update_fields=[*updated_fields, "updated_at"])

    package = subscription.package_price.package
    feature_codes = build_feature_codes(package)
    existing_features = {item.feature_code: item for item in tenant_service.feature_access.all()}
    for feature_code in feature_codes:
        if feature_code in existing_features:
            if not existing_features[feature_code].enabled:
                existing_features[feature_code].enabled = True
                existing_features[feature_code].save(update_fields=["enabled", "updated_at"])
        else:
            TenantServiceFeatureAccess.objects.create(service=tenant_service, feature_code=feature_code, enabled=True)
    for feature_code, feature in existing_features.items():
        if feature_code not in feature_codes and feature.enabled:
            feature.enabled = False
            feature.save(update_fields=["enabled", "updated_at"])

    TenantServiceAdmin.objects.get_or_create(
        tenant=tenant,
        service=tenant_service,
        user_identifier=subscription.user.email or subscription.user.username,
        defaults={"role": "tenant_admin", "is_active": True},
    )
    return tenant_service


def ensure_system_order_control_records(order):
    if not order.subscription_system_id or order.payment_status != SystemSubscriptionOrder.PaymentStatus.PAID:
        return None

    tenant, _ = Tenant.objects.get_or_create(
        owner=order.user,
        business_name=order.business_name,
        defaults={"status": Tenant.Status.ACTIVE},
    )
    if tenant.status != Tenant.Status.ACTIVE:
        tenant.status = Tenant.Status.ACTIVE
        tenant.save(update_fields=["status", "updated_at"])

    credentials = TenantService.issue_credentials()
    tenant_service, _ = TenantService.objects.get_or_create(
        system_order=order,
        defaults={
            "tenant": tenant,
            "subscription_system": order.subscription_system,
            "name": order.subscription_system.name,
            "service_type": TenantService.ServiceType.DJANGO_SYSTEM,
            "public_url": order.subscription_system.system_url or "",
            "admin_url": order.subscription_system.admin_url or "",
            "license_key": credentials["license_key"],
            "api_key": credentials["api_key"],
            "api_secret": credentials["api_secret"],
            "connection_status": TenantService.ConnectionStatus.ACTIVE,
            "is_enabled": True,
            "connected_at": timezone.now(),
        },
    )

    updated_fields = []
    if tenant_service.tenant_id != tenant.id:
        tenant_service.tenant = tenant
        updated_fields.append("tenant")
    if tenant_service.subscription_id is not None:
        tenant_service.subscription = None
        updated_fields.append("subscription")
    if tenant_service.subscription_system_id != order.subscription_system_id:
        tenant_service.subscription_system = order.subscription_system
        updated_fields.append("subscription_system")
    if tenant_service.name != order.subscription_system.name:
        tenant_service.name = order.subscription_system.name
        updated_fields.append("name")
    if not tenant_service.public_url and order.subscription_system.system_url:
        tenant_service.public_url = order.subscription_system.system_url
        updated_fields.append("public_url")
    if not tenant_service.admin_url and order.subscription_system.admin_url:
        tenant_service.admin_url = order.subscription_system.admin_url
        updated_fields.append("admin_url")
    if order.get_effective_status() in {SystemSubscriptionOrder.Status.ACTIVE, SystemSubscriptionOrder.Status.GRACE_PERIOD}:
        if tenant_service.connection_status == TenantService.ConnectionStatus.PENDING:
            tenant_service.connection_status = TenantService.ConnectionStatus.ACTIVE
            updated_fields.append("connection_status")
        if tenant_service.connected_at is None:
            tenant_service.connected_at = timezone.now()
            updated_fields.append("connected_at")
    else:
        if tenant_service.connection_status != TenantService.ConnectionStatus.INACTIVE:
            tenant_service.connection_status = TenantService.ConnectionStatus.INACTIVE
            updated_fields.append("connection_status")
        if tenant_service.is_enabled:
            tenant_service.is_enabled = False
            updated_fields.append("is_enabled")
    if updated_fields:
        tenant_service.save(update_fields=[*updated_fields, "updated_at"])

    package = order.package_price.package
    feature_codes = build_feature_codes(package)
    existing_features = {item.feature_code: item for item in tenant_service.feature_access.all()}
    for feature_code in feature_codes:
        if feature_code in existing_features:
            if not existing_features[feature_code].enabled:
                existing_features[feature_code].enabled = True
                existing_features[feature_code].save(update_fields=["enabled", "updated_at"])
        else:
            TenantServiceFeatureAccess.objects.create(service=tenant_service, feature_code=feature_code, enabled=True)
    for feature_code, feature in existing_features.items():
        if feature_code not in feature_codes and feature.enabled:
            feature.enabled = False
            feature.save(update_fields=["enabled", "updated_at"])

    TenantServiceAdmin.objects.get_or_create(
        tenant=tenant,
        service=tenant_service,
        user_identifier=order.user.email or order.user.username,
        defaults={"role": "tenant_admin", "is_active": True},
    )
    return tenant_service


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class PackagePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePrice
        fields = "__all__"
        read_only_fields = ("id", "package", "created_at", "updated_at")

    def validate_currency(self, value):
        return (value or "TZS").upper()


class ServicePackageSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    prices = PackagePriceSerializer(many=True, required=False)

    class Meta:
        model = ServicePackage
        fields = "__all__"
        validators = []

    @staticmethod
    def _price_has_historical_references(price):
        return (
            price.subscriptions.exists()
            or price.package_subscription_orders.exists()
            or price.system_subscription_orders.exists()
        )

    @staticmethod
    def _normalize_prices(service, prices):
        normalized = {}
        for price in prices or []:
            billing_period = price.get("billing_period")
            currency = (price.get("currency") or "TZS").upper()
            if not billing_period:
                continue
            if service and service.category == Service.Category.LOGO_POSTER and billing_period != PackagePrice.BillingPeriod.PER_TASK:
                continue
            normalized[(billing_period, currency)] = {
                **price,
                "billing_period": billing_period,
                "currency": currency,
            }
        return list(normalized.values())

    def validate_prices(self, value):
        seen = set()
        for price in value:
            key = (price.get("billing_period"), (price.get("currency") or "TZS").upper())
            if key in seen:
                raise serializers.ValidationError("Each billing period and currency combination must be unique.")
            seen.add(key)
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        service = attrs.get("service") or getattr(self.instance, "service", None)
        tier = attrs.get("tier") or getattr(self.instance, "tier", None)
        prices = attrs.get("prices")
        if prices is None and self.instance is not None:
            prices = [
                {
                    "billing_period": price.billing_period,
                    "currency": price.currency,
                    "amount": price.amount,
                    "is_default": price.is_default,
                }
                for price in self.instance.prices.all()
            ]

        if service and tier:
            conflicting_active_package = ServicePackage.objects.filter(
                service=service,
                tier=tier,
                is_active=True,
            )
            if self.instance is not None:
                conflicting_active_package = conflicting_active_package.exclude(id=self.instance.id)
            if conflicting_active_package.exists():
                raise serializers.ValidationError({"tier": "An active package with this tier already exists for the selected service."})

        if prices is not None:
            attrs["prices"] = self._normalize_prices(service, prices)
        return attrs

    def create(self, validated_data):
        prices_data = validated_data.pop("prices", [])
        service = validated_data["service"]
        tier = validated_data["tier"]
        existing_inactive = ServicePackage.objects.filter(service=service, tier=tier, is_active=False).first()

        if existing_inactive:
            for field, value in validated_data.items():
                setattr(existing_inactive, field, value)
            existing_inactive.is_active = validated_data.get("is_active", True)
            existing_inactive.save()
            return self.update(existing_inactive, {"prices": prices_data})

        package = ServicePackage.objects.create(**validated_data)
        for price_data in prices_data:
            PackagePrice.objects.create(package=package, **price_data)
        return package

    def update(self, instance, validated_data):
        prices_data = validated_data.pop("prices", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if prices_data is not None:
            incoming_by_key = {}
            for price_data in prices_data:
                key = (price_data["billing_period"], (price_data.get("currency") or "TZS").upper())
                incoming_by_key[key] = {
                    **price_data,
                    "currency": (price_data.get("currency") or "TZS").upper(),
                }

            existing_prices = {
                (price.billing_period, (price.currency or "TZS").upper()): price
                for price in instance.prices.all()
            }

            with transaction.atomic():
                for key, price_data in incoming_by_key.items():
                    existing_price = existing_prices.get(key)
                    if existing_price:
                        for field, value in price_data.items():
                            setattr(existing_price, field, value)
                        existing_price.save()
                    else:
                        PackagePrice.objects.create(package=instance, **price_data)

                for key, existing_price in existing_prices.items():
                    if key in incoming_by_key:
                        continue
                    if self._price_has_historical_references(existing_price):
                        # Keep historical prices referenced by subscriptions.
                        continue
                    existing_price.delete()

        return instance


class LogoPosterPackageSerializer(ServicePackageSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        service = attrs.get("service") or getattr(self.instance, "service", None)
        if service and service.category != Service.Category.LOGO_POSTER:
            raise serializers.ValidationError({"service": "Use this API only for Logo & Poster Design services."})
        prices = attrs.get("prices", [])
        if not prices:
            raise serializers.ValidationError({"prices": "Provide at least one per_task price."})
        return attrs

    def create(self, validated_data):
        prices_data = validated_data.pop("prices", [])
        service = validated_data["service"]
        tier = validated_data["tier"]
        existing_inactive = ServicePackage.objects.filter(service=service, tier=tier, is_active=False).first()
        if existing_inactive:
            for field, value in validated_data.items():
                setattr(existing_inactive, field, value)
            existing_inactive.is_active = validated_data.get("is_active", True)
            existing_inactive.save()
            return self.update(existing_inactive, {"prices": prices_data})
        return super().create({**validated_data, "prices": prices_data})


class SubscriptionSystemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    packages = serializers.SerializerMethodField(read_only=True)
    price_preview = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubscriptionSystem
        fields = "__all__"

    def _get_active_packages(self, obj):
        prefetched_packages = getattr(obj.service, "_prefetched_objects_cache", {}).get("packages")
        packages = prefetched_packages if prefetched_packages is not None else obj.service.packages.all()
        return [package for package in packages if package.is_active]

    def get_packages(self, obj):
        packages = self._get_active_packages(obj)
        return ServicePackageSerializer(packages, many=True).data

    def get_price_preview(self, obj):
        preview = []
        for package in self._get_active_packages(obj):
            for price in package.prices.all():
                preview.append(
                    {
                        "package_id": package.id,
                        "package_title": package.title,
                        "billing_period": price.billing_period,
                        "amount": str(price.amount),
                        "currency": price.currency,
                        "is_default": price.is_default,
                    }
                )
        return preview

    def validate_service(self, value):
        if value.category != Service.Category.SYSTEM_SUBSCRIPTION:
            raise serializers.ValidationError("System subscriptions must use the system subscription service category.")
        return value

    def validate_gallery_images(self, value):
        gallery_images = [image for image in (value or []) if image]
        if len(gallery_images) != 5:
            raise serializers.ValidationError("Provide exactly 5 gallery images for the system view.")
        return gallery_images

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if "system_url" in attrs:
            attrs["system_url"] = (attrs.get("system_url") or "").strip()
        if "admin_url" in attrs:
            attrs["admin_url"] = (attrs.get("admin_url") or "").strip()
        if "display_price_currency" in attrs:
            attrs["display_price_currency"] = (attrs.get("display_price_currency") or "TZS").upper()
        return attrs


class PortfolioItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    package_title = serializers.CharField(source="package.title", read_only=True)

    class Meta:
        model = PortfolioItem
        fields = "__all__"
        extra_kwargs = {
            "service": {"required": False, "allow_null": True},
            "package": {"required": False, "allow_null": True},
        }


class BaseCheckoutSerializer(serializers.Serializer):
    package_price = serializers.PrimaryKeyRelatedField(queryset=PackagePrice.objects.select_related("package", "package__service"))
    payment_status = serializers.ChoiceField(
        choices=[Subscription.PaymentStatus.PENDING, Subscription.PaymentStatus.PAID],
        default=Subscription.PaymentStatus.PENDING,
    )
    payment_method = serializers.CharField(required=False, allow_blank=True, default="")
    payment_contact = serializers.CharField(required=False, allow_blank=True, default="")
    payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    payment_currency = serializers.CharField(required=False, allow_blank=True, default="TZS")
    business_name = serializers.CharField()
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    start_date = serializers.DateField(required=False)
    auto_renew = serializers.BooleanField(required=False, default=False)
    grace_period_days = serializers.IntegerField(required=False, min_value=0, default=3)

    def validate_package_price(self, value):
        if not value.package.is_active or not value.package.service.is_active:
            raise serializers.ValidationError("This package is not currently available.")
        return value


class ServiceCheckoutSerializer(BaseCheckoutSerializer):
    subscription_system = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.initial_data.get("subscription_system") not in (None, "", "null"):
            raise serializers.ValidationError({"subscription_system": "Use the system subscription checkout API for system subscriptions."})
        return attrs


class SystemSubscriptionCheckoutSerializer(BaseCheckoutSerializer):
    subscription_system = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionSystem.objects.only(
            "id",
            "service_id",
            "is_active",
        )
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        subscription_system = attrs["subscription_system"]
        package_price = attrs["package_price"]
        if not subscription_system.is_active:
            raise serializers.ValidationError({"subscription_system": "This system is not currently active."})
        if subscription_system.service_id != package_price.package.service_id:
            raise serializers.ValidationError({"subscription_system": "Selected system must match the package service."})
        return attrs


class SystemSubscriptionOrderSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField(read_only=True)
    package_details = serializers.SerializerMethodField(read_only=True)
    service_access = serializers.SerializerMethodField(read_only=True)
    system_details = serializers.SerializerMethodField(read_only=True)
    control_details = serializers.SerializerMethodField(read_only=True)
    record_type = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SystemSubscriptionOrder
        fields = (
            "id",
            "user",
            "package_price",
            "subscription_system",
            "status",
            "payment_status",
            "payment_method",
            "payment_contact",
            "payment_amount",
            "payment_currency",
            "business_name",
            "contact_email",
            "contact_phone",
            "notes",
            "start_date",
            "end_date",
            "next_billing_date",
            "auto_renew",
            "grace_period_days",
            "created_at",
            "updated_at",
            "user_details",
            "package_details",
            "service_access",
            "system_details",
            "control_details",
            "record_type",
        )

    def get_record_type(self, obj):
        return "system_subscription"

    def get_user_details(self, obj):
        return {"id": obj.user_id, "username": obj.user.username, "email": obj.user.email, "role": obj.user.role}

    def get_package_details(self, obj):
        price = obj.package_price
        package = price.package
        return {
            "service": package.service.name,
            "tier": package.tier,
            "title": package.title,
            "features": package.features,
            "payment_notes": package.payment_notes,
            "billing_period": price.billing_period,
            "amount": str(price.amount),
            "currency": price.currency,
        }

    def get_service_access(self, obj):
        effective_status = obj.get_effective_status()
        return {
            "status": effective_status,
            "can_access": obj.can_access_service(),
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "next_billing_date": obj.next_billing_date,
            "grace_period_days": obj.grace_period_days,
        }

    def get_system_details(self, obj):
        system = obj.subscription_system
        return {
            "id": system.id,
            "name": system.name,
            "summary": system.summary,
            "system_url": system.system_url,
            "admin_url": getattr(system, "admin_url", ""),
            "display_price": str(system.display_price) if system.display_price is not None else None,
            "display_price_currency": system.display_price_currency,
            "cover_image": system.cover_image,
            "gallery_images": system.gallery_images,
            "is_active": system.is_active,
        }

    def get_control_details(self, obj):
        try:
            tenant_service = obj.tenant_service
        except (ObjectDoesNotExist, AttributeError, DatabaseError, OperationalError, ProgrammingError):
            tenant_service = None
        if not tenant_service:
            return None
        return build_service_connection_details(tenant_service)


class PackageSubscriptionOrderSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField(read_only=True)
    package_details = serializers.SerializerMethodField(read_only=True)
    service_access = serializers.SerializerMethodField(read_only=True)
    system_details = serializers.SerializerMethodField(read_only=True)
    control_details = serializers.SerializerMethodField(read_only=True)
    record_type = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PackageSubscriptionOrder
        fields = (
            "id",
            "user",
            "package_price",
            "status",
            "payment_status",
            "payment_method",
            "payment_contact",
            "payment_amount",
            "payment_currency",
            "business_name",
            "contact_email",
            "contact_phone",
            "notes",
            "start_date",
            "end_date",
            "next_billing_date",
            "auto_renew",
            "grace_period_days",
            "created_at",
            "updated_at",
            "user_details",
            "package_details",
            "service_access",
            "system_details",
            "control_details",
            "record_type",
        )

    def get_record_type(self, obj):
        return "package_subscription"

    def get_user_details(self, obj):
        return {"id": obj.user_id, "username": obj.user.username, "email": obj.user.email, "role": obj.user.role}

    def get_package_details(self, obj):
        price = obj.package_price
        package = price.package
        return {
            "service": package.service.name,
            "tier": package.tier,
            "title": package.title,
            "features": package.features,
            "payment_notes": package.payment_notes,
            "billing_period": price.billing_period,
            "amount": str(price.amount),
            "currency": price.currency,
        }

    def get_service_access(self, obj):
        effective_status = obj.get_effective_status()
        return {
            "status": effective_status,
            "can_access": obj.can_access_service(),
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "next_billing_date": obj.next_billing_date,
            "grace_period_days": obj.grace_period_days,
        }

    def get_system_details(self, obj):
        return None

    def get_control_details(self, obj):
        return None


class SubscriptionSerializer(serializers.ModelSerializer):
    subscription_system = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionSystem.objects.only(
            "id",
            "service_id",
            "name",
            "summary",
            "system_url",
            "display_price",
            "display_price_currency",
            "cover_image",
            "gallery_images",
            "is_active",
        ),
        required=False,
        allow_null=True,
    )
    user_details = serializers.SerializerMethodField(read_only=True)
    package_details = serializers.SerializerMethodField(read_only=True)
    service_access = serializers.SerializerMethodField(read_only=True)
    system_details = serializers.SerializerMethodField(read_only=True)
    control_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "user",
            "package_price",
            "subscription_system",
            "status",
            "payment_status",
            "payment_method",
            "payment_contact",
            "payment_amount",
            "payment_currency",
            "business_name",
            "contact_email",
            "contact_phone",
            "notes",
            "start_date",
            "end_date",
            "next_billing_date",
            "auto_renew",
            "grace_period_days",
            "created_at",
            "updated_at",
            "user_details",
            "package_details",
            "service_access",
            "system_details",
            "control_details",
        )
        read_only_fields = ("user", "created_at", "updated_at")

    def get_user_details(self, obj):
        return {
            "id": obj.user_id,
            "username": obj.user.username,
            "email": obj.user.email,
            "role": obj.user.role,
        }

    def get_package_details(self, obj):
        price = obj.package_price
        package = price.package
        return {
            "service": package.service.name,
            "tier": package.tier,
            "title": package.title,
            "features": package.features,
            "payment_notes": package.payment_notes,
            "billing_period": price.billing_period,
            "amount": str(price.amount),
            "currency": price.currency,
        }

    def get_service_access(self, obj):
        effective_status = obj.get_effective_status()
        return {
            "status": effective_status,
            "can_access": obj.can_access_service(),
            "start_date": obj.start_date,
            "end_date": obj.end_date,
            "next_billing_date": obj.next_billing_date,
            "grace_period_days": obj.grace_period_days,
        }

    def get_system_details(self, obj):
        if not obj.subscription_system_id:
            return None

        try:
            system = obj.subscription_system
            return {
                "id": system.id,
                "name": system.name,
                "summary": system.summary,
                "system_url": system.system_url,
                "admin_url": getattr(system, "admin_url", ""),
                "display_price": str(system.display_price) if system.display_price is not None else None,
                "display_price_currency": system.display_price_currency,
                "cover_image": system.cover_image,
                "gallery_images": system.gallery_images,
                "is_active": system.is_active,
            }
        except (ObjectDoesNotExist, AttributeError, DatabaseError, OperationalError, ProgrammingError):
            return {
                "id": obj.subscription_system_id,
                "name": "",
                "summary": "",
                "system_url": "",
                "admin_url": "",
                "display_price": None,
                "display_price_currency": "TZS",
                "cover_image": "",
                "gallery_images": [],
                "is_active": True,
            }

    def get_control_details(self, obj):
        try:
            tenant_service = obj.tenant_service
        except (ObjectDoesNotExist, AttributeError, DatabaseError, OperationalError, ProgrammingError):
            tenant_service = None
        if not tenant_service:
            return None
        return build_service_connection_details(tenant_service)

    def validate_package_price(self, value):
        if not value.package.is_active or not value.package.service.is_active:
            raise serializers.ValidationError("This package is not currently available.")
        return value

    def validate(self, attrs):
        package_price = attrs.get("package_price") or getattr(self.instance, "package_price", None)
        subscription_system = attrs.get("subscription_system")
        if subscription_system is None and self.instance is not None:
            subscription_system = getattr(self.instance, "subscription_system", None)

        if subscription_system:
            if not subscription_system.is_active:
                raise serializers.ValidationError({"subscription_system": "This system is not currently active."})
            if package_price and subscription_system.service_id != package_price.package.service_id:
                raise serializers.ValidationError(
                    {"subscription_system": "Selected system must match the package service."}
                )

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        payment_status = validated_data.get("payment_status", Subscription.PaymentStatus.PENDING)
        start_date = validated_data.get("start_date") or timezone.localdate()
        subscription = Subscription(user=request.user, **validated_data)

        if payment_status == Subscription.PaymentStatus.PAID:
            subscription.status = Subscription.Status.ACTIVE
            subscription.assign_service_window(start_date)
        else:
            subscription.status = Subscription.Status.PENDING
            subscription.start_date = start_date

        subscription.save()
        try:
            ensure_subscription_control_records(subscription)
        except (DatabaseError, OperationalError, ProgrammingError):
            pass
        return subscription

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)

        if instance.payment_status == Subscription.PaymentStatus.PAID and instance.status not in {
            Subscription.Status.CANCELLED,
            Subscription.Status.SUSPENDED,
            Subscription.Status.COMPLETED,
        }:
            instance.status = instance.get_effective_status()
            if not instance.start_date or not instance.end_date:
                instance.assign_service_window(instance.start_date or timezone.localdate())

        instance.save()
        try:
            ensure_subscription_control_records(instance)
        except (DatabaseError, OperationalError, ProgrammingError):
            pass
        return instance


class TenantServiceFeatureAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantServiceFeatureAccess
        fields = ("id", "feature_code", "enabled")


class TenantServiceAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantServiceAdmin
        fields = ("id", "user_identifier", "role", "is_active")


class TenantServiceSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.business_name", read_only=True)
    subscription_status = serializers.CharField(source="subscription.status", read_only=True)
    subscription_payment_status = serializers.CharField(source="subscription.payment_status", read_only=True)
    subscription_end_date = serializers.DateField(source="subscription.end_date", read_only=True)
    feature_access = TenantServiceFeatureAccessSerializer(many=True, read_only=True)
    admins = TenantServiceAdminSerializer(many=True, read_only=True)
    computed_active = serializers.SerializerMethodField(read_only=True)
    api_url = serializers.SerializerMethodField(read_only=True)
    license_validate_url = serializers.SerializerMethodField(read_only=True)
    subscription_status_url = serializers.SerializerMethodField(read_only=True)
    features_url = serializers.SerializerMethodField(read_only=True)
    admin_access_url = serializers.SerializerMethodField(read_only=True)
    heartbeat_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TenantService
        fields = (
            "id",
            "tenant",
            "tenant_name",
            "subscription",
            "subscription_system",
            "name",
            "service_type",
            "domain",
            "public_url",
            "admin_url",
            "license_key",
            "api_key",
            "api_secret",
            "api_url",
            "license_validate_url",
            "subscription_status_url",
            "features_url",
            "admin_access_url",
            "heartbeat_url",
            "connection_status",
            "is_enabled",
            "last_heartbeat_at",
            "connected_at",
            "subscription_status",
            "subscription_payment_status",
            "subscription_end_date",
            "computed_active",
            "feature_access",
            "admins",
        )
        read_only_fields = ("license_key", "api_key", "api_secret", "last_heartbeat_at", "connected_at")

    def get_computed_active(self, obj):
        return obj.is_subscription_active()

    def get_api_url(self, obj):
        return build_service_connection_details(obj)["api_url"]

    def get_license_validate_url(self, obj):
        return build_service_connection_details(obj)["license_validate_url"]

    def get_subscription_status_url(self, obj):
        return build_service_connection_details(obj)["subscription_status_url"]

    def get_features_url(self, obj):
        return build_service_connection_details(obj)["features_url"]

    def get_admin_access_url(self, obj):
        return build_service_connection_details(obj)["admin_access_url"]

    def get_heartbeat_url(self, obj):
        return build_service_connection_details(obj)["heartbeat_url"]


class TenantSerializer(serializers.ModelSerializer):
    services = TenantServiceSerializer(many=True, read_only=True)
    owner_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Tenant
        fields = ("id", "business_name", "status", "owner", "owner_details", "services")
        read_only_fields = ("owner",)

    def get_owner_details(self, obj):
        return {
            "id": obj.owner_id,
            "username": obj.owner.username,
            "email": obj.owner.email,
        }
