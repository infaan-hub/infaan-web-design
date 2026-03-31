from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0005_subscription_lifecycle_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="service",
            name="category",
            field=models.CharField(
                choices=[
                    ("logo_poster", "Logo & Poster Design"),
                    ("website", "Website Developing and Design"),
                    ("system_subscription", "System Developing and Subscription Service"),
                    ("digital_ads", "Digital Ads"),
                    ("maintenance", "Maintenance & Fix Web System"),
                ],
                max_length=30,
            ),
        ),
    ]
