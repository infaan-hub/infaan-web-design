from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0010_tenant_tenantservice_tenantserviceadmin_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionsystem",
            name="admin_url",
            field=models.URLField(blank=True),
        ),
    ]
