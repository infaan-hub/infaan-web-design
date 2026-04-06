import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "./components/AppLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminSubscriptionPage from "./pages/AdminSubscriptionPage";
import AdminSystemControlPage from "./pages/AdminSystemControlPage";
import BillingPage from "./pages/BillingPage";
import BookingPage from "./pages/BookingPage";
import BookedServicePage from "./pages/BookedServicePage";
import BookingsServicesPage from "./pages/BookingsServicesPage";
import BookingHistoryPage from "./pages/BookingHistoryPage";
import DashboardPage from "./pages/DashboardPage";
import BillingHistoryPage from "./pages/BillingHistoryPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PackagePage from "./pages/PackagePage";
import PackageTimePage from "./pages/PackageTimePage";
import PortfolioPage from "./pages/PortfolioPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SystemSubscriptionPage from "./pages/SystemSubscriptionPage";
import SystemSubscriptionTimePage from "./pages/SystemSubscriptionTimePage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://infaan-web-design.onrender.com/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const CUSTOMER_PROTECTED_PATHS = ["/dashboard", "/profile", "/subscription", "/package", "/package-time", "/system-subscription-time", "/billing", "/booking", "/billing-history"];
const ADMIN_PROTECTED_PATHS = ["/admin-dashboard", "/admin/users", "/admin-subscription", "/system-control", "/bookings-services", "/booked-service", "/booking-history"];

const emptySubscription = {
  business_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  start_date: "",
};
const emptyLogin = { username: "", password: "" };
const emptyRegister = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
};
const emptyAdminUser = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  role: "customer",
  is_active: true,
};
const emptyService = {
  name: "",
  category: "website",
  short_description: "",
  details: "",
  is_active: true,
};
const emptyPackage = {
  service: "",
  tier: "silver",
  title: "",
  description: "",
  features: "",
  payment_notes: "",
  prices: [
    { billing_period: "weekly", tzs_amount: "" },
    { billing_period: "monthly", tzs_amount: "" },
    { billing_period: "yearly", tzs_amount: "" },
    { billing_period: "per_task", tzs_amount: "" },
  ],
  is_active: true,
};
const emptyPayment = {
  method: "card",
  card_name: "",
  card_number: "",
  expiry_date: "",
  cvv: "",
  phone_number: "",
};
const emptyPortfolio = {
  name: "",
  image_data: "",
  is_active: true,
};
const emptySystem = {
  service: "",
  name: "",
  summary: "",
  details: "",
  system_url: "",
  admin_url: "",
  display_price: "",
  display_price_currency: "TZS",
  cover_image: "",
  gallery_images: ["", "", "", "", ""],
  is_active: true,
};

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function readStoredJson(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }
    const parsedValue = JSON.parse(rawValue);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsedValue) ? parsedValue : fallback;
    }
    return parsedValue ?? fallback;
  } catch {
    return fallback;
  }
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function setStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function setStoredJson(key, value) {
  return setStoredValue(key, JSON.stringify(value));
}

