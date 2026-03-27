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
    prices = PackagePriceSerializer(many=True, read_only=True)

    class Meta:
        model = ServicePackage
        fields = "__all__"


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
