function AdminDashboardPage({ app }) {
  const {
    adminUserForm,
    setAdminUserForm,
    updateField,
    submitAdminUser,
    serviceForm,
    setServiceForm,
    saveService,
    editingServiceId,
    setEditingServiceId,
    deleteService,
    packageForm,
    setPackageForm,
    savePackage,
    editingPackageId,
    setEditingPackageId,
    groupedPackages,
    services,
    deletePackage,
    portfolioItems,
    portfolioForm,
    setPortfolioForm,
    editingPortfolioId,
    setEditingPortfolioId,
    savePortfolio,
    deletePortfolio,
    subscriptionSystems,
    systemForm,
    setSystemForm,
    editingSystemId,
    setEditingSystemId,
    saveSubscriptionSystem,
    deleteSubscriptionSystem,
    loading,
    subscriptions,
    formatPrice,
    navigate,
  } = app;

  const billingPeriods = ["weekly", "monthly", "yearly", "per_task"];

  function updatePackagePrice(index, field, value) {
    setPackageForm((previous) => ({
      ...previous,
      prices: previous.prices.map((price, priceIndex) =>
        priceIndex === index ? { ...price, [field]: value } : price
      ),
    }));
  }

  const systemServices = services.filter((service) => service.category === "system_subscription");
  const selectedPackageService = services.find((service) => String(service.id) === String(packageForm.service));
  const packageUsesFixedPrice = selectedPackageService?.category === "logo_poster";

  function updateSystemGalleryImage(index, value) {
    setSystemForm((previous) => ({
      ...previous,
      gallery_images: previous.gallery_images.map((image, imageIndex) => (imageIndex === index ? value : image)),
    }));
  }

  function handlePortfolioImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPortfolioForm((previous) => ({
        ...previous,
        image_data: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleSystemImageChange(field, index = null) {
    return (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (field === "cover_image") {
          setSystemForm((previous) => ({
            ...previous,
            cover_image: String(reader.result || ""),
          }));
          return;
        }

        updateSystemGalleryImage(index, String(reader.result || ""));
      };
      reader.readAsDataURL(file);
    };
  }

  function getSystemPricePreview(system) {
    return (system.packages || [])
      .flatMap((pkg) =>
        (pkg.prices || []).map((price) => ({
          key: `${pkg.id}-${price.id}`,
          label: `${pkg.title} ${price.billing_period} ${formatPrice(price.amount, price.currency)}`,
        }))
      )
      .slice(0, 6);
  }

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">admin dashboard</p>
          <h2>Admin Dashboard</h2>
        </div>

        <div className="admin-grid">
          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              submitAdminUser();
            }}
          >
            <h3>Add customer account</h3>
            <input value={adminUserForm.username} onChange={(event) => updateField(setAdminUserForm, "username", event.target.value)} placeholder="Username" />
            <input value={adminUserForm.first_name} onChange={(event) => updateField(setAdminUserForm, "first_name", event.target.value)} placeholder="First name" />
            <input value={adminUserForm.last_name} onChange={(event) => updateField(setAdminUserForm, "last_name", event.target.value)} placeholder="Last name" />
            <input type="email" value={adminUserForm.email} onChange={(event) => updateField(setAdminUserForm, "email", event.target.value)} placeholder="Email" />
            <input value={adminUserForm.phone_number} onChange={(event) => updateField(setAdminUserForm, "phone_number", event.target.value)} placeholder="Phone number" />
            <input type="password" value={adminUserForm.password} onChange={(event) => updateField(setAdminUserForm, "password", event.target.value)} placeholder="Password" />
            <button type="submit" className="solid-button" disabled={loading}>
              Create customer
            </button>
          </form>

          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              saveService();
            }}
          >
            <h3>{editingServiceId ? "Edit service" : "Post service"}</h3>
            <input value={serviceForm.name} onChange={(event) => updateField(setServiceForm, "name", event.target.value)} placeholder="Service name" />
            <select value={serviceForm.category} onChange={(event) => updateField(setServiceForm, "category", event.target.value)}>
              <option value="website">Website Developing and Design</option>
              <option value="digital_ads">Digital Ads</option>
              <option value="logo_poster">Logo & Poster Design</option>
              <option value="maintenance">Maintenance & Fix Web System</option>
              <option value="system_subscription">System Developing and Subscription Service</option>
            </select>
            <input
              value={serviceForm.short_description}
              onChange={(event) => updateField(setServiceForm, "short_description", event.target.value)}
              placeholder="Short description"
            />
            <textarea
              value={serviceForm.details}
              onChange={(event) => updateField(setServiceForm, "details", event.target.value)}
              placeholder="Full service details"
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={serviceForm.is_active}
                onChange={(event) => updateField(setServiceForm, "is_active", event.target.checked)}
              />
              Active service
            </label>
            <button type="submit" className="solid-button" disabled={loading}>
              {editingServiceId ? "Update service" : "Create service"}
            </button>
            {editingServiceId && (
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setServiceForm(app.emptyService);
                  setEditingServiceId(null);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>

          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              savePackage();
            }}
          >
            <h3>{editingPackageId ? "Edit package" : "Post package"}</h3>
            <select value={packageForm.service} onChange={(event) => updateField(setPackageForm, "service", event.target.value)}>
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <select value={packageForm.tier} onChange={(event) => updateField(setPackageForm, "tier", event.target.value)}>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="premium">Premium</option>
              <option value="extra">Extra</option>
            </select>
            <input value={packageForm.title} onChange={(event) => updateField(setPackageForm, "title", event.target.value)} placeholder="Package title" />
            <textarea value={packageForm.description} onChange={(event) => updateField(setPackageForm, "description", event.target.value)} placeholder="Description" />
            <textarea value={packageForm.features} onChange={(event) => updateField(setPackageForm, "features", event.target.value)} placeholder="One feature per line" />
            <input value={packageForm.payment_notes} onChange={(event) => updateField(setPackageForm, "payment_notes", event.target.value)} placeholder="Payment notes" />
            <div className="admin-price-editor">
              <p className="micro-label">package prices</p>
              {billingPeriods
                .filter((period) => (packageUsesFixedPrice ? period === "per_task" : true))
                .map((period) => {
                  const actualIndex = billingPeriods.indexOf(period);
                  return (
                    <div key={period} className="admin-price-row">
                      <strong>{period.replace("_", " ")}</strong>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageForm.prices[actualIndex]?.usd_amount || ""}
                        onChange={(event) => updatePackagePrice(actualIndex, "usd_amount", event.target.value)}
                        placeholder="USD amount"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={packageForm.prices[actualIndex]?.tzs_amount || ""}
                        onChange={(event) => updatePackagePrice(actualIndex, "tzs_amount", event.target.value)}
                        placeholder="TZS amount"
                      />
                    </div>
                  );
                })}
            </div>
            <button type="submit" className="solid-button" disabled={loading}>
              {editingPackageId ? "Update package" : "Create package"}
            </button>
            {editingPackageId && (
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setPackageForm(app.emptyPackage);
                  setEditingPackageId(null);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>

          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              savePortfolio();
            }}
          >
            <h3>{editingPortfolioId ? "Edit portfolio" : "Post portfolio"}</h3>
            <input
              value={portfolioForm.name}
              onChange={(event) => updateField(setPortfolioForm, "name", event.target.value)}
              placeholder="Portfolio name"
            />
            <label className="portfolio-upload-field">
              <span>Portfolio image</span>
              <input type="file" accept="image/*" onChange={handlePortfolioImageChange} />
            </label>
            {portfolioForm.image_data ? (
              <div className="portfolio-admin-preview">
                <img src={portfolioForm.image_data} alt="Portfolio preview" />
              </div>
            ) : null}
            <label className="check-row">
              <input
                type="checkbox"
                checked={portfolioForm.is_active}
                onChange={(event) => updateField(setPortfolioForm, "is_active", event.target.checked)}
              />
              Active portfolio
            </label>
            <button type="submit" className="solid-button" disabled={loading}>
              {editingPortfolioId ? "Update portfolio" : "Create portfolio"}
            </button>
            {editingPortfolioId && (
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setPortfolioForm(app.emptyPortfolio);
                  setEditingPortfolioId(null);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>

          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              saveSubscriptionSystem();
            }}
          >
            <h3>{editingSystemId ? "Edit system subscription" : "Post system subscription"}</h3>
            <select value={systemForm.service} onChange={(event) => updateField(setSystemForm, "service", event.target.value)}>
              <option value="">Select system service</option>
              {systemServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <input value={systemForm.name} onChange={(event) => updateField(setSystemForm, "name", event.target.value)} placeholder="System name" />
            <input value={systemForm.summary} onChange={(event) => updateField(setSystemForm, "summary", event.target.value)} placeholder="Front card summary" />
            <textarea value={systemForm.details} onChange={(event) => updateField(setSystemForm, "details", event.target.value)} placeholder="System details" />
            <input value={systemForm.system_url} onChange={(event) => updateField(setSystemForm, "system_url", event.target.value)} placeholder="System URL" />
            <input value={systemForm.admin_url} onChange={(event) => updateField(setSystemForm, "admin_url", event.target.value)} placeholder="Admin URL" />
            <div className="payment-field-grid">
              <input
                type="number"
                min="0"
                step="0.01"
                value={systemForm.display_price}
                onChange={(event) => updateField(setSystemForm, "display_price", event.target.value)}
                placeholder="System price"
              />
              <select value={systemForm.display_price_currency} onChange={(event) => updateField(setSystemForm, "display_price_currency", event.target.value)}>
                <option value="USD">USD</option>
                <option value="TZS">TZS</option>
              </select>
            </div>
            <label className="portfolio-upload-field">
              <span>Front image</span>
              <input type="file" accept="image/*" onChange={handleSystemImageChange("cover_image")} />
            </label>
            {systemForm.cover_image ? (
              <div className="portfolio-admin-preview">
                <img src={systemForm.cover_image} alt="System cover preview" />
              </div>
            ) : null}
            {(systemForm.gallery_images || []).map((image, index) => (
              <div key={`gallery-${index + 1}`} className="form-layout">
                <label className="portfolio-upload-field">
                  <span>{`System view image ${index + 1}`}</span>
                  <input type="file" accept="image/*" onChange={handleSystemImageChange("gallery_images", index)} />
                </label>
                {image ? (
                  <div className="portfolio-admin-preview">
                    <img src={image} alt={`System view ${index + 1}`} />
                  </div>
                ) : null}
              </div>
            ))}
            <label className="check-row">
              <input
                type="checkbox"
                checked={systemForm.is_active}
                onChange={(event) => updateField(setSystemForm, "is_active", event.target.checked)}
              />
              Active system subscription
            </label>
            <button type="submit" className="solid-button" disabled={loading}>
              {editingSystemId ? "Update system" : "Create system"}
            </button>
            {editingSystemId && (
              <div className="hero-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setSystemForm(app.emptySystem);
                    setEditingSystemId(null);
                  }}
                >
                  Cancel edit
                </button>
                <button
                  type="button"
                  className="header-button"
                  onClick={() => deleteSubscriptionSystem(editingSystemId)}
                  disabled={loading}
                >
                  Delete system
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="section-headline admin-booking-head">
          <div>
            <p className="micro-label">portfolio</p>
            <h2>Portfolio gallery</h2>
          </div>
        </div>

        <div className="admin-catalog-grid">
          {portfolioItems.map((item) => (
            <article key={item.id} className="portfolio-product-card admin-portfolio-card">
              <button type="button" className="portfolio-heart-button" aria-label="Portfolio item">
                â™¡
              </button>
              <div className="portfolio-product-image-wrap">
                <img src={item.image_data} alt={item.name} className="portfolio-product-image" />
              </div>
              <div className="portfolio-product-content">
                <h3>{item.name}</h3>
                <p>{item.is_active ? "active" : "inactive"}</p>
              </div>
              <div className="portfolio-product-footer">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setPortfolioForm({
                      name: item.name,
                      image_data: item.image_data,
                      is_active: item.is_active,
                    });
                    setEditingPortfolioId(item.id);
                  }}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="header-button"
                  onClick={() => deletePortfolio(item.id)}
                  aria-label="Delete portfolio"
                >
                  Ã—
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="section-headline admin-booking-head">
          <div>
            <p className="micro-label">system subscription</p>
            <h2>System subscription catalog</h2>
          </div>
        </div>

        {subscriptionSystems.length ? (
          <div className="admin-catalog-grid">
            {subscriptionSystems.map((system) => {
              const pricePreview = getSystemPricePreview(system);
              const displayPrice =
                system.display_price !== null && system.display_price !== undefined && system.display_price !== ""
                  ? formatPrice(system.display_price, system.display_price_currency || "USD")
                  : "No display price";

              return (
                <article key={system.id} className="portfolio-product-card admin-portfolio-card system-admin-card">
                  <div className="portfolio-product-image-wrap">
                    <img src={system.cover_image} alt={system.name} className="portfolio-product-image" />
                  </div>
                  <div className="portfolio-product-content">
                    <div className="system-admin-topline">
                      <span className={`status-pill ${system.is_active ? "status-active" : "status-cancelled"}`}>
                        {system.is_active ? "active" : "inactive"}
                      </span>
                      <strong className="system-admin-display-price">{displayPrice}</strong>
                    </div>
                    <h3>{system.name}</h3>
                    <p className="system-admin-summary">{system.summary}</p>
                    <div className="system-admin-detail-list">
                      <p className="system-admin-meta">
                        <span>Service</span>
                        <strong>{system.service_name || "-"}</strong>
                      </p>
                      <p className="system-admin-meta">
                        <span>System URL</span>
                        <strong>{system.system_url || "No system URL"}</strong>
                      </p>
                      <p className="system-admin-meta">
                        <span>Admin URL</span>
                        <strong>{system.admin_url || "No admin URL"}</strong>
                      </p>
                    </div>
                    {pricePreview.length ? (
                      <div className="price-list system-admin-price-list">
                        {pricePreview.map((price) => (
                          <span key={price.key} className="price-chip">
                            {price.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No package price yet</p>
                    )}
                  </div>
                  <div className="portfolio-product-footer system-admin-actions">
                    <button
                      type="button"
                      className="outline-button system-admin-button"
                      onClick={() => {
                        setSystemForm({
                          service: String(system.service),
                          name: system.name,
                          summary: system.summary,
                          details: system.details,
                          system_url: system.system_url || "",
                          admin_url: system.admin_url || "",
                          display_price: system.display_price ?? "",
                          display_price_currency: system.display_price_currency || "USD",
                          cover_image: system.cover_image,
                          gallery_images: [...(system.gallery_images || []), "", "", "", "", ""].slice(0, 5),
                          is_active: system.is_active,
                        });
                        setEditingSystemId(system.id);
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="header-button system-admin-button"
                      onClick={() => deleteSubscriptionSystem(system.id)}
                      aria-label="Delete system subscription"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="section-card admin-empty-state">
            <h3>No system subscription posted yet</h3>
            <p>Create a system subscription above and it will appear here for admin management.</p>
          </div>
        )}

        <div className="section-headline admin-booking-head">
          <div>
            <p className="micro-label">services</p>
            <h2>Service catalog</h2>
          </div>
        </div>

        <div className="package-grid">
          {services.map((service) => (
            <div key={service.id} className="package-card service-admin-card">
              <div className="package-topline">
                <span className="tier-pill">{service.category.replace("_", " ")}</span>
                <span className={`status-pill ${service.is_active ? "status-active" : "status-cancelled"}`}>
                  {service.is_active ? "active" : "inactive"}
                </span>
              </div>
              <h4>{service.name}</h4>
              <p>{service.short_description}</p>
              <p>{service.details}</p>
              <div className="price-list">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    setServiceForm({
                      name: service.name,
                      category: service.category,
                      short_description: service.short_description,
                      details: service.details,
                      is_active: service.is_active,
                    });
                    setEditingServiceId(service.id);
                  }}
                >
                  Edit
                </button>
                <button type="button" className="header-button" onClick={() => deleteService(service.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="package-grid">
          {groupedPackages.flatMap((service) =>
            service.packages.map((pkg) => (
              <div key={pkg.id} className={`package-card tone-${pkg.tier}`}>
                <h4>{pkg.title}</h4>
                <p>{pkg.description}</p>
                <div className="admin-package-prices">
                  {pkg.prices.map((price) => (
                    <span key={`${price.billing_period}-${price.currency}`} className="price-chip">
                      {price.billing_period} {price.currency}{" "}
                      {formatPrice(price.amount, price.currency).replace(`${price.currency} `, "")}
                    </span>
                  ))}
                </div>
                <div className="price-list">
                  <button
                    type="button"
                    className="outline-button"
                    onClick={() => {
                      const priceMap = {
                        weekly: { billing_period: "weekly", usd_amount: "", tzs_amount: "" },
                        monthly: { billing_period: "monthly", usd_amount: "", tzs_amount: "" },
                        yearly: { billing_period: "yearly", usd_amount: "", tzs_amount: "" },
                        per_task: { billing_period: "per_task", usd_amount: "", tzs_amount: "" },
                      };
                      pkg.prices.forEach((price) => {
                        const amountKey = price.currency === "TZS" ? "tzs_amount" : "usd_amount";
                        if (priceMap[price.billing_period]) {
                          priceMap[price.billing_period][amountKey] = String(price.amount);
                        }
                      });
                      setPackageForm({
                        service: String(pkg.service),
                        tier: pkg.tier,
                        title: pkg.title,
                        description: pkg.description,
                        features: pkg.features.join("\n"),
                        payment_notes: pkg.payment_notes,
                        prices: Object.values(priceMap),
                        is_active: pkg.is_active,
                      });
                      setEditingPackageId(pkg.id);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="header-button" onClick={() => deletePackage(pkg.id, service.category)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="section-headline admin-booking-head">
          <div>
            <p className="micro-label">recent bookings</p>
            <h2>Customer bookings</h2>
          </div>
          <button type="button" className="outline-button" onClick={() => navigate("/bookings-services")}>
            View all bookings
          </button>
        </div>

        <div className="subscription-stack">
          {[...subscriptions]
            .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
            .slice(0, 6)
            .map((booking) => (
              <div key={booking.id} className="subscription-card">
                <strong>{booking.user_details?.username}</strong>
                <p>{booking.business_name}</p>
                <p>{booking.package_details?.title}</p>
                <p>
                  {booking.package_details?.billing_period} -{" "}
                  {formatPrice(booking.package_details?.amount, booking.package_details?.currency)}
                </p>
                <span className={`status-pill status-${booking.status}`}>{booking.status}</span>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}

export default AdminDashboardPage;
