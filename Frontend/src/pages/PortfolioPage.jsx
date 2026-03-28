function PortfolioPage({ app }) {
  const {
    groupedPortfolio,
    selectedPortfolioService,
    selectedPortfolioServiceId,
    selectPortfolioService,
    continueToPackageTime,
    formatPrice,
  } = app;

  const activeService =
    selectedPortfolioService ||
    groupedPortfolio.find((service) => service.portfolioItems?.length) ||
    null;

  const visibleServices = groupedPortfolio.filter((service) => service.portfolioItems?.length);
  const servicePackages = app.groupedPackages.find((service) => service.id === activeService?.id)?.packages || [];

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>{activeService?.name || "Portfolio"}</h2>
        </div>

        <div className="portfolio-filter-row">
          {visibleServices.map((service) => (
            <button
              key={service.id}
              type="button"
              className={`price-chip ${String(selectedPortfolioServiceId || activeService?.id) === String(service.id) ? "price-chip-active" : ""}`}
              onClick={() => selectPortfolioService(service.id)}
            >
              {service.name}
            </button>
          ))}
        </div>

        <div className="portfolio-grid">
          {(activeService?.portfolioItems || []).map((item) => {
            const linkedPackage = servicePackages.find((pkg) => pkg.id === item.package);
            const monthlyPrice = linkedPackage?.prices.find((price) => price.billing_period === "monthly") || linkedPackage?.prices?.[0];

            return (
              <article key={item.id} className="portfolio-product-card">
                <button type="button" className="portfolio-heart-button" aria-label="View portfolio item">
                  ♡
                </button>
                <div className="portfolio-product-image-wrap">
                  <img src={item.image_data} alt={item.name} className="portfolio-product-image" />
                </div>
                <div className="portfolio-product-content">
                  <h3>{item.name}</h3>
                  <p>{linkedPackage?.title || item.package_title}</p>
                </div>
                <div className="portfolio-product-footer">
                  <div>
                    <strong>
                      {monthlyPrice
                        ? formatPrice(monthlyPrice.amount, monthlyPrice.currency)
                        : "Custom"}
                    </strong>
                  </div>
                  {linkedPackage ? (
                    <button
                      type="button"
                      className="portfolio-cart-button"
                      onClick={() => continueToPackageTime(linkedPackage.id)}
                      aria-label="Choose package"
                    >
                      ↗
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default PortfolioPage;
