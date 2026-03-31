import {
  formatServiceCategoryLabel,
  getOrderedServices,
  getServiceImage,
  getSystemServices,
} from "../lib/serviceCatalog";

const heroImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.66 15l-1.18 4.3 4.4-1.15A10 10 0 1 0 12 2Zm0 18.18a8.17 8.17 0 0 1-4.16-1.13l-.3-.17-2.61.68.7-2.54-.2-.32A8.18 8.18 0 1 1 12 20.18Zm4.48-6.1c-.24-.12-1.4-.7-1.62-.78-.21-.08-.37-.12-.52.12-.15.24-.6.78-.73.94-.13.16-.27.18-.5.06-.24-.12-.99-.36-1.89-1.16-.7-.62-1.16-1.39-1.3-1.62-.14-.24-.01-.37.1-.5.11-.12.24-.3.36-.45.12-.15.16-.25.24-.42.08-.16.04-.3-.02-.42-.06-.12-.52-1.26-.72-1.73-.18-.43-.37-.37-.52-.38h-.45c-.15 0-.4.06-.61.3-.21.24-.8.78-.8 1.9s.82 2.2.94 2.36c.12.16 1.6 2.45 3.88 3.44.54.24.97.38 1.3.49.55.18 1.05.16 1.44.1.44-.07 1.4-.57 1.6-1.13.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.75 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5Zm0 1.8A3.7 3.7 0 1 0 15.7 12 3.7 3.7 0 0 0 12 8.3Z"
      />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M3 6.75 12 13l9-6.25V18a2 2 0 0 1-2 2h-2.25v-8.1L12 15.1 7.25 11.9V20H5a2 2 0 0 1-2-2V6.75Z" />
      <path fill="#FBBC05" d="M3 6.75V6a2 2 0 0 1 .82-1.62L12 10.25l8.18-5.87A2 2 0 0 1 21 6v.75L12 13 3 6.75Z" />
      <path fill="#34A853" d="M16.75 20H7.25v-8.1L12 15.1l4.75-3.2V20Z" />
      <path fill="#4285F4" d="M21 6.75V18a2 2 0 0 1-2 2h-2.25v-8.1L21 6.75ZM3 6.75l4.25 5.15V20H5a2 2 0 0 1-2-2V6.75Z" />
    </svg>
  );
}

