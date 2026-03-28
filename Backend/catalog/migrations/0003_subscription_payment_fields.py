from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0002_alter_packageprice_unique_together"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="payment_contact",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_amount",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_currency",
            field=models.CharField(default="USD", max_length=10),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_method",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="subscription",
            name="payment_status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("paid", "Paid")],
                default="pending",
                max_length=20,
            ),
        ),
    ]
