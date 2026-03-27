import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const emptySubscription = {
  package_price: "",
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
const emptyService = { name: "", category: "website", short_description: "", details: "", is_active: true };
const emptyPackage = {
  service: "",
  tier: "silver",
  title: "",
  description: "",
  features: "",
  payment_notes: "",
  is_active: true,
};
const emptyPrice = { package: "", billing_period: "monthly", amount: "", currency: "USD", is_default: false };

function App() {
  const [token, setToken] = useState(localStorage.getItem("infaan_token") || "");
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("infaan_user") || "null"));
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [prices, setPrices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [subscriptionForm, setSubscriptionForm] = useState(emptySubscription);
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [priceForm, setPriceForm] = useState(emptyPrice);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = token ? { Authorization: `Token ${token}` } : {};

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });
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

  async function loadCatalog() {
    try {
      const [serviceData, packageData, priceData] = await Promise.all([
        apiRequest("/services/"),
        apiRequest("/packages/"),
        apiRequest("/prices/"),
      ]);
      setServices(serviceData.results || serviceData);
      setPackages(packageData.results || packageData);
      setPrices(priceData.results || priceData);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadProfileAndSubscriptions(activeToken = token) {
    if (!activeToken) return;
    try {
      const [profileResponse, subscriptionResponse] = await Promise.all([
        fetch(`${API_BASE}/auth/me/`, { headers: { Authorization: `Token ${activeToken}` } }),
        fetch(`${API_BASE}/subscriptions/`, { headers: { Authorization: `Token ${activeToken}` } }),
      ]);
      const profileData = await profileResponse.json().catch(() => ({}));
      const subscriptionData = await subscriptionResponse.json().catch(() => []);
      if (profileResponse.ok && profileData.id) {
        setCurrentUser(profileData);
        localStorage.setItem("infaan_user", JSON.stringify(profileData));
      }
      if (subscriptionResponse.ok) {
        setSubscriptions(subscriptionData.results || subscriptionData || []);
      }
    } catch {
      setError("Unable to load account data.");
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("infaan_token", token);
      loadProfileAndSubscriptions(token);
    } else {
      localStorage.removeItem("infaan_token");
      localStorage.removeItem("infaan_user");
      setCurrentUser(null);
      setSubscriptions([]);
    }
  }, [token]);

  const groupedPackages = useMemo(
    () =>
      services.map((service) => ({
        ...service,
        packages: packages.filter((pkg) => pkg.service === service.id),
      })),
    [services, packages]
  );

  const selectedPrice = prices.find((price) => String(price.id) === String(selectedPriceId));

  function handleInput(setter, field, value) {
    setter((previous) => ({ ...previous, [field]: value }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const data = await apiRequest("/auth/register/", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      setToken(data.token);
      setCurrentUser(data.user);
      setRegisterForm(emptyRegister);
      setFeedback("Customer account created successfully.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const data = await apiRequest("/auth/login/", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      setToken(data.token);
      setCurrentUser(data.user);
      setLoginForm(emptyLogin);
      setFeedback("You are signed in.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscription(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest("/subscriptions/", {
        method: "POST",
        body: JSON.stringify({
          ...subscriptionForm,
          package_price: Number(selectedPriceId || subscriptionForm.package_price),
        }),
      });
      setSubscriptionForm(emptySubscription);
      setSelectedPriceId("");
      setFeedback("Subscription submitted successfully.");
      loadProfileAndSubscriptions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminCreate(path, body, resetter, successMessage) {
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      resetter();
      setFeedback(successMessage);
      await loadCatalog();
      await loadProfileAndSubscriptions();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setFeedback("Signed out successfully.");
    setError("");
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="topbar">
          <div>
            <p className="eyebrow">Infaan Web and Design</p>
            <h1>Subscription-ready creative, web, ads, and maintenance services.</h1>
          </div>
          <div className="topbar-actions">
            {currentUser ? (
              <>
                <span className="badge">{currentUser.role}</span>
                <button className="ghost-button" onClick={logout}>Logout</button>
              </>
            ) : (
              <a className="ghost-button" href="#auth">Sign in</a>
            )}
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p>
              Build your brand with package plans across website development, logo and poster design,
              digital ads, and maintenance support.
            </p>
            <div className="hero-tags">
              <span>Silver</span>
              <span>Gold</span>
              <span>Premium</span>
              <span>Extra Maintenance</span>
            </div>
          </div>
          <div className="hero-card">
            <h2>Flexible Billing</h2>
            <p>Weekly, monthly, yearly, or per-task pricing depending on the service package.</p>
            <p className="hero-metric">{prices.length}+ active price options</p>
          </div>
        </div>
      </header>

      {(feedback || error) && (
        <section className={`notice ${error ? "notice-error" : "notice-success"}`}>
          {error || feedback}
        </section>
      )}

      <main className="content-grid">
        <section className="panel panel-wide">
          <div className="section-heading">
            <p className="eyebrow">Packages</p>
            <h2>Service catalog</h2>
          </div>
          <div className="service-stack">
            {groupedPackages.map((service) => (
              <article key={service.id} className="service-card">
                <div className="service-head">
                  <div>
                    <h3>{service.name}</h3>
                    <p>{service.short_description}</p>
                  </div>
                  <span className="category-pill">{service.category.replaceAll("_", " ")}</span>
                </div>
                <div className="package-grid">
                  {service.packages.map((pkg) => (
                    <div key={pkg.id} className="package-card">
                      <div className={`tier-banner tier-${pkg.tier}`}>{pkg.tier}</div>
                      <h4>{pkg.title}</h4>
                      <p>{pkg.description}</p>
                      <ul>
                        {pkg.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      <div className="price-list">
                        {pkg.prices.map((price) => (
                          <button
                            key={price.id}
                            type="button"
                            className={`price-chip ${String(selectedPriceId) === String(price.id) ? "price-chip-active" : ""}`}
                            onClick={() => {
                              setSelectedPriceId(price.id);
                              setSubscriptionForm((previous) => ({ ...previous, package_price: price.id }));
                            }}
                          >
                            {price.billing_period.replace("_", " ")} - {price.currency} {price.amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="auth">
          <div className="section-heading">
            <p className="eyebrow">Account</p>
            <h2>Customer access</h2>
          </div>
          {!currentUser ? (
            <div className="form-stack">
              <form className="form-card" onSubmit={handleLogin}>
                <h3>Login</h3>
                <input value={loginForm.username} onChange={(e) => handleInput(setLoginForm, "username", e.target.value)} placeholder="Username" />
                <input type="password" value={loginForm.password} onChange={(e) => handleInput(setLoginForm, "password", e.target.value)} placeholder="Password" />
                <button className="primary-button" disabled={loading}>Sign in</button>
              </form>

              <form className="form-card" onSubmit={handleRegister}>
                <h3>Create customer account</h3>
                <input value={registerForm.username} onChange={(e) => handleInput(setRegisterForm, "username", e.target.value)} placeholder="Username" />
                <input value={registerForm.first_name} onChange={(e) => handleInput(setRegisterForm, "first_name", e.target.value)} placeholder="First name" />
                <input value={registerForm.last_name} onChange={(e) => handleInput(setRegisterForm, "last_name", e.target.value)} placeholder="Last name" />
                <input type="email" value={registerForm.email} onChange={(e) => handleInput(setRegisterForm, "email", e.target.value)} placeholder="Email" />
                <input value={registerForm.phone_number} onChange={(e) => handleInput(setRegisterForm, "phone_number", e.target.value)} placeholder="Phone number" />
                <input type="password" value={registerForm.password} onChange={(e) => handleInput(setRegisterForm, "password", e.target.value)} placeholder="Password" />
                <button className="primary-button" disabled={loading}>Register</button>
              </form>
            </div>
          ) : (
            <div className="profile-card">
              <h3>{currentUser.username}</h3>
              <p>{currentUser.email}</p>
              <p>Role: {currentUser.role}</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Subscription</p>
            <h2>Book your package</h2>
          </div>
          <form className="form-card" onSubmit={handleSubscription}>
            <select
              value={selectedPriceId}
              onChange={(e) => {
                setSelectedPriceId(e.target.value);
                handleInput(setSubscriptionForm, "package_price", e.target.value);
              }}
              disabled={!currentUser}
            >
              <option value="">Select a package price</option>
              {prices.map((price) => (
                <option key={price.id} value={price.id}>
                  #{price.id} - {price.billing_period} - {price.currency} {price.amount}
                </option>
              ))}
            </select>
            {selectedPrice && (
              <p className="selected-copy">
                Selected: {selectedPrice.billing_period} billing at {selectedPrice.currency} {selectedPrice.amount}
              </p>
            )}
            <input value={subscriptionForm.business_name} onChange={(e) => handleInput(setSubscriptionForm, "business_name", e.target.value)} placeholder="Business name" disabled={!currentUser} />
            <input type="email" value={subscriptionForm.contact_email} onChange={(e) => handleInput(setSubscriptionForm, "contact_email", e.target.value)} placeholder="Contact email" disabled={!currentUser} />
            <input value={subscriptionForm.contact_phone} onChange={(e) => handleInput(setSubscriptionForm, "contact_phone", e.target.value)} placeholder="Contact phone" disabled={!currentUser} />
            <input type="date" value={subscriptionForm.start_date} onChange={(e) => handleInput(setSubscriptionForm, "start_date", e.target.value)} disabled={!currentUser} />
            <textarea value={subscriptionForm.notes} onChange={(e) => handleInput(setSubscriptionForm, "notes", e.target.value)} placeholder="Project notes or requirements" disabled={!currentUser} />
            <button className="primary-button" disabled={!currentUser || loading}>Submit subscription</button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <p className="eyebrow">Orders</p>
            <h2>{currentUser?.role === "admin" ? "All subscriptions" : "My subscriptions"}</h2>
          </div>
          <div className="subscription-stack">
            {subscriptions.length === 0 ? (
              <p className="muted">No subscriptions yet.</p>
            ) : (
              subscriptions.map((item) => (
                <div className="subscription-card" key={item.id}>
                  <strong>{item.package_details?.title}</strong>
                  <p>{item.business_name}</p>
                  <p>{item.package_details?.billing_period} - {item.package_details?.currency} {item.package_details?.amount}</p>
                  <span className={`status-pill status-${item.status}`}>{item.status}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {currentUser?.role === "admin" && (
          <section className="panel panel-wide">
            <div className="section-heading">
              <p className="eyebrow">Admin</p>
              <h2>Manage services, packages, and prices</h2>
            </div>
            <div className="form-stack admin-grid">
              <form
                className="form-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAdminCreate("/services/", serviceForm, () => setServiceForm(emptyService), "Service created successfully.");
                }}
              >
                <h3>Add service</h3>
                <input value={serviceForm.name} onChange={(e) => handleInput(setServiceForm, "name", e.target.value)} placeholder="Service name" />
                <select value={serviceForm.category} onChange={(e) => handleInput(setServiceForm, "category", e.target.value)}>
                  <option value="website">Website</option>
                  <option value="logo_poster">Logo & Poster</option>
                  <option value="digital_ads">Digital Ads</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <input value={serviceForm.short_description} onChange={(e) => handleInput(setServiceForm, "short_description", e.target.value)} placeholder="Short description" />
                <textarea value={serviceForm.details} onChange={(e) => handleInput(setServiceForm, "details", e.target.value)} placeholder="Detailed service notes" />
                <button className="primary-button" disabled={loading}>Create service</button>
              </form>

              <form
                className="form-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAdminCreate(
                    "/packages/",
                    {
                      ...packageForm,
                      service: Number(packageForm.service),
                      features: packageForm.features.split("\n").filter(Boolean),
                    },
                    () => setPackageForm(emptyPackage),
                    "Package created successfully."
                  );
                }}
              >
                <h3>Add package</h3>
                <select value={packageForm.service} onChange={(e) => handleInput(setPackageForm, "service", e.target.value)}>
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
                <select value={packageForm.tier} onChange={(e) => handleInput(setPackageForm, "tier", e.target.value)}>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="premium">Premium</option>
                  <option value="extra">Extra</option>
                </select>
                <input value={packageForm.title} onChange={(e) => handleInput(setPackageForm, "title", e.target.value)} placeholder="Package title" />
                <textarea value={packageForm.description} onChange={(e) => handleInput(setPackageForm, "description", e.target.value)} placeholder="Description" />
                <textarea value={packageForm.features} onChange={(e) => handleInput(setPackageForm, "features", e.target.value)} placeholder="One feature per line" />
                <input value={packageForm.payment_notes} onChange={(e) => handleInput(setPackageForm, "payment_notes", e.target.value)} placeholder="Payment notes" />
                <button className="primary-button" disabled={loading}>Create package</button>
              </form>

              <form
                className="form-card"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAdminCreate(
                    "/prices/",
                    {
                      ...priceForm,
                      package: Number(priceForm.package),
                      amount: Number(priceForm.amount),
                    },
                    () => setPriceForm(emptyPrice),
                    "Price created successfully."
                  );
                }}
              >
                <h3>Add price</h3>
                <select value={priceForm.package} onChange={(e) => handleInput(setPriceForm, "package", e.target.value)}>
                  <option value="">Select package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
                  ))}
                </select>
                <select value={priceForm.billing_period} onChange={(e) => handleInput(setPriceForm, "billing_period", e.target.value)}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="per_task">Per task</option>
                </select>
                <input type="number" min="0" step="0.01" value={priceForm.amount} onChange={(e) => handleInput(setPriceForm, "amount", e.target.value)} placeholder="Amount" />
                <input value={priceForm.currency} onChange={(e) => handleInput(setPriceForm, "currency", e.target.value)} placeholder="Currency" />
                <label className="checkbox-row">
                  <input type="checkbox" checked={priceForm.is_default} onChange={(e) => handleInput(setPriceForm, "is_default", e.target.checked)} />
                  Default price
                </label>
                <button className="primary-button" disabled={loading}>Create price</button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
