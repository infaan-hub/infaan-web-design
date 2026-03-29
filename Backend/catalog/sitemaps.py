from django.contrib.sitemaps import Sitemap
from django.urls import reverse

from .models import PortfolioItem, Service, ServicePackage


class StaticViewSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return [
            "home",
            "portfolio",
            "package",
            "login",
            "register",
        ]

    def location(self, item):
        return reverse(item)


class ServiceSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.7

    def items(self):
        return Service.objects.filter(is_active=True).order_by("id")

    def location(self, item):
        return f"/services/{item.id}/"

    def lastmod(self, item):
        return item.updated_at


class PackageSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.9

    def items(self):
        return ServicePackage.objects.filter(is_active=True, service__is_active=True).select_related("service").order_by("id")

    def location(self, item):
        return f"/package?service={item.service_id}&package={item.id}"

    def lastmod(self, item):
        return item.updated_at


class PortfolioSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.6

    def items(self):
        return PortfolioItem.objects.filter(is_active=True, service__is_active=True, package__is_active=True).select_related(
            "service", "package"
        ).order_by("id")

    def location(self, item):
        return f"/potfolio?service={item.service_id}&item={item.id}"

    def lastmod(self, item):
        return item.updated_at
