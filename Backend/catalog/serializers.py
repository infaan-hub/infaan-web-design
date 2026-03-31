from django.utils import timezone
from django.db import transaction
from rest_framework import serializers

from .models import PackagePrice, PortfolioItem, Service, ServicePackage, Subscription, SubscriptionSystem


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
        return (value or "USD").upper()


class ServicePackageSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    prices = PackagePriceSerializer(many=True, required=False)

    class Meta:
        model = ServicePackage
        fields = "__all__"

    def validate_prices(self, value):
        seen = set()
        for price in value:
            key = (price.get("billing_period"), (price.get("currency") or "USD").upper())
            if key in seen:
                raise serializers.ValidationError("Each billing period and currency combination must be unique.")
            seen.add(key)
        return value

    def create(self, validated_data):
        prices_data = validated_data.pop("prices", [])
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
                key = (price_data["billing_period"], (price_data.get("currency") or "USD").upper())
                incoming_by_key[key] = {
                    **price_data,
                    "currency": (price_data.get("currency") or "USD").upper(),
                }

            existing_prices = {
                (price.billing_period, (price.currency or "USD").upper()): price
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
                    if existing_price.subscriptions.exists():
                        # Keep historical prices referenced by subscriptions.
                        continue
                    existing_price.delete()

        return instance


class SubscriptionSystemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    packages = serializers.SerializerMethodField(read_only=True)
    price_preview = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubscriptionSystem
        fields = "__all__"

    def get_packages(self, obj):
        packages = obj.service.packages.filter(is_active=True).prefetch_related("prices")
        return ServicePackageSerializer(packages, many=True).data

    def get_price_preview(self, obj):
        preview = []
        for package in obj.service.packages.filter(is_active=True).prefetch_related("prices"):
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
        return attrs


class PortfolioItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    package_title = serializers.CharField(source="package.title", read_only=True)

    class Meta:
        model = PortfolioItem
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField(read_only=True)
    package_details = serializers.SerializerMethodField(read_only=True)
    service_access = serializers.SerializerMethodField(read_only=True)
    system_details = serializers.SerializerMethodField(read_only=True)

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

        system = obj.subscription_system
        return {
            "id": system.id,
            "name": system.name,
            "summary": system.summary,
            "system_url": system.system_url,
            "cover_image": system.cover_image,
            "gallery_images": system.gallery_images,
            "is_active": system.is_active,
        }

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
        return instance
