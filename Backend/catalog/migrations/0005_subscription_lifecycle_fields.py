from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0004_portfolioitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscription",
            name="auto_renew",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="subscription",
            name="end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="subscription",
            name="grace_period_days",
            field=models.PositiveIntegerField(default=3),
        ),
        migrations.AddField(
            model_name="subscription",
            name="next_billing_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("active", "Active"),
                    ("completed", "Completed"),
                    ("expired", "Expired"),
                    ("suspended", "Suspended"),
                    ("grace_period", "Grace Period"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
