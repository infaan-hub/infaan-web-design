function PortfolioPage({ app }) {
  const { groupedPortfolio } = app;
  const visibleServices = groupedPortfolio.filter((service) => service.portfolioItems?.length);

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="section-headline">
          <p className="micro-label">portfolio</p>
          <h2>Service Portfolio</h2>
        </div>

        <div className="package-stack">
          {visibleServices.map((service) => (
            <section key={service.id} className="section-card">
              <div className="section-headline">
                <div>
                  <p className="micro-label">{service.category.replaceAll("_", " ")}</p>
                  <h2>{service.name}</h2>
                </div>
              </div>

              <div className="portfolio-grid">
                {service.portfolioItems.map((item) => (
                  <article key={item.id} className="portfolio-product-card portfolio-view-card">
                    <div className="portfolio-product-image-wrap">
                      <img src={item.image_data} alt={item.name} className="portfolio-product-image" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default PortfolioPage;
