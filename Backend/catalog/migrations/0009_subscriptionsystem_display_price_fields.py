from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0008_subscriptionsystem_system_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionsystem",
            name="display_price",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="subscriptionsystem",
            name="display_price_currency",
            field=models.CharField(default="USD", max_length=10),
        ),
    ]
