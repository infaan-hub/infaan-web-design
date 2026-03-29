from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import CustomUser
from catalog.models import PackagePrice, Service, ServicePackage


class Command(BaseCommand):
    help = "Seed initial Infaan Web and Design services, packages, and an admin user."

    def handle(self, *args, **options):
        services_data = [
            {
                "name": "Website Developing and Design",
                "category": Service.Category.WEBSITE,
                "short_description": "Business websites and web application systems for growing brands.",
                "details": "Silver covers ordinary hosting, Gold covers full hosting, and Premium covers web applications with hosting, database, and fixing.",
                "packages": [
                    {
                        "tier": ServicePackage.Tier.SILVER,
                        "title": "Silver Web Services",
                        "description": "A starter business website package with ordinary hosting.",
                        "payment_notes": "1 year payment",
                        "features": ["1 business website", "Ordinary hosting", "1 year payment"],
                        "prices": [("weekly", Decimal("45.00")), ("monthly", Decimal("150.00")), ("yearly", Decimal("1200.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.GOLD,
                        "title": "Gold Web Services",
                        "description": "A business website package with full hosting included.",
                        "payment_notes": "1 year payment",
                        "features": ["1 business website", "Full hosting", "1 year payment"],
                        "prices": [("weekly", Decimal("65.00")), ("monthly", Decimal("220.00")), ("yearly", Decimal("1800.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.PREMIUM,
                        "title": "Premium Web Services",
                        "description": "A full web application system with premium infrastructure support.",
                        "payment_notes": "Full hosting, database and fixing",
                        "features": ["1 web application system", "Full hosting", "Database setup", "Fixing support"],
                        "prices": [("weekly", Decimal("120.00")), ("monthly", Decimal("400.00")), ("yearly", Decimal("3200.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.EXTRA,
                        "title": "Web Maintenance Package",
                        "description": "Fixing and maintenance for an existing web system.",
                        "payment_notes": "Payment per task",
                        "features": ["Fixing existing system", "Maintenance support", "Paid per task"],
                        "prices": [("per_task", Decimal("80.00"))],
                    },
                ],
            },
            {
                "name": "Logo & Poster Design",
                "category": Service.Category.LOGO_POSTER,
                "short_description": "Design packages for branding, posters, and print-ready assets.",
                "details": "Silver focuses on design only, Gold adds printing, and Premium adds branding.",
                "packages": [
                    {
                        "tier": ServicePackage.Tier.SILVER,
                        "title": "Silver Logo & Poster Package",
                        "description": "Logo and poster design only.",
                        "payment_notes": "Design only",
                        "features": ["1 logo design", "1 poster design"],
                        "prices": [("weekly", Decimal("25.00")), ("monthly", Decimal("90.00")), ("yearly", Decimal("700.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.GOLD,
                        "title": "Gold Logo & Poster Package",
                        "description": "Design plus printing support.",
                        "payment_notes": "Includes printing",
                        "features": ["1 logo design", "1 poster design", "Printing"],
                        "prices": [("weekly", Decimal("40.00")), ("monthly", Decimal("130.00")), ("yearly", Decimal("980.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.PREMIUM,
                        "title": "Premium Logo & Poster Package",
                        "description": "Branding-ready design package with print support.",
                        "payment_notes": "Printing and branding included",
                        "features": ["1 logo design", "1 poster design", "Printing", "Branding"],
                        "prices": [("weekly", Decimal("55.00")), ("monthly", Decimal("180.00")), ("yearly", Decimal("1350.00"))],
                    },
                ],
            },
            {
                "name": "Digital Ads",
                "category": Service.Category.DIGITAL_ADS,
                "short_description": "Google Ads setup and maintenance packages for campaigns.",
                "details": "Silver excludes billing, Gold adds ad maintenance, and Premium includes billing plus maintenance.",
                "packages": [
                    {
                        "tier": ServicePackage.Tier.SILVER,
                        "title": "Silver Digital Ads Services",
                        "description": "Basic Google Ads setup without billing management.",
                        "payment_notes": "No billing",
                        "features": ["1 Google Ads setup", "No billing"],
                        "prices": [("weekly", Decimal("30.00")), ("monthly", Decimal("110.00")), ("yearly", Decimal("840.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.GOLD,
                        "title": "Gold Digital Ads Services",
                        "description": "Google Ads setup with maintenance support and no billing.",
                        "payment_notes": "No billing, maintenance included",
                        "features": ["1 Google Ads setup", "Ads maintenance", "No billing"],
                        "prices": [("weekly", Decimal("45.00")), ("monthly", Decimal("160.00")), ("yearly", Decimal("1200.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.PREMIUM,
                        "title": "Premium Digital Ads Services",
                        "description": "Managed Google Ads including billing and maintenance service.",
                        "payment_notes": "Billing and maintenance included",
                        "features": ["1 Google Ads setup", "Billing support", "Maintenance service"],
                        "prices": [("weekly", Decimal("65.00")), ("monthly", Decimal("230.00")), ("yearly", Decimal("1750.00"))],
                    },
                    {
                        "tier": ServicePackage.Tier.EXTRA,
                        "title": "Digital Ads Maintenance Package",
                        "description": "Fixing existing ad campaigns paid per task.",
                        "payment_notes": "Payment per task",
                        "features": ["Fixing existing ads", "Paid per task"],
                        "prices": [("per_task", Decimal("60.00"))],
                    },
                ],
            },
            {
                "name": "Maintenance & Fix Web System",
                "category": Service.Category.MAINTENANCE,
                "short_description": "Repair and maintenance service for existing web systems.",
                "details": "Task-based support for fixing current websites or web systems.",
                "packages": [
                    {
                        "tier": ServicePackage.Tier.EXTRA,
                        "title": "System Maintenance Package",
                        "description": "Fixing the existing system with task-based pricing.",
                        "payment_notes": "Payment per task",
                        "features": ["Fixing existing system", "Maintenance support", "Paid per task"],
                        "prices": [("per_task", Decimal("90.00"))],
                    }
                ],
            },
        ]

        for service_data in services_data:
            packages_data = service_data.pop("packages")
            service, _ = Service.objects.update_or_create(name=service_data["name"], defaults=service_data)
            for package_data in packages_data:
                prices = package_data.pop("prices")
                package, _ = ServicePackage.objects.update_or_create(
                    service=service,
                    tier=package_data["tier"],
                    defaults=package_data,
                )
                for billing_period, amount in prices:
                    existing_prices = PackagePrice.objects.filter(
                        package=package,
                        billing_period=billing_period,
                        currency="USD",
                    ).order_by("id")

                    seeded_price = existing_prices.first()
                    if seeded_price:
                        seeded_price.amount = amount
                        seeded_price.is_default = billing_period in {"monthly", "per_task"}
                        seeded_price.save(update_fields=["amount", "is_default", "updated_at"])
                        existing_prices.exclude(id=seeded_price.id).delete()
                    else:
                        PackagePrice.objects.create(
                            package=package,
                            billing_period=billing_period,
                            amount=amount,
                            currency="USD",
                            is_default=billing_period in {"monthly", "per_task"},
                        )

        if not CustomUser.objects.filter(username="admin").exists():
            CustomUser.objects.create_superuser(
                username="admin",
                email="admin@infaan.com",
                password="Admin12345!",
                role=CustomUser.Role.ADMIN,
            )

        self.stdout.write(self.style.SUCCESS("Infaan Web and Design data seeded successfully."))
