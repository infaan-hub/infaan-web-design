from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0014_make_portfolio_links_optional"),
    ]

    operations = [
        migrations.AlterField(
            model_name="packageprice",
            name="currency",
            field=models.CharField(default="TZS", max_length=10),
        ),
        migrations.AlterField(
            model_name="subscriptionsystem",
            name="display_price_currency",
            field=models.CharField(default="TZS", max_length=10),
        ),
        migrations.AlterField(
            model_name="subscription",
            name="payment_currency",
            field=models.CharField(default="TZS", max_length=10),
        ),
        migrations.AlterField(
            model_name="systemsubscriptionorder",
            name="payment_currency",
            field=models.CharField(default="TZS", max_length=10),
        ),
        migrations.AlterField(
            model_name="packagesubscriptionorder",
            name="payment_currency",
            field=models.CharField(default="TZS", max_length=10),
        ),
    ]
