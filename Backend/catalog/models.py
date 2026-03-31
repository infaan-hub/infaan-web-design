from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Service(TimeStampedModel):
    class Category(models.TextChoices):
        LOGO_POSTER = "logo_poster", "Logo & Poster Design"
        WEBSITE = "website", "Website Developing and Design"
        SYSTEM_SUBSCRIPTION = "system_subscription", "System Developing and Subscription Service"
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


class PortfolioItem(TimeStampedModel):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="portfolio_items")
    package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE, related_name="portfolio_items")
    name = models.CharField(max_length=150)
    image_data = models.TextField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "name"]

    def __str__(self):
        return f"{self.service.name} - {self.name}"


class SubscriptionSystem(TimeStampedModel):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="subscription_systems")
    name = models.CharField(max_length=150)
    summary = models.CharField(max_length=255)
    details = models.TextField(blank=True)
    cover_image = models.TextField()
    gallery_images = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "name"]

    def __str__(self):
        return f"{self.service.name} - {self.name}"


class Subscription(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        EXPIRED = "expired", "Expired"
        SUSPENDED = "suspended", "Suspended"
        GRACE_PERIOD = "grace_period", "Grace Period"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    package_price = models.ForeignKey(PackagePrice, on_delete=models.PROTECT, related_name="subscriptions")
    subscription_system = models.ForeignKey(
        SubscriptionSystem,
        on_delete=models.SET_NULL,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    payment_method = models.CharField(max_length=30, blank=True)
    payment_contact = models.CharField(max_length=120, blank=True)
    payment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    payment_currency = models.CharField(max_length=10, default="USD")
    business_name = models.CharField(max_length=120)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=30)
    notes = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    next_billing_date = models.DateField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)
    grace_period_days = models.PositiveIntegerField(default=3)

    class Meta:
        ordering = ["-created_at"]

    def get_duration_days(self):
        period = self.package_price.billing_period
        return {
            PackagePrice.BillingPeriod.WEEKLY: 7,
            PackagePrice.BillingPeriod.MONTHLY: 30,
            PackagePrice.BillingPeriod.YEARLY: 365,
            # Task-based packages use a short managed service window by default.
            PackagePrice.BillingPeriod.PER_TASK: 30,
        }.get(period, 30)

    def assign_service_window(self, reference_date=None):
        start = reference_date or self.start_date or timezone.localdate()
        self.start_date = start
        duration_days = self.get_duration_days()
        self.end_date = start + timedelta(days=duration_days)
        self.next_billing_date = self.end_date

    def get_effective_status(self, reference_date=None):
        today = reference_date or timezone.localdate()

        if self.status in {self.Status.CANCELLED, self.Status.SUSPENDED, self.Status.COMPLETED}:
            return self.status

        if not self.end_date:
            return self.Status.ACTIVE if self.payment_status == self.PaymentStatus.PAID else self.Status.PENDING

        if self.payment_status != self.PaymentStatus.PAID:
            return self.Status.PENDING

        if today <= self.end_date:
            return self.Status.ACTIVE

        grace_end = self.end_date + timedelta(days=self.grace_period_days)
        if today <= grace_end:
            return self.Status.GRACE_PERIOD

        return self.Status.EXPIRED

    def can_access_service(self, reference_date=None):
        return self.get_effective_status(reference_date) in {self.Status.ACTIVE, self.Status.GRACE_PERIOD}
