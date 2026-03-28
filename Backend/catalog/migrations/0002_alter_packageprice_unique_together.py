from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="packageprice",
            unique_together={("package", "billing_period", "currency")},
        ),
    ]