function formatPrice(amount, currency = "TZS") {
  if (amount === null || amount === undefined || amount === "") {
    return `${currency} 0`;
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return `${currency} ${amount}`;
  }

  const needsDecimals = !Number.isInteger(numericAmount);
  return `${currency} ${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: needsDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("infaan_theme") || "light");
  const [postLoginPath, setPostLoginPath] = useState(localStorage.getItem("infaan_post_login_path") || "");
  const [token, setToken] = useState(localStorage.getItem("infaan_token") || "");
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("infaan_refresh_token") || "");
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("infaan_user") || "null"));
  const [services, setServices] = useState(() => readStoredJson("infaan_services", []));
  const [packages, setPackages] = useState(() => readStoredJson("infaan_packages", []));
  const [prices, setPrices] = useState(() => readStoredJson("infaan_prices", []));
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [subscriptionSystems, setSubscriptionSystems] = useState([]);
  const [subscriptionSystemsError, setSubscriptionSystemsError] = useState("");
  const [subscriptions, setSubscriptions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tenantServices, setTenantServices] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(localStorage.getItem("infaan_selected_booking") || "");
  const [selectedSystemId, setSelectedSystemId] = useState(localStorage.getItem("infaan_selected_system") || "");
  const [selectedPortfolioServiceId, setSelectedPortfolioServiceId] = useState(
    localStorage.getItem("infaan_selected_portfolio_service") || ""
  );
  const [users, setUsers] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(localStorage.getItem("infaan_selected_package") || "");
  const [selectedPriceId, setSelectedPriceId] = useState(localStorage.getItem("infaan_selected_price") || "");
  const [systemSubscriptionPlan, setSystemSubscriptionPlan] = useState(
    JSON.parse(localStorage.getItem("infaan_system_subscription_plan") || "null")
  );
  const [pendingPayment, setPendingPayment] = useState(JSON.parse(localStorage.getItem("infaan_payment") || "null"));
  const [bookingSent, setBookingSent] = useState(false);
  const [lastBooking, setLastBooking] = useState(JSON.parse(localStorage.getItem("infaan_last_booking") || "null"));
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [adminRegisterForm, setAdminRegisterForm] = useState({ ...emptyAdminUser, role: "admin" });
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscription);
  const [adminUserForm, setAdminUserForm] = useState(emptyAdminUser);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolio);
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [systemForm, setSystemForm] = useState(emptySystem);
  const [editingSystemId, setEditingSystemId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const catalogRequestIdRef = useRef(0);

  useEffect(() => {
    localStorage.removeItem("infaan_portfolio_items");
    localStorage.removeItem("infaan_subscription_systems");
    localStorage.removeItem("infaan_email_otp_verification");
    if (window.location.pathname === "/") {
      navigate("/home", true);
    }
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setStoredValue("infaan_selected_package", selectedPackageId || "");
  }, [selectedPackageId]);

  useEffect(() => {
    setStoredValue("infaan_selected_price", selectedPriceId || "");
  }, [selectedPriceId]);

  useEffect(() => {
    if (systemSubscriptionPlan) {
      setStoredJson("infaan_system_subscription_plan", systemSubscriptionPlan);
    } else {
      localStorage.removeItem("infaan_system_subscription_plan");
    }
  }, [systemSubscriptionPlan]);

  useEffect(() => {
    setStoredValue("infaan_selected_booking", selectedBookingId || "");
  }, [selectedBookingId]);

  useEffect(() => {
    setStoredValue("infaan_selected_system", selectedSystemId || "");
  }, [selectedSystemId]);

  useEffect(() => {
    setStoredValue("infaan_selected_portfolio_service", selectedPortfolioServiceId || "");
  }, [selectedPortfolioServiceId]);

  useEffect(() => {
    if (pendingPayment) {
      setStoredJson("infaan_payment", pendingPayment);
    } else {
      localStorage.removeItem("infaan_payment");
    }
  }, [pendingPayment]);

  useEffect(() => {
    if (lastBooking) {
      setStoredJson("infaan_last_booking", lastBooking);
    } else {
      localStorage.removeItem("infaan_last_booking");
    }
  }, [lastBooking]);

  useEffect(() => {
    if (postLoginPath) {
      setStoredValue("infaan_post_login_path", postLoginPath);
    } else {
      localStorage.removeItem("infaan_post_login_path");
    }
  }, [postLoginPath]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    setStoredValue("infaan_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (refreshToken) {
      setStoredValue("infaan_refresh_token", refreshToken);
    } else {
      localStorage.removeItem("infaan_refresh_token");
    }
  }, [refreshToken]);

  function navigate(nextPath, replace = false) {
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
    setPath(nextPath);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function clearAuthState() {
    setToken("");
    setRefreshToken("");
    localStorage.removeItem("infaan_token");
    localStorage.removeItem("infaan_refresh_token");
    localStorage.removeItem("infaan_user");
    setCurrentUser(null);
    setSubscriptions([]);
    setTenants([]);
    setTenantServices([]);
    setUsers([]);
  }

  async function parseApiResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data.detail ||
        data.non_field_errors?.[0] ||
        Object.values(data).flat().join(" ") ||
        "Request failed.";
      throw new Error(message);
    }
    return data;
  }

  async function refreshAccessToken(activeRefreshToken = refreshToken) {
    if (!activeRefreshToken) {
      throw new Error("Your session has expired. Please login again.");
    }

    const response = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: activeRefreshToken }),
    });
    const data = await parseApiResponse(response);
    setToken(data.access);
    setStoredValue("infaan_token", data.access);
    return data.access;
  }

  async function apiRequest(pathname, options = {}, allowRetry = true) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_BASE}${pathname}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && allowRetry && refreshToken) {
      try {
        const nextAccessToken = await refreshAccessToken(refreshToken);
        return apiRequest(
          pathname,
          {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${nextAccessToken}`,
            },
          },
          false
        );
      } catch (requestError) {
        clearAuthState();
        throw requestError;
      }
    }

    return parseApiResponse(response);
  }

  async function loadCatalog() {
    const requestId = catalogRequestIdRef.current + 1;
    catalogRequestIdRef.current = requestId;

    const servicesRequest = apiRequest("/services/");
    const packagesRequest = apiRequest("/packages/");
    const pricesRequest = apiRequest("/prices/");
    const portfolioRequest = apiRequest("/portfolio-items/");
    const systemsRequest = apiRequest("/subscription-systems/");

    portfolioRequest
      .then((portfolioData) => {
        if (catalogRequestIdRef.current !== requestId) return;
        const nextPortfolioItems = ensureArray(portfolioData.results || portfolioData);
        setPortfolioItems(nextPortfolioItems);
      })
      .catch(() => {
        if (catalogRequestIdRef.current !== requestId) return;
        setPortfolioItems([]);
      });

    systemsRequest
      .then((systemData) => {
        if (catalogRequestIdRef.current !== requestId) return;
        const nextSystems = ensureArray(systemData.results || systemData);
        setSubscriptionSystemsError("");
        setSubscriptionSystems(nextSystems);
      })
      .catch((requestError) => {
        if (catalogRequestIdRef.current !== requestId) return;
        setSubscriptionSystems([]);
        setSubscriptionSystemsError(requestError?.message || "Unable to load system subscriptions.");
      });

    servicesRequest
      .then((serviceData) => {
        if (catalogRequestIdRef.current !== requestId) return;
        const nextServices = ensureArray(serviceData.results || serviceData);
        setServices(nextServices);
        setStoredJson("infaan_services", nextServices);
      })
      .catch(() => {
        if (catalogRequestIdRef.current !== requestId) return;
        setServices([]);
        localStorage.removeItem("infaan_services");
      });

    packagesRequest
      .then((packageData) => {
        if (catalogRequestIdRef.current !== requestId) return;
        const nextPackages = ensureArray(packageData.results || packageData);
        setPackages(nextPackages);
        setStoredJson("infaan_packages", nextPackages);
      })
      .catch(() => {
        if (catalogRequestIdRef.current !== requestId) return;
        setPackages([]);
        localStorage.removeItem("infaan_packages");
      });

    pricesRequest
      .then((priceData) => {
        if (catalogRequestIdRef.current !== requestId) return;
        const nextPrices = ensureArray(priceData.results || priceData);
        setPrices(nextPrices);
        setStoredJson("infaan_prices", nextPrices);
      })
      .catch(() => {
        if (catalogRequestIdRef.current !== requestId) return;
        setPrices([]);
        localStorage.removeItem("infaan_prices");
      });

    await Promise.allSettled([servicesRequest, packagesRequest, pricesRequest, portfolioRequest, systemsRequest]);
  }

  async function loadProfileAndSubscriptions() {
    if (!token) return;

    const [profileData, subscriptionData, packageOrderData, systemOrderData] = await Promise.all([
      apiRequest("/auth/me/"),
      apiRequest("/subscriptions/"),
      apiRequest("/package-subscription-orders/"),
      apiRequest("/system-subscription-orders/"),
    ]);
    if (profileData?.id) {
      setCurrentUser(profileData);
      setStoredJson("infaan_user", profileData);
    }
    const standardSubscriptions = subscriptionData.results || subscriptionData || [];
    const packageOrders = packageOrderData.results || packageOrderData || [];
    const systemOrders = systemOrderData.results || systemOrderData || [];
    setSubscriptions(
      [...standardSubscriptions, ...packageOrders, ...systemOrders].sort(
        (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
      )
    );
  }

  async function loadUsers() {
    const data = await apiRequest("/users/");
    setUsers(data.results || data);
  }

  async function loadSystemControl() {
    const [tenantData, tenantServiceData] = await Promise.all([apiRequest("/tenants/"), apiRequest("/tenant-services/")]);
    setTenants(tenantData.results || tenantData || []);
    setTenantServices(tenantServiceData.results || tenantServiceData || []);
  }

  useEffect(() => {
    loadCatalog().catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (token) {
      setStoredValue("infaan_token", token);
      loadProfileAndSubscriptions().catch((requestError) => {
        clearAuthState();
        setError(requestError.message || "Unable to load account data.");
      });
    } else {
      localStorage.removeItem("infaan_token");
      localStorage.removeItem("infaan_user");
      setCurrentUser(null);
      setSubscriptions([]);
      setUsers([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token || currentUser?.role !== "admin") return;
    loadCatalog().catch((requestError) => setError(requestError.message));
  }, [token, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role === "admin" && ["/admin-dashboard", "/admin/users", "/bookings-services", "/system-control"].includes(path)) {
      loadUsers().catch((requestError) => setError(requestError.message));
    }
  }, [path, currentUser]);

  useEffect(() => {
    if (currentUser?.role === "admin" && ["/admin-dashboard", "/admin-subscription", "/bookings-services", "/booking-history", "/system-control"].includes(path)) {
      loadProfileAndSubscriptions().catch((requestError) => setError(requestError.message));
    }
  }, [path, currentUser]);

  useEffect(() => {
    if (currentUser?.role === "admin" && ["/admin-dashboard", "/system-control", "/admin-subscription"].includes(path)) {
      loadSystemControl().catch((requestError) => setError(requestError.message));
    }
  }, [path, currentUser]);

  useEffect(() => {
    if (ADMIN_PROTECTED_PATHS.includes(path)) {
      if (!currentUser) {
        setPostLoginPath(path);
        setFeedback("Please login to access admin functions.");
        navigate("/admin/login", true);
        return;
      }
      if (currentUser.role !== "admin") {
        setError("Admin access only.");
        navigate("/dashboard", true);
      }
      return;
    }

    if (CUSTOMER_PROTECTED_PATHS.includes(path)) {
      if (!currentUser) {
        setPostLoginPath(path);
        setFeedback("Please login to access your account.");
        navigate("/login", true);
        return;
      }
      if (currentUser.role !== "customer") {
        setFeedback("Please use the admin area for admin functions.");
        navigate("/admin-dashboard", true);
      }
      return;
    }

    if (currentUser?.role === "customer" && ["/login", "/register"].includes(path)) {
      navigate("/dashboard", true);
      return;
    }

    if (currentUser?.role === "admin" && ["/admin/login", "/admin/register"].includes(path)) {
      navigate("/admin-dashboard", true);
    }
  }, [path, currentUser]);

  const groupedPackages = useMemo(
    () =>
      services.map((service) => ({
        ...service,
        packages: packages.filter((pkg) => pkg.service === service.id && pkg.is_active),
      })),
    [services, packages]
  );
  const groupedPortfolio = useMemo(
    () => portfolioItems.filter((item) => item.is_active),
    [portfolioItems]
  );

  const selectedPackage = packages.find((pkg) => String(pkg.id) === String(selectedPackageId) && pkg.is_active);
  const selectedPrice = prices.find((price) => String(price.id) === String(selectedPriceId));
  const selectedService = services.find((service) => service.id === selectedPackage?.service) || null;
  const selectedSystem = subscriptionSystems.find((system) => String(system.id) === String(selectedSystemId)) || null;
  const selectedBooking = subscriptions.find((booking) => String(booking.id) === String(selectedBookingId)) || null;
  const selectedPortfolioService =
    services.find((service) => String(service.id) === String(selectedPortfolioServiceId)) || null;
  const activeSystemPlan =
    systemSubscriptionPlan &&
    String(systemSubscriptionPlan.package_id || "") === String(selectedPackageId || "") &&
    String(systemSubscriptionPlan.system_id || "") === String(selectedSystemId || "")
      ? systemSubscriptionPlan
      : null;
  const resolvedSelectedPrice = activeSystemPlan || selectedPrice || getPreferredPrice(selectedPackage);

  function requireLogin(nextPath) {
    if (!currentUser) {
      setPostLoginPath(nextPath);
      setFeedback("Please login first to continue with a subscription.");
      navigate("/login");
      return false;
    }
    navigate(nextPath);
    return true;
  }

  function updateField(setter, field, value) {
    setter((previous) => ({ ...previous, [field]: value }));
  }

  function getPreferredPrice(packageObject) {
    if (!packageObject?.prices?.length) return null;
    const packageService = services.find((service) => String(service.id) === String(packageObject.service));
    if (packageObject.tier === "extra" || packageService?.category === "logo_poster") {
      return packageObject.prices.find((price) => price.billing_period === "per_task") || packageObject.prices[0];
    }
    return packageObject.prices.find((price) => price.billing_period === "monthly") || packageObject.prices[0];
  }

  function isFixedPricePackage(packageObject) {
    if (!packageObject) return false;
    const packageService = services.find((service) => String(service.id) === String(packageObject.service));
    return packageObject.tier === "extra" || packageService?.category === "logo_poster";
  }

  function clearSystemSubscriptionPlan() {
    setSystemSubscriptionPlan(null);
  }

  function getSystemBasePackage(systemObject) {
    if (!systemObject?.packages?.length) return null;
    return (
      systemObject.packages.find((pkg) =>
        (pkg.prices || []).some((price) => ["monthly", "yearly"].includes(price.billing_period))
      ) ||
      systemObject.packages.find((pkg) => pkg.tier !== "extra") ||
      systemObject.packages[0]
    );
  }

  function getSystemBasePrice(systemObject, billingPeriod) {
    const basePackage = getSystemBasePackage(systemObject);
    if (!basePackage?.prices?.length) return null;
    return (
      basePackage.prices.find((price) => price.billing_period === billingPeriod) ||
      (billingPeriod === "monthly" ? getPreferredPrice(basePackage) : null)
    );
  }

  function getSystemMonthlyAmount(systemObject) {
    if (systemObject?.display_price !== null && systemObject?.display_price !== undefined && systemObject?.display_price !== "") {
      return Number(systemObject.display_price);
    }
    const monthlyPrice = getSystemBasePrice(systemObject, "monthly");
    return Number(monthlyPrice?.amount || 0);
  }

  function getSystemPlanPreview(systemObject, billingPeriod) {
    const basePackage = getSystemBasePackage(systemObject);
    const basePrice = getSystemBasePrice(systemObject, billingPeriod);
    const monthlyAmount = getSystemMonthlyAmount(systemObject);
    const currency = systemObject?.display_price_currency || basePrice?.currency || "TZS";
    const amount = billingPeriod === "yearly" ? monthlyAmount * 12 : monthlyAmount;
    if (!basePackage || !basePrice || !amount) return null;
    return {
      id: basePrice.id,
      base_price_id: basePrice.id,
      package_id: String(basePackage.id),
      system_id: String(systemObject.id),
      billing_period: billingPeriod,
      amount,
      currency,
      title: `${systemObject.name} subscription`,
      description:
        billingPeriod === "yearly"
          ? "Yearly system subscription billed as 12 monthly cycles."
          : "Monthly system subscription access.",
    };
  }

  function selectPackage(packageId, systemId = "") {
    const packageMatch = packages.find((pkg) => String(pkg.id) === String(packageId));
    const systemMatch = subscriptionSystems.find((system) => String(system.id) === String(systemId));
    clearSystemSubscriptionPlan();
    setSelectedPackageId(String(packageId));
    setSelectedPriceId(packageMatch ? String(getPreferredPrice(packageMatch)?.id || "") : "");
    setSelectedSystemId(systemId ? String(systemId) : "");
    setPendingPayment(null);
    setBookingSent(false);
    setLastBooking(null);
    if (!packageMatch) {
      return;
    }
    setSubscriptionForm((previous) => ({
      ...previous,
      business_name: previous.business_name || systemMatch?.name || packageMatch.title,
    }));
  }

  function selectPortfolioService(serviceId) {
    setSelectedPortfolioServiceId(String(serviceId));
    navigate("/potfolio");
  }

  function selectSystem(systemId) {
    if (String(systemId || "") !== String(selectedSystemId || "")) {
      clearSystemSubscriptionPlan();
    }
    setSelectedSystemId(String(systemId || ""));
  }

  function beginSystemSubscription(systemId) {
    const systemMatch = subscriptionSystems.find((system) => String(system.id) === String(systemId));
    const basePackage = getSystemBasePackage(systemMatch);
    if (!systemMatch || !basePackage) {
      setError("This system subscription is not ready yet.");
      return false;
    }
    if (!requireLogin("/system-subscription")) {
      return false;
    }
    selectPackage(basePackage.id, systemId);
    setSelectedPriceId("");
    setSelectedSystemId(String(systemId));
    clearSystemSubscriptionPlan();
    navigate("/system-subscription-time");
    return true;
  }

  function selectSystemSubscriptionPlan(billingPeriod) {
    if (!selectedSystem) {
      setError("Select a system first.");
      navigate("/system-subscription");
      return false;
    }
    const basePackage = getSystemBasePackage(selectedSystem);
    const plan = getSystemPlanPreview(selectedSystem, billingPeriod);
    if (!basePackage || !plan) {
      setError("This billing option is not available for the selected system.");
      return false;
    }
    setSelectedPackageId(String(basePackage.id));
    setSelectedPriceId(String(plan.base_price_id));
    setSystemSubscriptionPlan(plan);
    navigate("/billing");
    return true;
  }

  function continueToPackageTime(packageId, systemId = "") {
    if (!requireLogin("/package")) {
      return;
    }
    const packageMatch = packages.find((pkg) => String(pkg.id) === String(packageId));
    selectPackage(packageId, systemId);
    if (isFixedPricePackage(packageMatch)) {
      const preferredPrice = getPreferredPrice(packageMatch);
      if (preferredPrice) {
        setSelectedPriceId(String(preferredPrice.id));
      }
      navigate("/billing");
      return;
    }
    navigate("/package-time");
  }

  function continueToBilling() {
    if (!selectedPackage) {
      setError("Select a package first.");
      navigate(selectedSystem ? "/system-subscription" : "/package");
      return false;
    }
    if (isFixedPricePackage(selectedPackage)) {
      const preferredPrice = getPreferredPrice(selectedPackage);
      if (preferredPrice) {
        setSelectedPriceId(String(preferredPrice.id));
      }
      navigate("/billing");
      return true;
    }
    if (!selectedPriceId && !resolvedSelectedPrice) {
      setError(selectedSystem ? "Select monthly or yearly system subscription time first." : "Select weekly, monthly, or yearly package time first.");
      return false;
    }
    if (!selectedPriceId && resolvedSelectedPrice?.id) {
      setSelectedPriceId(String(resolvedSelectedPrice.id));
    }
    navigate("/billing");
    return true;
  }

  function confirmPayment() {
    if (!selectedPackage) {
      setError("Select a package first.");
      navigate(selectedSystem ? "/system-subscription" : "/package");
      return false;
    }

    if (!selectedPriceId && !resolvedSelectedPrice) {
      setError("Select package time first.");
      navigate(selectedSystem ? "/system-subscription-time" : "/package-time");
      return false;
    }
    const activePrice = selectedPrice || resolvedSelectedPrice;
    if (!selectedPriceId && activePrice?.id) {
      setSelectedPriceId(String(activePrice.id));
    }

    const normalizedBusinessName = String(subscriptionForm.business_name || "").trim();
    const normalizedContactEmail = String(subscriptionForm.contact_email || "").trim();
    const normalizedContactPhone = String(subscriptionForm.contact_phone || "").trim();
    const normalizedStartDate = String(subscriptionForm.start_date || "").trim();

    if (!normalizedBusinessName || !normalizedContactEmail || !normalizedContactPhone) {
      setError("Fill business name, contact email, and contact phone before continuing.");
      return false;
    }

    if (normalizedStartDate && !isIsoDate(normalizedStartDate)) {
      setError("Use a valid start date in YYYY-MM-DD format.");
      return false;
    }

    if (paymentForm.method === "mixx" && !paymentForm.phone_number) {
      setError("Enter the Mixx by Yas phone number to continue.");
      return false;
    }

    if (["card", "visa"].includes(paymentForm.method)) {
      if (!paymentForm.card_name || !paymentForm.card_number || !paymentForm.expiry_date || !paymentForm.cvv) {
        setError("Complete all card payment fields to continue.");
        return false;
      }
    }

    if (paymentForm.method === "paypal") {
      setError("Please choose Mastercard, Visa, or Mixx by Yas.");
      return false;
    }

    setPendingPayment({
      ...paymentForm,
      subtotal: activePrice?.amount || 0,
      currency: activePrice?.currency || "TZS",
      billing_period: activePrice?.billing_period || "",
      package_title: selectedSystem ? selectedSystem.name : selectedPackage.title,
      system_name: selectedSystem?.name || "",
    });
    setSubscriptionForm((previous) => ({
      ...previous,
      business_name: normalizedBusinessName,
      contact_email: normalizedContactEmail,
      contact_phone: normalizedContactPhone,
      start_date: normalizedStartDate,
    }));
    setBookingSent(false);
    setLastBooking(null);
    setError("");
    navigate("/booking");
    return true;
  }

  async function submitAuth(form, routePath, expectedRole) {
    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const data = await apiRequest(routePath, { method: "POST", body: JSON.stringify(form) }, false);
      if (expectedRole && data.user?.role !== expectedRole) {
        throw new Error(
          expectedRole === "admin"
            ? "This page is only for admin accounts."
            : "This page is only for customer accounts."
        );
      }

      setToken(data.access);
      setRefreshToken(data.refresh);
      setCurrentUser(data.user);
      setStoredJson("infaan_user", data.user);
      setFeedback("Authentication successful.");
      const nextPath = data.user.role === "admin" ? "/admin-dashboard" : postLoginPath || "/dashboard";
      setPostLoginPath("");
      navigate(nextPath);
    } catch (requestError) {
      clearAuthState();
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogleAuth(code) {
    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const data = await apiRequest(
        "/auth/google/",
        {
          method: "POST",
          headers: {
            "X-Requested-With": "XmlHttpRequest",
          },
          body: JSON.stringify({
            code,
            redirect_uri: window.location.origin,
          }),
        },
        false
      );
      setToken(data.access);
      setRefreshToken(data.refresh);
      setCurrentUser(data.user);
      setStoredJson("infaan_user", data.user);
      setFeedback("Authentication successful.");
      const nextPath = data.user.role === "admin" ? "/admin-dashboard" : postLoginPath || "/dashboard";
      setPostLoginPath("");
      navigate(nextPath);
    } catch (requestError) {
      clearAuthState();
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAdminUser() {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest("/users/", { method: "POST", body: JSON.stringify(adminUserForm) });
      setAdminUserForm(emptyAdminUser);
      await loadUsers();
      setFeedback("Customer account added successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveService() {
    setLoading(true);
    setError("");
    setFeedback("");
    const body = {
      ...serviceForm,
      name: String(serviceForm.name || "").trim(),
      short_description: String(serviceForm.short_description || "").trim(),
      details: String(serviceForm.details || "").trim(),
    };

    try {
      if (editingServiceId) {
        await apiRequest(`/services/${editingServiceId}/`, { method: "PUT", body: JSON.stringify(body) });
        setFeedback("Service updated successfully.");
      } else {
        await apiRequest("/services/", { method: "POST", body: JSON.stringify(body) });
        setFeedback("Service created successfully.");
      }
      setServiceForm(emptyService);
      setEditingServiceId(null);
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteService(serviceId) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/services/${serviceId}/`, { method: "DELETE" });
      setFeedback("Service deleted successfully.");
      if (String(editingServiceId) === String(serviceId)) {
        setServiceForm(emptyService);
        setEditingServiceId(null);
      }
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(userId, userData) {
    setLoading(true);
    setError("");
    setFeedback("");
    const body = {
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      phone_number: userData.phone_number,
      role: userData.role,
      is_active: userData.is_active,
    };
    if (userData.password) {
      body.password = userData.password;
    }

    try {
      await apiRequest(`/users/${userId}/`, { method: "PATCH", body: JSON.stringify(body) });
      await loadUsers();
      setFeedback("User updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(userId) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/users/${userId}/`, { method: "DELETE" });
      await loadUsers();
      setFeedback("User deleted successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePackage() {
    setLoading(true);
    setError("");
    setFeedback("");
    const selectedPackageService = services.find((service) => String(service.id) === String(packageForm.service));
    if (!selectedPackageService) {
      setError("Select a valid service before saving the package.");
      setLoading(false);
      return;
    }

    const packageEndpoint = selectedPackageService?.category === "logo_poster" ? "/logo-poster-packages/" : "/packages/";
    const allowedBillingPeriods =
      selectedPackageService?.category === "logo_poster" ? new Set(["per_task"]) : null;
    const pricesPayload = (packageForm.prices || []).flatMap((price) => {
      if (allowedBillingPeriods && !allowedBillingPeriods.has(price.billing_period)) {
        return [];
      }
      const rows = [];
      const normalizedTzsAmount =
        price.tzs_amount === "" || price.tzs_amount === null || price.tzs_amount === undefined
          ? ""
          : String(price.tzs_amount).trim();
      if (normalizedTzsAmount !== "") {
        rows.push({
          billing_period: price.billing_period,
          amount: normalizedTzsAmount,
          currency: "TZS",
          is_default: true,
        });
      }
      return rows;
    });

    if (!pricesPayload.length) {
      const message =
        selectedPackageService.category === "logo_poster"
          ? "Logo & Poster packages require at least one per-task price."
          : "Add at least one package price before saving.";
      setError(message);
      setLoading(false);
      return;
    }

    const body = {
      ...packageForm,
      service: Number(packageForm.service),
      features: packageForm.features.split("\n").filter(Boolean),
      prices: pricesPayload,
    };
    try {
      if (editingPackageId) {
        await apiRequest(`${packageEndpoint}${editingPackageId}/`, { method: "PUT", body: JSON.stringify(body) });
        setFeedback("Package updated successfully.");
      } else {
        await apiRequest(packageEndpoint, { method: "POST", body: JSON.stringify(body) });
        setFeedback("Package created successfully.");
      }
      setPackageForm(emptyPackage);
      setEditingPackageId(null);
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePackage(packageId, serviceCategory = "") {
    setLoading(true);
    setError("");
    setFeedback("");
    const packageEndpoint = serviceCategory === "logo_poster" ? "/logo-poster-packages/" : "/packages/";
    try {
      await apiRequest(`${packageEndpoint}${packageId}/`, { method: "DELETE" });
      setFeedback("Package deleted successfully.");
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePortfolio() {
    setLoading(true);
    setError("");
    setFeedback("");

    const body = {
      ...portfolioForm,
      name: String(portfolioForm.name || "").trim(),
      image_data: String(portfolioForm.image_data || "").trim(),
      service: null,
      package: null,
    };

    try {
      if (editingPortfolioId) {
        await apiRequest(`/portfolio-items/${editingPortfolioId}/`, { method: "PUT", body: JSON.stringify(body) });
        setFeedback("Portfolio updated successfully.");
      } else {
        await apiRequest("/portfolio-items/", { method: "POST", body: JSON.stringify(body) });
        setFeedback("Portfolio created successfully.");
      }
      setPortfolioForm(emptyPortfolio);
      setEditingPortfolioId(null);
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePortfolio(portfolioId) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/portfolio-items/${portfolioId}/`, { method: "DELETE" });
      setFeedback("Portfolio deleted successfully.");
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveSubscriptionSystem() {
    setLoading(true);
    setError("");
    setFeedback("");

    const body = {
      ...systemForm,
      service: Number(systemForm.service),
      name: String(systemForm.name || "").trim(),
      summary: String(systemForm.summary || "").trim(),
      details: String(systemForm.details || "").trim(),
      system_url: String(systemForm.system_url || "").trim(),
      admin_url: String(systemForm.admin_url || "").trim(),
      display_price:
        systemForm.display_price === "" || systemForm.display_price === null || systemForm.display_price === undefined
          ? null
          : String(systemForm.display_price).trim(),
      display_price_currency: String(systemForm.display_price_currency || "TZS").trim().toUpperCase(),
      cover_image: String(systemForm.cover_image || "").trim(),
      gallery_images: (systemForm.gallery_images || []).map((image) => String(image || "").trim()).filter(Boolean),
    };

    try {
      if (editingSystemId) {
        await apiRequest(`/subscription-systems/${editingSystemId}/`, { method: "PUT", body: JSON.stringify(body) });
        setFeedback("System subscription updated successfully.");
      } else {
        await apiRequest("/subscription-systems/", { method: "POST", body: JSON.stringify(body) });
        setFeedback("System subscription created successfully.");
      }
      setSystemForm(emptySystem);
      setEditingSystemId(null);
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubscriptionSystem(systemId) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/subscription-systems/${systemId}/`, { method: "DELETE" });
      if (String(editingSystemId) === String(systemId)) {
        setSystemForm(emptySystem);
        setEditingSystemId(null);
      }
      if (String(selectedSystemId) === String(systemId)) {
        setSelectedSystemId("");
      }
      setFeedback("System subscription deleted successfully.");
      await loadCatalog();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking() {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!selectedPriceId && !resolvedSelectedPrice) {
      setError("Select package time first.");
      navigate("/package-time");
      return;
    }
    const activePrice = selectedPrice || resolvedSelectedPrice;
    const activePriceId = selectedPriceId || String(activePrice?.id || "");
    if (!activePriceId) {
      setError("Package price is missing. Please choose the package again.");
      navigate("/package");
      return;
    }
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const normalizedBusinessName = String(subscriptionForm.business_name || "").trim();
      const normalizedContactEmail = String(subscriptionForm.contact_email || "").trim();
      const normalizedContactPhone = String(subscriptionForm.contact_phone || "").trim();
      const normalizedStartDate = String(subscriptionForm.start_date || "").trim();
      const normalizedNotes = String(subscriptionForm.notes || "").trim();

      if (!normalizedBusinessName || !normalizedContactEmail || !normalizedContactPhone) {
        setError("Fill business name, contact email, and contact phone before continuing.");
        navigate("/billing");
        return null;
      }

      if (normalizedStartDate && !isIsoDate(normalizedStartDate)) {
        setError("Use a valid start date in YYYY-MM-DD format.");
        navigate("/billing");
        return null;
      }

      const activePaymentMethod = pendingPayment?.method || paymentForm.method;
      const paymentContact =
        activePaymentMethod === "mixx"
          ? pendingPayment?.phone_number || paymentForm.phone_number
          : pendingPayment?.card_name || paymentForm.card_name || "Gateway checkout";
      const checkoutPath = selectedSystem ? "/system-subscriptions/checkout/" : "/package-subscriptions/checkout/";
      const bookingPayload = {
        business_name: normalizedBusinessName,
        contact_email: normalizedContactEmail,
        contact_phone: normalizedContactPhone,
        package_price: Number(activePriceId),
        payment_status: "paid",
        payment_method: activePaymentMethod,
        payment_contact: paymentContact,
        payment_amount: activePrice?.amount || 0,
        payment_currency: activePrice?.currency || "TZS",
        notes: `${normalizedNotes}\nSelected system: ${selectedSystem?.name || "N/A"}\nPayment method: ${activePaymentMethod}\nPayment contact: ${paymentContact}\nBilling period: ${
          activePrice?.billing_period || ""
        }\nAmount: ${
          activePrice?.currency || "TZS"
        } ${activePrice?.amount || ""}`.trim(),
      };
      if (normalizedStartDate) {
        bookingPayload.start_date = normalizedStartDate;
      }
      if (selectedSystem) {
        bookingPayload.subscription_system = Number(selectedSystem.id);
      }
      const createdBooking = await apiRequest(checkoutPath, {
        method: "POST",
        body: JSON.stringify(bookingPayload),
      });
      let hydratedBooking = createdBooking;
      if (selectedSystem) {
        hydratedBooking = await apiRequest(`/system-subscription-orders/${createdBooking.id}/`);
      } else {
        hydratedBooking = await apiRequest(`/package-subscription-orders/${createdBooking.id}/`);
      }
      setBookingSent(true);
      setLastBooking(hydratedBooking);
      setSelectedBookingId(String(hydratedBooking.id));
      setPendingPayment(null);
      setFeedback("Booking sent successfully.");
      await loadProfileAndSubscriptions();
      navigate("/booking");
      return hydratedBooking;
    } catch (requestError) {
      setError(requestError.message);
      setPendingPayment(null);
      setBookingSent(false);
      setLastBooking(null);
      if (typeof window !== "undefined") {
        window.alert("Payment failed to save to admin. Please try again later.");
      }
      navigate("/home");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function beginGoogleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google OAuth needs a VITE_GOOGLE_CLIENT_ID to go live.");
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setError("Google Sign-In is still loading. Please try again.");
      return;
    }

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: async (response) => {
        if (response.error) {
          setError(response.error);
          return;
        }
        await submitGoogleAuth(response.code);
      },
    });

    codeClient.requestCode();
  }

  function logout() {
    clearAuthState();
    setSelectedPackageId("");
    setSelectedPriceId("");
    setSelectedSystemId("");
    clearSystemSubscriptionPlan();
    setPendingPayment(null);
    setBookingSent(false);
    setLastBooking(null);
    setSelectedBookingId("");
    setFeedback("Signed out successfully.");
    navigate("/home");
  }

  function openBooking(bookingId) {
    setSelectedBookingId(String(bookingId));
    navigate("/booked-service");
  }

  function getBookingApiPath(bookingId) {
    const booking = subscriptions.find((item) => String(item.id) === String(bookingId));
    if (booking?.record_type === "system_subscription") {
      return `/system-subscription-orders/${bookingId}/`;
    }
    if (booking?.record_type === "package_subscription") {
      return `/package-subscription-orders/${bookingId}/`;
    }
    return `/subscriptions/${bookingId}/`;
  }

  async function updateBooking(bookingId, updates, successMessage) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const updatedBooking = await apiRequest(getBookingApiPath(bookingId), {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setSubscriptions((previous) =>
        previous.map((booking) => (String(booking.id) === String(bookingId) ? updatedBooking : booking))
      );
      if (String(selectedBookingId) === String(bookingId)) {
        setSelectedBookingId(String(updatedBooking.id));
      }
      setFeedback(successMessage);
      return updatedBooking;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function updateSubscription(bookingId, updates, successMessage = "Subscription updated successfully.") {
    const updated = await updateBooking(bookingId, updates, successMessage);
    if (updated && currentUser?.role === "admin") {
      loadSystemControl().catch(() => {});
    }
    return updated;
  }

  async function updateTenantService(serviceId, updates, successMessage = "Connected service updated successfully.") {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const updatedService = await apiRequest(`/tenant-services/${serviceId}/`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setTenantServices((previous) =>
        previous.map((item) => (String(item.id) === String(serviceId) ? updatedService : item))
      );
      setFeedback(successMessage);
      await loadSystemControl();
      return updatedService;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function deleteTenantService(serviceId, successMessage = "Connected service deleted successfully.") {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/tenant-services/${serviceId}/`, {
        method: "DELETE",
      });
      setTenantServices((previous) => previous.filter((item) => String(item.id) !== String(serviceId)));
      setFeedback(successMessage);
      await loadSystemControl();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function markBookingDone() {
    if (!selectedBookingId) return;
    updateBooking(selectedBookingId, { status: "completed" }, "Booking marked as done and moved to history.").then(
      (updatedBooking) => {
        if (updatedBooking) {
          navigate("/booking-history");
        }
      }
    );
  }

  function setBookingPaymentStatus(paymentStatus) {
    if (!selectedBookingId) return;
    updateBooking(
      selectedBookingId,
      {
        payment_status: paymentStatus,
        status: paymentStatus === "paid" ? "active" : "pending",
      },
      paymentStatus === "paid" ? "Payment approved and subscription activated." : "Payment marked as pending."
    );
  }

  const app = {
    path,
    navigate,
    theme,
    setTheme,
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    token,
    refreshToken,
    services,
    groupedPackages,
    groupedPortfolio,
    packages,
    prices,
    portfolioItems,
    subscriptionSystems,
    subscriptionSystemsError,
    subscriptions,
    tenants,
    tenantServices,
    users,
    selectedPackage,
    selectedPrice: resolvedSelectedPrice,
    systemSubscriptionPlan: activeSystemPlan,
    selectedService,
    selectedSystem,
    selectedSystemId,
    setSelectedSystemId,
    selectedBooking,
    selectedBookingId,
    setSelectedBookingId,
    selectedPortfolioService,
    selectedPortfolioServiceId,
    setSelectedPortfolioServiceId,
    selectedPackageId,
    setSelectedPackageId,
    selectedPriceId,
    setSelectedPriceId,
    pendingPayment,
    setPendingPayment,
    bookingSent,
    lastBooking,
    postLoginPath,
    feedback,
    error,
    loading,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    adminRegisterForm,
    setAdminRegisterForm,
    subscriptionForm,
    setSubscriptionForm,
    adminUserForm,
    setAdminUserForm,
    serviceForm,
    setServiceForm,
    editingServiceId,
    setEditingServiceId,
    packageForm,
    setPackageForm,
    editingPackageId,
    setEditingPackageId,
    portfolioForm,
    setPortfolioForm,
    editingPortfolioId,
    setEditingPortfolioId,
    systemForm,
    setSystemForm,
    editingSystemId,
    setEditingSystemId,
    paymentForm,
    setPaymentForm,
    updateField,
    selectPackage,
    selectSystem,
    continueToPackageTime,
    continueToBilling,
    beginSystemSubscription,
    selectSystemSubscriptionPlan,
    getSystemPlanPreview,
    confirmPayment,
    submitAuth,
    submitAdminUser,
    saveService,
    deleteService,
    saveUser,
    deleteUser,
    savePackage,
    deletePackage,
    savePortfolio,
    deletePortfolio,
    saveSubscriptionSystem,
    deleteSubscriptionSystem,
    submitBooking,
    openBooking,
    markBookingDone,
    setBookingPaymentStatus,
    updateSubscription,
    selectPortfolioService,
    requireLogin,
    beginGoogleLogin,
    logout,
    setFeedback,
    setError,
    loadUsers,
    loadSystemControl,
    updateTenantService,
    deleteTenantService,
    emptyLogin,
    emptyRegister,
    emptyAdminUser,
    emptyService,
    emptyPackage,
    emptyPortfolio,
    emptySystem,
    emptyPayment,
    formatPrice,
    getPreferredPrice,
    isFixedPricePackage,
  };

  const routes = {
    "/home": <HomePage app={app} />,
    "/potfolio": <PortfolioPage app={app} />,
    "/portfolio": <PortfolioPage app={app} />,
    "/login": <LoginPage app={app} />,
    "/register": <RegisterPage app={app} />,
    "/dashboard": <DashboardPage app={app} />,
    "/profile": <ProfilePage app={app} />,
    "/subscription": <SubscriptionPage app={app} />,
    "/system-subscription": <SystemSubscriptionPage app={app} />,
    "/system-subscription-time": <SystemSubscriptionTimePage app={app} />,
    "/package": <PackagePage app={app} />,
    "/package-time": <PackageTimePage app={app} />,
    "/billing": <BillingPage app={app} />,
    "/booking": <BookingPage app={app} />,
    "/billing-history": <BillingHistoryPage app={app} />,
    "/booked-service": <BookedServicePage app={app} />,
    "/booking-history": <BookingHistoryPage app={app} />,
    "/admin/login": <AdminLoginPage app={app} />,
    "/admin/register": <AdminRegisterPage app={app} />,
    "/admin-dashboard": <AdminDashboardPage app={app} />,
    "/admin/users": <AdminUsersPage app={app} />,
    "/admin-subscription": <AdminSubscriptionPage app={app} />,
    "/system-control": <AdminSystemControlPage app={app} />,
    "/bookings-services": <BookingsServicesPage app={app} />,
  };

  return <AppLayout app={app}>{routes[path] || <HomePage app={app} />}</AppLayout>;
}

export default App;
