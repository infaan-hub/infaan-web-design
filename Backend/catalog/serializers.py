from rest_framework import serializers

from .models import PackagePrice, Service, ServicePackage, Subscription


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"


class PackagePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackagePrice
        fields = "__all__"


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
            instance.prices.all().delete()
            for price_data in prices_data:
                PackagePrice.objects.create(package=instance, **price_data)

        return instance


class SubscriptionSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField(read_only=True)
    package_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "user",
            "package_price",
            "status",
            "business_name",
            "contact_email",
            "contact_phone",
            "notes",
            "start_date",
            "created_at",
            "updated_at",
            "user_details",
            "package_details",
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
            "billing_period": price.billing_period,
            "amount": str(price.amount),
            "currency": price.currency,
        }

    def validate_package_price(self, value):
        if not value.package.is_active or not value.package.service.is_active:
            raise serializers.ValidationError("This package is not currently available.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        return Subscription.objects.create(user=request.user, **validated_data)
