from django.contrib import admin

from .models import PackagePrice, Service, ServicePackage, Subscription


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name",)


@admin.register(ServicePackage)
class ServicePackageAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "service", "tier", "is_active")
    list_filter = ("tier", "service", "is_active")
    search_fields = ("title", "service__name")


@admin.register(PackagePrice)
class PackagePriceAdmin(admin.ModelAdmin):
    list_display = ("id", "package", "billing_period", "amount", "currency", "is_default")
    list_filter = ("billing_period", "currency", "is_default")
    search_fields = ("package__title", "package__service__name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "package_price", "status", "business_name", "created_at")
    list_filter = ("status", "package_price__billing_period")
    search_fields = ("user__username", "business_name", "contact_email")
