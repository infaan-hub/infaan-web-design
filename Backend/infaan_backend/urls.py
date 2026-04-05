from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    AdminRegisterView,
    GoogleLoginView,
    LoginView,
    RegisterView,
    ResendEmailOTPView,
    UserViewSet,
    VerifyEmailOTPView,
    profile,
)
from catalog.views import (
    AdminAccessView,
    FeatureAccessView,
    HeartbeatView,
    LogoPosterPackageViewSet,
    PackageSubscriptionCheckoutView,
    PackageSubscriptionOrderViewSet,
    PortfolioItemViewSet,
    PackagePriceViewSet,
    ServicePackageViewSet,
    ServiceViewSet,
    SystemSubscriptionCheckoutView,
    SystemSubscriptionOrderViewSet,
    SubscriptionSystemViewSet,
    SubscriptionViewSet,
    SubscriptionStatusView,
    TenantServiceAdminViewSet,
    TenantServiceViewSet,
    TenantViewSet,
    LicenseValidateView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("services", ServiceViewSet, basename="service")
router.register("packages", ServicePackageViewSet, basename="package")
router.register("logo-poster-packages", LogoPosterPackageViewSet, basename="logo-poster-package")
router.register("prices", PackagePriceViewSet, basename="price")
router.register("portfolio-items", PortfolioItemViewSet, basename="portfolio-item")
router.register("subscription-systems", SubscriptionSystemViewSet, basename="subscription-system")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")
router.register("package-subscription-orders", PackageSubscriptionOrderViewSet, basename="package-subscription-order")
router.register("system-subscription-orders", SystemSubscriptionOrderViewSet, basename="system-subscription-order")
router.register("tenants", TenantViewSet, basename="tenant")
router.register("tenant-services", TenantServiceViewSet, basename="tenant-service")
router.register("tenant-service-admins", TenantServiceAdminViewSet, basename="tenant-service-admin")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/admin/register/", AdminRegisterView.as_view(), name="admin-register"),
    path("api/auth/login/", LoginView.as_view(), name="login"),
    path("api/auth/google/", GoogleLoginView.as_view(), name="google-login"),
    path("api/auth/email-otp/verify/", VerifyEmailOTPView.as_view(), name="verify-email-otp"),
    path("api/auth/email-otp/resend/", ResendEmailOTPView.as_view(), name="resend-email-otp"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", profile, name="profile"),
    path("api/license/validate/", LicenseValidateView.as_view(), name="license-validate"),
    path("api/package-subscriptions/checkout/", PackageSubscriptionCheckoutView.as_view(), name="package-subscription-checkout"),
    path("api/subscription/status/", SubscriptionStatusView.as_view(), name="subscription-status"),
    path("api/system-subscriptions/checkout/", SystemSubscriptionCheckoutView.as_view(), name="system-subscription-checkout"),
    path("api/features/", FeatureAccessView.as_view(), name="feature-access"),
    path("api/admin-access/", AdminAccessView.as_view(), name="admin-access"),
    path("api/heartbeat/", HeartbeatView.as_view(), name="heartbeat"),
    path("api/", include(router.urls)),
]
