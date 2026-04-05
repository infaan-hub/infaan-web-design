from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        CUSTOMER = "customer", "Customer"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    phone_number = models.CharField(max_length=30, blank=True)

    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        self.is_staff = self.is_superuser or self.role == self.Role.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"


class EmailOTP(models.Model):
    class Purpose(models.TextChoices):
        GOOGLE_LOGIN = "google_login", "Google Login"

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="email_otps")
    purpose = models.CharField(max_length=30, choices=Purpose.choices, default=Purpose.GOOGLE_LOGIN)
    verification_token = models.CharField(max_length=128, unique=True)
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    resend_available_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def is_expired(self):
        return timezone.now() > self.expires_at
