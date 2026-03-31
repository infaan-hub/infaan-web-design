from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0007_subscriptionsystem_subscription_subscription_system"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionsystem",
            name="system_url",
            field=models.URLField(blank=True),
        ),
    ]
