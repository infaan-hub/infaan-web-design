import { useEffect, useState } from "react";

function AdminSystemControlPage({ app }) {
  const { tenants, tenantServices, updateTenantService, loading } = app;
  const [draftServices, setDraftServices] = useState({});

  useEffect(() => {
    const nextDrafts = {};
    tenantServices.forEach((service) => {
      nextDrafts[service.id] = {
        domain: service.domain || "",
        public_url: service.public_url || "",
        admin_url: service.admin_url || "",
        service_type: service.service_type || "django_system",
        connection_status: service.connection_status || "pending",
        is_enabled: Boolean(service.is_enabled),
      };
    });
    setDraftServices(nextDrafts);
  }, [tenantServices]);

  function updateDraft(serviceId, field, value) {
    setDraftServices((previous) => ({
      ...previous,
      [serviceId]: {
        ...previous[serviceId],
        [field]: value,
      },
    }));
  }

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <div>
            <p className="micro-label">system control</p>
            <h2>Tenant SaaS Control Center</h2>
          </div>
        </div>

        <div className="subscription-detail-grid">
          <div className="credential-card">
            <span className="micro-label">tenants</span>
            <strong>{tenants.length}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">connected services</span>
            <strong>{tenantServices.length}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">active links</span>
            <strong>{tenantServices.filter((item) => item.connection_status === "active").length}</strong>
          </div>
          <div className="credential-card">
            <span className="micro-label">blocked links</span>
            <strong>{tenantServices.filter((item) => !item.is_enabled).length}</strong>
          </div>
        </div>

        {tenantServices.length ? (
          <div className="subscription-stack">
            {tenantServices.map((service) => {
              const draft = draftServices[service.id] || {
                domain: "",
                public_url: "",
                admin_url: "",
                service_type: "django_system",
                connection_status: "pending",
                is_enabled: true,
              };

              return (
                <form
                  key={service.id}
                  className="subscription-card system-control-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateTenantService(service.id, draft, "Connected service updated successfully.");
                  }}
                >
                  <div className="subscription-detail-head">
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.tenant_name}</p>
                      <p>{service.subscription_end_date ? `Expires ${service.subscription_end_date}` : "No expiry date yet"}</p>
                    </div>
                    <div className="system-control-statuses">
                      <span className={`status-pill status-${service.subscription_status || "pending"}`}>
                        {(service.subscription_status || "pending").replace("_", " ")}
                      </span>
                      <span className={`status-pill ${draft.is_enabled ? "status-active" : "status-cancelled"}`}>
                        {draft.is_enabled ? "enabled" : "blocked"}
                      </span>
                    </div>
                  </div>

                  <div className="subscription-detail-grid">
                    <select value={draft.service_type} onChange={(event) => updateDraft(service.id, "service_type", event.target.value)}>
                      <option value="django_system">Django system</option>
                      <option value="wordpress_site">WordPress site</option>
                      <option value="custom_site">Custom site</option>
                      <option value="other">Other</option>
                    </select>
                    <select value={draft.connection_status} onChange={(event) => updateDraft(service.id, "connection_status", event.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <input value={draft.domain} onChange={(event) => updateDraft(service.id, "domain", event.target.value)} placeholder="Client domain" />
                    <input value={draft.public_url} onChange={(event) => updateDraft(service.id, "public_url", event.target.value)} placeholder="Public URL" />
                    <input value={draft.admin_url} onChange={(event) => updateDraft(service.id, "admin_url", event.target.value)} placeholder="Admin URL" />
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={draft.is_enabled}
                        onChange={(event) => updateDraft(service.id, "is_enabled", event.target.checked)}
                      />
                      Allow control from super system
                    </label>
                  </div>

                  <div className="system-control-keys">
                    <div className="credential-card">
                      <span className="micro-label">api url</span>
                      <strong>{service.api_url || "Set SYSTEM_SUBSCRIPTION_API_URL"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">license key</span>
                      <strong>{service.license_key}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">api key</span>
                      <strong>{service.api_key}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">api secret</span>
                      <strong>{service.api_secret}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">heartbeat</span>
                      <strong>{service.last_heartbeat_at || "No heartbeat yet"}</strong>
                    </div>
                  </div>

                  <div className="system-control-admins">
                    <p className="micro-label">linked service admins</p>
                    {service.admins?.length ? (
                      <div className="price-list">
                        {service.admins.map((admin) => (
                          <span key={`${service.id}-${admin.id}`} className="price-chip">
                            {admin.user_identifier} - {admin.role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No linked admin yet</p>
                    )}
                  </div>

                  <div className="system-control-features">
                    <p className="micro-label">feature access</p>
                    {service.feature_access?.length ? (
                      <div className="price-list">
                        {service.feature_access.map((feature) => (
                          <span key={`${service.id}-${feature.id}`} className="price-chip">
                            {feature.feature_code} {feature.enabled ? "on" : "off"}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p>No feature access mapped yet</p>
                    )}
                  </div>

                  <div className="hero-actions">
                    <button type="submit" className="solid-button" disabled={loading}>
                      Save control
                    </button>
                    <button
                      type="button"
                      className="outline-button"
                      disabled={loading}
                      onClick={() =>
                        updateTenantService(
                          service.id,
                          {
                            ...draft,
                            connection_status: "active",
                            is_enabled: true,
                          },
                          "Connection approved and activated."
                        )
                      }
                    >
                      Confirm connection
                    </button>
                    <button
                      type="button"
                      className="header-button"
                      disabled={loading}
                      onClick={() =>
                        updateTenantService(
                          service.id,
                          {
                            ...draft,
                            connection_status: "inactive",
                            is_enabled: false,
                          },
                          "Connected service blocked."
                        )
                      }
                    >
                      Block service
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        ) : (
          <div className="form-card">
            <h3>No connected tenant service yet</h3>
            <p>Once a customer pays for a system subscription, the tenant, service control, license key, and API keys will appear here.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminSystemControlPage;