function HomePage({ app }) {
  const { groupedPackages, groupedPortfolio, selectPackage, requireLogin, formatPrice, currentUser, navigate } = app;
  const visibleServices = getOrderedServices(groupedPackages.filter((service) => service.packages?.length)).slice(0, 4);
  const visiblePortfolioServices = getOrderedServices(groupedPortfolio.filter((service) => service.portfolioItems?.length)).slice(0, 4);
  const systemServices = getSystemServices(groupedPackages);

  return (
    <main className="main-content">
      <section className="home-hero">
        <div className="home-hero-media" style={{ backgroundImage: `url(${heroImage})` }} />
        <div className="home-hero-glow" />
        <div className="home-hero-copy">
          <span className="home-hero-pill">Open for business systems</span>
          <h2>Build websites, digital ads, and design systems without limits.</h2>
          <p>
            Infaan Web & Design helps businesses launch software development, branding, maintenance, and digital growth
            services in one complete workflow.
          </p>
          <div className="hero-actions">
            <button type="button" className="header-button home-hero-button" onClick={() => navigate("/package")}>
              View Plans & Pricing
            </button>
          </div>
        </div>

        <div className="home-hero-facts">
          <div className="home-hero-fact">
            <strong>Full Service</strong>
            <span>Web, ads, branding, and maintenance</span>
          </div>
          <div className="home-hero-fact">
            <strong>Flexible Plans</strong>
            <span>Weekly, monthly, yearly, and fixed extra tasks</span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">service images</p>
          <h2>Featured service categories</h2>
        </div>

        <div className="service-visual-grid">
          {visibleServices.map((service) => (
            <article
              key={service.id}
              className="visual-card visual-card-action"
              onClick={() => {
                if (!currentUser) {
                  navigate("/login");
                  return;
                }
                navigate("/package");
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!currentUser) {
                    navigate("/login");
                    return;
                  }
                  navigate("/package");
                }
              }}
            >
              <div className="visual-image" style={{ backgroundImage: `url(${getServiceImage(service)})` }} />
              <div className="visual-copy">
                <span>{formatServiceCategoryLabel(service.category)}</span>
                <h3>{service.name}</h3>
                <p>{service.short_description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="pricing-heading">
          <p className="micro-label">pricing plans</p>
          <h2>Pricing plans</h2>
          <span>Choose the right plan for your needs.</span>
        </div>

        <div className="package-stack">
          {visibleServices.map((service) => (
            <article key={service.id} className="package-service-card">
              <div className="package-service-head">
                <div>
                  <h3>{service.name}</h3>
                  <p>{service.details}</p>
                </div>
                <span className="service-badge">{formatServiceCategoryLabel(service.category)}</span>
              </div>

              <div className="package-grid">
                {service.packages.map((pkg) => (
                  <div key={pkg.id} className="pricing-plan-card">
                    {(() => {
                      const headlinePrices = pkg.prices.filter((price) =>
                        pkg.prices[0]?.billing_period === "per_task"
                          ? price.billing_period === "per_task"
                          : price.billing_period === "monthly"
                      );

                      return (
                    <div className={`pricing-plan-top pricing-tone-${pkg.tier}`}>
                      <span className="pricing-mini-pill">{pkg.tier}</span>
                      <h4>{pkg.title}</h4>
                      <div className="pricing-amount">
                        {pkg.prices[0]?.billing_period === "per_task" ? (
                          <>
                            <strong>Custom</strong>
                            <span>per task</span>
                          </>
                        ) : (
                          <>
                            <strong>
                              {formatPrice(
                                pkg.prices.find((price) => price.billing_period === "monthly")?.amount || pkg.prices[0]?.amount,
                                pkg.prices.find((price) => price.billing_period === "monthly")?.currency || pkg.prices[0]?.currency || "USD"
                              )}
                            </strong>
                            <span>/month</span>
                          </>
                        )}
                      </div>
                      {headlinePrices.length > 1 ? (
                        <div className="price-list">
                          {headlinePrices.map((price) => (
                            <span key={`${pkg.id}-${price.id}`} className="price-chip">
                              {formatPrice(price.amount, price.currency)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p>{pkg.description}</p>
                      <button
                        type="button"
                        className="pricing-cta"
                        onClick={() => {
                          selectPackage(pkg.id);
                          requireLogin("/package");
                        }}
                      >
                        Subscribe
                      </button>
                    </div>
                      );
                    })()}

                    <ul className="pricing-feature-list">
                      {pkg.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">system subscription</p>
          <h2>System subscription</h2>
        </div>

        {systemServices.length ? (
          <div className="service-visual-grid">
            {systemServices.map((service) => {
              const preferredPackage = service.packages[0];

              return (
                <article
                  key={service.id}
                  className="visual-card visual-card-action system-subscription-card"
                  onClick={() => navigate("/system-subscription")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate("/system-subscription");
                    }
                  }}
                >
                  <div className="visual-image system-subscription-image" style={{ backgroundImage: `url(${getServiceImage(service)})` }} />
                  <div className="visual-copy system-subscription-copy">
                    <span className="system-subscription-pill">{formatServiceCategoryLabel(service.category)}</span>
                    <h3>{service.name}</h3>
                    <p>
                      {service.short_description || "Subscribe to use this system weekly, monthly, or yearly and access ends after the hired time."}
                    </p>
                    <strong className="system-subscription-link">View system and plans</strong>
                    {preferredPackage ? (
                      <button
                        type="button"
                        className="outline-button system-preview-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectPackage(preferredPackage.id);
                          requireLogin("/system-subscription");
                        }}
                      >
                        View system
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <article className="service-catalog-block">
            <div className="service-catalog-head">
              <div
                className="service-catalog-cover"
                style={{ backgroundImage: `url(${getServiceImage("system_subscription")})` }}
              />
              <div className="service-catalog-copy">
                <p className="micro-label">system subscription</p>
                <h3>Hire ready systems by time</h3>
                <p>
                  Customers will be able to open a system, choose weekly, monthly, or yearly subscription time, then
                  continue with normal billing, payment, and receipt steps from one place.
                </p>
                <button type="button" className="solid-button" onClick={() => navigate("/system-subscription")}>
                  Open system subscription
                </button>
              </div>
            </div>
          </article>
        )}
      </section>

      <section className="section-block">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>Latest portfolio samples</h2>
        </div>

        <div className="package-grid">
          {visiblePortfolioServices.map((service) => {
            const portfolioPreview = service.portfolioItems[0];

            return (
              <article key={service.id} className="portfolio-home-card">
                <div
                  className="portfolio-home-image"
                  style={{
                    backgroundImage: `url(${portfolioPreview?.image_data || getServiceImage(service)})`,
                  }}
                >
                  <span className="portfolio-image-badge">{service.name}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <article className="about-system-card">
          <div className="about-system-copy">
            <p className="micro-label">about us</p>
            <h2>Infaan Web & Design builds business-ready digital systems from one place.</h2>
            <p>
              We combine website development, web application delivery, system development and subscription, logo and
              poster design, digital ads, and maintenance support into one structured service flow so customers can
              choose a package, subscribe, pay, and track work smoothly.
            </p>
            <p>
              The system is designed to help both customers and admin manage packages, portfolios, bookings, billing,
              and completed service history in a clean and reliable workspace.
            </p>
          </div>

          <div className="about-contact-grid">
            <a
              className="premium-contact-button contact-whatsapp"
              href="https://wa.me/255711252758"
              target="_blank"
              rel="noreferrer"
            >
              <span className="premium-contact-icon">
                <WhatsAppIcon />
              </span>
              <span className="premium-contact-copy">
                <strong>WhatsApp</strong>
                <small>+255711252758</small>
              </span>
            </a>

            <a
              className="premium-contact-button contact-instagram"
              href="https://instagram.com/_.infaan_"
              target="_blank"
              rel="noreferrer"
            >
              <span className="premium-contact-icon">
                <InstagramIcon />
              </span>
              <span className="premium-contact-copy">
                <strong>Instagram</strong>
                <small>@_.infaan_</small>
              </span>
            </a>

            <a className="premium-contact-button contact-gmail" href="mailto:infaanhameed@gmail.com">
              <span className="premium-contact-icon">
                <GmailIcon />
              </span>
              <span className="premium-contact-copy">
                <strong>Email</strong>
                <small>infaanhameed@gmail.com</small>
              </span>
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}

export default HomePage;
