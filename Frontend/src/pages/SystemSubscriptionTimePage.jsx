function SystemSubscriptionTimePage({ app }) {
  const { selectedSystem, navigate, formatPrice, getSystemPlanPreview, selectSystemSubscriptionPlan } = app;

  const monthlyPlan = selectedSystem ? getSystemPlanPreview(selectedSystem, "monthly") : null;
  const yearlyPlan = selectedSystem ? getSystemPlanPreview(selectedSystem, "yearly") : null;
  const plans = [monthlyPlan, yearlyPlan].filter(Boolean);

  return (
    <main className="main-content">
      <section className="section-card">
        <div className="pricing-heading">
          <p className="micro-label">system subscription time</p>
          <h2>Choose monthly or yearly access</h2>
          <span>Select the plan with the exact billing amount you want to use.</span>
        </div>

        {!selectedSystem ? (
          <div className="form-card">
            <p>Select a system first.</p>
            <button type="button" className="solid-button" onClick={() => navigate("/system-subscription")}>
              Go to system subscription
            </button>
          </div>
        ) : (
          <div className="package-stack">
            <div className="pricing-heading">
              <p className="micro-label">selected system</p>
              <h2>{selectedSystem.name}</h2>
              <span>{selectedSystem.summary || "Choose the best billing duration for this system subscription."}</span>
            </div>

            <div className="package-grid">
              {plans.map((plan) => (
                <button
                  key={`${selectedSystem.id}-${plan.billing_period}`}
                  type="button"
                  className="pricing-plan-card duration-card"
                  onClick={() => selectSystemSubscriptionPlan(plan.billing_period)}
                >
                  <div className="pricing-plan-top pricing-tone-gold">
                    <span className="pricing-mini-pill">system</span>
                    <h4>{plan.billing_period}</h4>
                    <div className="pricing-amount">
                      <strong>{formatPrice(plan.amount, plan.currency)}</strong>
                      <span>/{plan.billing_period}</span>
                    </div>
                    <p>{plan.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="hero-actions">
              <button type="button" className="outline-button" onClick={() => navigate("/system-subscription")}>
                Back to system details
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default SystemSubscriptionTimePage;
