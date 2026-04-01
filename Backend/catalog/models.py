from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta
from secrets import token_hex


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
    system_url = models.URLField(blank=True)
    admin_url = models.URLField(blank=True)
    display_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    display_price_currency = models.CharField(max_length=10, default="USD")
    cover_image = models.TextField()
    gallery_images = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "name"]

    def __str__(self):
        return f"{self.service.name} - {self.name}"


class Tenant(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        SUSPENDED = "suspended", "Suspended"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tenants")
    business_name = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["business_name", "id"]

    def __str__(self):
        return self.business_name


class TenantService(TimeStampedModel):
    class ServiceType(models.TextChoices):
        DJANGO_SYSTEM = "django_system", "Django System"
        WORDPRESS_SITE = "wordpress_site", "WordPress Site"
        CUSTOM_SITE = "custom_site", "Custom Site"
        OTHER = "other", "Other"

    class ConnectionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="services")
    subscription = models.OneToOneField("Subscription", on_delete=models.CASCADE, related_name="tenant_service", null=True, blank=True)
    system_order = models.OneToOneField(
        "SystemSubscriptionOrder", on_delete=models.CASCADE, related_name="tenant_service", null=True, blank=True
    )
    subscription_system = models.ForeignKey(
        SubscriptionSystem, on_delete=models.SET_NULL, related_name="tenant_services", null=True, blank=True
    )
    name = models.CharField(max_length=150)
    service_type = models.CharField(max_length=30, choices=ServiceType.choices, default=ServiceType.DJANGO_SYSTEM)
    domain = models.CharField(max_length=255, blank=True)
    public_url = models.URLField(blank=True)
    admin_url = models.URLField(blank=True)
    license_key = models.CharField(max_length=64, unique=True)
    api_key = models.CharField(max_length=64, unique=True)
    api_secret = models.CharField(max_length=64)
    connection_status = models.CharField(max_length=20, choices=ConnectionStatus.choices, default=ConnectionStatus.PENDING)
    is_enabled = models.BooleanField(default=True)
    last_heartbeat_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["tenant__business_name", "name"]

    def __str__(self):
        return f"{self.tenant.business_name} - {self.name}"

    @staticmethod
    def build_license_key():
        return f"LIC-{token_hex(8).upper()}"

    @staticmethod
    def build_api_key():
        return f"API-{token_hex(10).upper()}"

    @staticmethod
    def build_api_secret():
        return token_hex(24)

    @classmethod
    def issue_credentials(cls):
        return {
            "license_key": cls.build_license_key(),
            "api_key": cls.build_api_key(),
            "api_secret": cls.build_api_secret(),
        }

    def is_subscription_active(self):
        active_record = self.system_order or self.subscription
        if not active_record:
            return False
        if active_record.payment_status != Subscription.PaymentStatus.PAID:
            return False
        if self.tenant.status != Tenant.Status.ACTIVE:
            return False
        return active_record.can_access_service() and self.connection_status == self.ConnectionStatus.ACTIVE and self.is_enabled


class TenantServiceAdmin(TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="service_admins")
    service = models.ForeignKey(TenantService, on_delete=models.CASCADE, related_name="admins")
    user_identifier = models.CharField(max_length=150)
    role = models.CharField(max_length=60, default="admin")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "user_identifier"]
        unique_together = ("service", "user_identifier")

    def __str__(self):
        return f"{self.service.name} - {self.user_identifier}"


class TenantServiceFeatureAccess(TimeStampedModel):
    service = models.ForeignKey(TenantService, on_delete=models.CASCADE, related_name="feature_access")
    feature_code = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["service__name", "feature_code"]
        unique_together = ("service", "feature_code")

    def __str__(self):
        return f"{self.service.name} - {self.feature_code}"


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


class SystemSubscriptionOrder(TimeStampedModel):
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

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="system_subscription_orders")
    package_price = models.ForeignKey(PackagePrice, on_delete=models.PROTECT, related_name="system_subscription_orders")
    subscription_system = models.ForeignKey(SubscriptionSystem, on_delete=models.CASCADE, related_name="system_orders")
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
