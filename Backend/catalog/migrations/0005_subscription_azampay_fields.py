from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0004_portfolioitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="external_id",
            field=models.CharField(default=uuid.uuid4, editable=False, max_length=64, unique=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_callback_payload",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_reference",
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
