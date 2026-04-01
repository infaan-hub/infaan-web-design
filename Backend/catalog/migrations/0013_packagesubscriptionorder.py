from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0012_systemsubscriptionorder_and_tenantservice_link"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PackageSubscriptionOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("active", "Active"), ("completed", "Completed"), ("expired", "Expired"), ("suspended", "Suspended"), ("grace_period", "Grace Period"), ("cancelled", "Cancelled")], default="pending", max_length=20)),
                ("payment_status", models.CharField(choices=[("pending", "Pending"), ("paid", "Paid")], default="pending", max_length=20)),
                ("payment_method", models.CharField(blank=True, max_length=30)),
                ("payment_contact", models.CharField(blank=True, max_length=120)),
                ("payment_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("payment_currency", models.CharField(default="USD", max_length=10)),
                ("business_name", models.CharField(max_length=120)),
                ("contact_email", models.EmailField(max_length=254)),
                ("contact_phone", models.CharField(max_length=30)),
                ("notes", models.TextField(blank=True)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("end_date", models.DateField(blank=True, null=True)),
                ("next_billing_date", models.DateField(blank=True, null=True)),
                ("auto_renew", models.BooleanField(default=False)),
                ("grace_period_days", models.PositiveIntegerField(default=3)),
                ("package_price", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="package_subscription_orders", to="catalog.packageprice")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="package_subscription_orders", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
