from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0003_subscription_payment_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="PortfolioItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=150)),
                ("image_data", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
                (
                    "package",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portfolio_items",
                        to="catalog.servicepackage",
                    ),
                ),
                (
                    "service",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="portfolio_items",
                        to="catalog.service",
                    ),
                ),
            ],
            options={
                "ordering": ["service__name", "name"],
            },
        ),
    ]
