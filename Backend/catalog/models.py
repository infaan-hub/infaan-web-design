from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Service(TimeStampedModel):
    class Category(models.TextChoices):
        LOGO_POSTER = "logo_poster", "Logo & Poster Design"
        WEBSITE = "website", "Website Developing and Design"
        DIGITAL_ADS = "digital_ads", "Digital Ads"
        MAINTENANCE = "maintenance", "Maintenance & Fix Web System"

    name = models.CharField(max_length=120, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    short_description = models.CharField(max_length=255)
    details = models.TextField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ServicePackage(TimeStampedModel):
    class Tier(models.TextChoices):
        SILVER = "silver", "Silver"
        GOLD = "gold", "Gold"
        PREMIUM = "premium", "Premium"
        EXTRA = "extra", "Extra"

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="packages")
    tier = models.CharField(max_length=20, choices=Tier.choices)
    title = models.CharField(max_length=150)
    description = models.TextField()
    features = models.JSONField(default=list, blank=True)
    payment_notes = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "tier"]
        unique_together = ("service", "tier")

    def __str__(self):
        return f"{self.service.name} - {self.get_tier_display()}"


class PackagePrice(TimeStampedModel):
    class BillingPeriod(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"
        PER_TASK = "per_task", "Per Task"

    package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE, related_name="prices")
    billing_period = models.CharField(max_length=20, choices=BillingPeriod.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["package__service__name", "package__tier", "billing_period"]
        unique_together = ("package", "billing_period", "currency")


class Subscription(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    package_price = models.ForeignKey(PackagePrice, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    business_name = models.CharField(max_length=120)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=30)
    notes = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
