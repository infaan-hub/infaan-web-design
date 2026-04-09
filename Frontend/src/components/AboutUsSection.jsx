import paymentGatewaysImage from "../assets/Free Payment Method & Credit Card Icon Set.jpg";

const WEBSITE_URL = "https://infaanwebdesign.vercel.app";
const QR_CODE_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(WEBSITE_URL)}`;

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

function AboutUsSection() {
  return (
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
          <div className="about-payment-strip" aria-label="Supported payment gateways">
            <span className="micro-label">payment gateways</span>
            <img
              className="about-payment-strip-image"
              src={paymentGatewaysImage}
              alt="PayPal, Visa, Mastercard, and American Express payment gateways"
              loading="lazy"
            />
          </div>
        </div>

        <div className="about-contact-grid">
          <a
            className="about-qr-card"
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Infaan Web & Design website"
          >
            <img className="about-qr-image" src={QR_CODE_SRC} alt="QR code for Infaan Web & Design website" loading="lazy" />
            <span className="about-qr-copy">
              <strong>Scan to visit our website</strong>
              <small>{WEBSITE_URL}</small>
            </span>
          </a>

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
  );
}

export default AboutUsSection;
