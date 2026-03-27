import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Service",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120, unique=True)),
                ("category", models.CharField(choices=[("logo_poster", "Logo & Poster Design"), ("website", "Website Developing and Design"), ("digital_ads", "Digital Ads"), ("maintenance", "Maintenance & Fix Web System")], max_length=30)),
                ("short_description", models.CharField(max_length=255)),
                ("details", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="ServicePackage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("tier", models.CharField(choices=[("silver", "Silver"), ("gold", "Gold"), ("premium", "Premium"), ("extra", "Extra")], max_length=20)),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField()),
                ("features", models.JSONField(blank=True, default=list)),
                ("payment_notes", models.CharField(blank=True, max_length=255)),
                ("is_active", models.BooleanField(default=True)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="packages", to="catalog.service")),
            ],
            options={"ordering": ["service__name", "tier"], "unique_together": {("service", "tier")}},
        ),
        migrations.CreateModel(
            name="PackagePrice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("billing_period", models.CharField(choices=[("weekly", "Weekly"), ("monthly", "Monthly"), ("yearly", "Yearly"), ("per_task", "Per Task")], max_length=20)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("currency", models.CharField(default="USD", max_length=10)),
                ("is_default", models.BooleanField(default=False)),
                ("package", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="prices", to="catalog.servicepackage")),
            ],
            options={"ordering": ["package__service__name", "package__tier", "billing_period"], "unique_together": {("package", "billing_period")}},
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("active", "Active"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="pending", max_length=20)),
                ("business_name", models.CharField(max_length=120)),
                ("contact_email", models.EmailField(max_length=254)),
                ("contact_phone", models.CharField(max_length=30)),
                ("notes", models.TextField(blank=True)),
                ("start_date", models.DateField(blank=True, null=True)),
                ("package_price", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="subscriptions", to="catalog.packageprice")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscriptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
