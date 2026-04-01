from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0013_packagesubscriptionorder"),
    ]

    operations = [
        migrations.AlterField(
            model_name="portfolioitem",
            name="package",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="portfolio_items", to="catalog.servicepackage"),
        ),
        migrations.AlterField(
            model_name="portfolioitem",
            name="service",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="portfolio_items", to="catalog.service"),
        ),
        migrations.AlterModelOptions(
            name="portfolioitem",
            options={"ordering": ["name"]},
        ),
    ]
