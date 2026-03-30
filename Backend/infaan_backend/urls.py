from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import AdminRegisterView, GoogleLoginView, LoginView, RegisterView, UserViewSet, profile
from catalog.views import PortfolioItemViewSet, PackagePriceViewSet, ServicePackageViewSet, ServiceViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("services", ServiceViewSet, basename="service")
router.register("packages", ServicePackageViewSet, basename="package")
router.register("prices", PackagePriceViewSet, basename="price")
router.register("portfolio-items", PortfolioItemViewSet, basename="portfolio-item")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/admin/register/", AdminRegisterView.as_view(), name="admin-register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/google/", GoogleLoginView.as_view(), name="google-login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", profile, name="profile"),
    path("api/", include(router.urls)),
]
