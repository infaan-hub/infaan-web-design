import { useEffect, useMemo, useState } from "react";
import AppLayout from "./components/AppLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import BillingPage from "./pages/BillingPage";
import BookingPage from "./pages/BookingPage";
import BookingsServicesPage from "./pages/BookingsServicesPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PackagePage from "./pages/PackagePage";
import PackageTimePage from "./pages/PackageTimePage";
import RegisterPage from "./pages/RegisterPage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://infaan-web-design.onrender.com/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const CUSTOMER_PROTECTED_PATHS = ["/dashboard", "/package", "/package-time", "/billing", "/booking"];
const ADMIN_PROTECTED_PATHS = ["/admin-dashboard", "/admin/users", "/bookings-services"];

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
const emptyPackage = {
  service: "",
  tier: "silver",
  title: "",
  description: "",
  features: "",
  payment_notes: "",
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

function formatPrice(amount, currency = "USD") {
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
  const [token, setToken] = useState(localStorage.getItem("infaan_token") || "");
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("infaan_refresh_token") || "");
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("infaan_user") || "null"));
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [prices, setPrices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(localStorage.getItem("infaan_selected_package") || "");
  const [selectedPriceId, setSelectedPriceId] = useState(localStorage.getItem("infaan_selected_price") || "");
  const [pendingPayment, setPendingPayment] = useState(JSON.parse(localStorage.getItem("infaan_payment") || "null"));
  const [bookingSent, setBookingSent] = useState(false);
  const [lastBooking, setLastBooking] = useState(JSON.parse(localStorage.getItem("infaan_last_booking") || "null"));
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [adminRegisterForm, setAdminRegisterForm] = useState({ ...emptyAdminUser, role: "admin" });
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscription);
  const [adminUserForm, setAdminUserForm] = useState(emptyAdminUser);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.pathname === "/") {
      navigate("/home", true);
    }
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    localStorage.setItem("infaan_selected_package", selectedPackageId || "");
  }, [selectedPackageId]);

  useEffect(() => {
    localStorage.setItem("infaan_selected_price", selectedPriceId || "");
  }, [selectedPriceId]);

  useEffect(() => {
    if (pendingPayment) {
      localStorage.setItem("infaan_payment", JSON.stringify(pendingPayment));
    } else {
      localStorage.removeItem("infaan_payment");
    }
  }, [pendingPayment]);

  useEffect(() => {
    if (lastBooking) {
      localStorage.setItem("infaan_last_booking", JSON.stringify(lastBooking));
    } else {
      localStorage.removeItem("infaan_last_booking");
    }
  }, [lastBooking]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("infaan_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem("infaan_refresh_token", refreshToken);
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
    localStorage.setItem("infaan_token", data.access);
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
    const [serviceData, packageData, priceData] = await Promise.all([
      apiRequest("/services/"),
      apiRequest("/packages/"),
      apiRequest("/prices/"),
    ]);
    setServices(serviceData.results || serviceData);
    setPackages(packageData.results || packageData);
    setPrices(priceData.results || priceData);
  }

  async function loadProfileAndSubscriptions() {
    if (!token) return;

    const [profileData, subscriptionData] = await Promise.all([apiRequest("/auth/me/"), apiRequest("/subscriptions/")]);
    if (profileData?.id) {
      setCurrentUser(profileData);
      localStorage.setItem("infaan_user", JSON.stringify(profileData));
    }
    setSubscriptions(subscriptionData.results || subscriptionData || []);
  }

  async function loadUsers() {
    const data = await apiRequest("/users/");
    setUsers(data.results || data);
  }

  useEffect(() => {
    loadCatalog().catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("infaan_token", token);
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
    if (currentUser?.role === "admin" && ["/admin-dashboard", "/admin/users", "/bookings-services"].includes(path)) {
      loadUsers().catch((requestError) => setError(requestError.message));
    }
  }, [path, currentUser]);

  useEffect(() => {
    if (ADMIN_PROTECTED_PATHS.includes(path)) {
      if (!currentUser) {
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
        packages: packages.filter((pkg) => pkg.service === service.id),
      })),
    [services, packages]
  );

  const selectedPackage = packages.find((pkg) => String(pkg.id) === String(selectedPackageId));
  const selectedPrice = prices.find((price) => String(price.id) === String(selectedPriceId));

  function requireLogin(nextPath) {
    if (!currentUser) {
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
      localStorage.setItem("infaan_user", JSON.stringify(data.user));
      setFeedback("Authentication successful.");
      navigate(data.user.role === "admin" ? "/admin-dashboard" : "/dashboard");
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
      localStorage.setItem("infaan_user", JSON.stringify(data.user));
      setFeedback("Google login successful.");
      navigate("/dashboard");
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

  async function savePackage() {
    setLoading(true);
    setError("");
    setFeedback("");
    const body = {
      ...packageForm,
      service: Number(packageForm.service),
      features: packageForm.features.split("\n").filter(Boolean),
    };
    try {
      if (editingPackageId) {
        await apiRequest(`/packages/${editingPackageId}/`, { method: "PUT", body: JSON.stringify(body) });
        setFeedback("Package updated successfully.");
      } else {
        await apiRequest("/packages/", { method: "POST", body: JSON.stringify(body) });
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

  async function deletePackage(packageId) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(`/packages/${packageId}/`, { method: "DELETE" });
      setFeedback("Package deleted successfully.");
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
    if (!selectedPriceId) {
      setError("Select package time first.");
      navigate("/package-time");
      return;
    }
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const createdBooking = await apiRequest("/subscriptions/", {
        method: "POST",
        body: JSON.stringify({
          ...subscriptionForm,
          package_price: Number(selectedPriceId),
          notes: `${subscriptionForm.notes}\nPayment method: ${paymentForm.method}\nPayment contact: ${
            paymentForm.method === "mixx" ? paymentForm.phone_number : paymentForm.card_name
          }`.trim(),
        }),
      });
      setBookingSent(true);
      setLastBooking(createdBooking);
      setFeedback("Booking sent successfully.");
      await loadProfileAndSubscriptions();
      navigate("/booking");
    } catch (requestError) {
      setError(requestError.message);
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
    setPendingPayment(null);
    setBookingSent(false);
    setLastBooking(null);
    setFeedback("Signed out successfully.");
    navigate("/home");
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
    packages,
    prices,
    subscriptions,
    users,
    selectedPackage,
    selectedPrice,
    selectedPackageId,
    setSelectedPackageId,
    selectedPriceId,
    setSelectedPriceId,
    pendingPayment,
    setPendingPayment,
    bookingSent,
    lastBooking,
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
    packageForm,
    setPackageForm,
    editingPackageId,
    setEditingPackageId,
    paymentForm,
    setPaymentForm,
    updateField,
    submitAuth,
    submitAdminUser,
    savePackage,
    deletePackage,
    submitBooking,
    requireLogin,
    beginGoogleLogin,
    logout,
    setFeedback,
    setError,
    loadUsers,
    emptyLogin,
    emptyRegister,
    emptyAdminUser,
    emptyPackage,
    emptyPayment,
    formatPrice,
  };

  const routes = {
    "/home": <HomePage app={app} />,
    "/login": <LoginPage app={app} />,
    "/register": <RegisterPage app={app} />,
    "/dashboard": <DashboardPage app={app} />,
    "/package": <PackagePage app={app} />,
    "/package-time": <PackageTimePage app={app} />,
    "/billing": <BillingPage app={app} />,
    "/booking": <BookingPage app={app} />,
    "/admin/login": <AdminLoginPage app={app} />,
    "/admin/register": <AdminRegisterPage app={app} />,
    "/admin-dashboard": <AdminDashboardPage app={app} />,
    "/admin/users": <AdminUsersPage app={app} />,
    "/bookings-services": <BookingsServicesPage app={app} />,
  };

  return <AppLayout app={app}>{routes[path] || <HomePage app={app} />}</AppLayout>;
}

export default App;
