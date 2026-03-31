from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0006_alter_service_category"),
    ]

    operations = [
        migrations.CreateModel(
            name="SubscriptionSystem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=150)),
                ("summary", models.CharField(max_length=255)),
                ("details", models.TextField(blank=True)),
                ("cover_image", models.TextField()),
                ("gallery_images", models.JSONField(blank=True, default=list)),
                ("is_active", models.BooleanField(default=True)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subscription_systems", to="catalog.service")),
            ],
            options={
                "ordering": ["service__name", "name"],
            },
        ),
        migrations.AddField(
            model_name="subscription",
            name="subscription_system",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="subscriptions", to="catalog.subscriptionsystem"),
        ),
    ]
