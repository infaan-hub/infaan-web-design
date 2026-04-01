import { useEffect, useMemo, useRef } from "react";

function buildReceiptNumber(booking) {
  if (!booking) return "000000000000";
  const date = booking.created_at ? new Date(booking.created_at) : new Date();
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const bookingId = String(booking.id || 0).padStart(6, "0");
  return `${year}${month}${day}${bookingId}`;
}

function buildPendingReceiptNumber(selectedPrice) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const amountSeed = String(Math.round(Number(selectedPrice?.amount || 0))).padStart(6, "0").slice(-6);
  return `${year}${month}${day}${amountSeed}`;
}

function buildBarcodeBars(value) {
  const digits = String(value || "")
    .replace(/[^\d]/g, "")
    .padEnd(12, "0")
    .slice(0, 12)
    .split("");

  const bars = [
    { width: 2, height: 68 },
    { width: 1, height: 68 },
    { width: 2, height: 68 },
  ];

  digits.forEach((digit, index) => {
    const number = Number(digit);
    const pattern = [
      1 + (number % 2),
      1 + ((number + index) % 3),
      1 + ((number + 1) % 2),
      2 + ((number + index) % 2),
    ];

    pattern.forEach((width, patternIndex) => {
      bars.push({
        width,
        height: patternIndex % 2 === 0 ? 54 + ((number + index) % 12) : 66,
      });
    });

    bars.push({ width: 1, height: 52 });
  });

  bars.push(
    { width: 2, height: 68 },
    { width: 1, height: 68 },
    { width: 2, height: 68 }
  );

  return bars;
}

function ReceiptBarcode({ value }) {
  const bars = useMemo(() => buildBarcodeBars(value), [value]);
  const gap = 2;
  const totalWidth = bars.reduce((sum, bar) => sum + bar.width + gap, 0);
  let offset = 0;

  return (
    <svg className="receipt-barcode-svg" viewBox={`0 0 ${totalWidth} 82`} role="img" aria-label={`Receipt barcode ${value}`}>
      {bars.map((bar, index) => {
        const x = offset;
        offset += bar.width + gap;
        return <rect key={`${value}-${index}`} x={x} y={72 - bar.height} width={bar.width} height={bar.height} rx="0.6" />;
      })}
    </svg>
  );
}

function downloadReceiptImage({ receiptNumber, amountText, dateText, customerName, packageName }) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) return;

  const bars = buildBarcodeBars(receiptNumber);

  function roundRect(x, y, width, height, radius, fillStyle) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
  }

  context.fillStyle = "#f3f4fb";
  context.fillRect(0, 0, canvas.width, canvas.height);

  roundRect(145, 120, 610, 1120, 42, "#ffffff");
  roundRect(145, 120, 610, 286, 42, "#ffffff");
  roundRect(210, 760, 480, 96, 22, "#f5f7ff");

  context.fillStyle = "#6a58ff";
  context.beginPath();
  context.arc(450, 238, 34, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 32px Segoe UI Symbol";
  context.textAlign = "center";
  context.fillText("✓", 450, 250);

  context.fillStyle = "#171717";
  context.font = "700 48px Plus Jakarta Sans";
  context.fillText("Thank you!", 450, 320);

  context.fillStyle = "#7f8596";
  context.font = "28px Plus Jakarta Sans";
  context.fillText("Your ticket has been issued successfully", 450, 366);

  context.strokeStyle = "#d1d5df";
  context.setLineDash([8, 8]);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(215, 470);
  context.lineTo(685, 470);
  context.stroke();
  context.setLineDash([]);

  context.textAlign = "left";
  context.fillStyle = "#8c93a3";
  context.font = "22px Plus Jakarta Sans";
  context.fillText("TICKET ID", 210, 550);
  context.fillText("AMOUNT", 560, 550);
  context.fillText("DATE & TIME", 210, 655);

  context.fillStyle = "#121826";
  context.font = "700 32px Plus Jakarta Sans";
  context.fillText(receiptNumber, 210, 592);
  context.fillText(amountText, 560, 592);
  context.fillText(dateText, 210, 698);

  context.beginPath();
  context.fillStyle = "#ff4b3e";
  context.arc(235, 808, 16, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.fillStyle = "#f8b627";
  context.arc(253, 808, 16, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#1b2130";
  context.font = "700 28px Plus Jakarta Sans";
  context.fillText(customerName, 292, 800);
  context.fillStyle = "#4d566a";
  context.font = "24px Plus Jakarta Sans";
  context.fillText(packageName, 292, 838);

  context.strokeStyle = "#eceff5";
  context.beginPath();
  context.moveTo(180, 930);
  context.lineTo(720, 930);
  context.stroke();

  const barcodeAreaWidth = 360;
  const barcodeLeft = 270;
  const barcodeGap = 2;
  const rawBarcodeWidth = bars.reduce((sum, bar) => sum + bar.width * 3 + 4, 0);
  const barcodeScale = Math.min(1, barcodeAreaWidth / rawBarcodeWidth);
  let x = barcodeLeft + (barcodeAreaWidth - rawBarcodeWidth * barcodeScale) / 2;
  context.fillStyle = "#121212";
  bars.forEach((bar) => {
    const scaledWidth = Math.max(1, bar.width * 3 * barcodeScale);
    const scaledHeight = bar.height * barcodeScale;
    context.fillRect(x, 980 - scaledHeight, scaledWidth, scaledHeight);
    x += scaledWidth + barcodeGap * barcodeScale;
  });

  context.fillStyle = "#2d3448";
  context.font = "22px Plus Jakarta Sans";
  context.textAlign = "center";
  context.fillText(receiptNumber, 450, 1045);

  const scallopY = 1218;
  for (let index = 0; index < 7; index += 1) {
    context.beginPath();
    context.fillStyle = "#f3f4fb";
    context.arc(230 + index * 73, scallopY, 20, 0, Math.PI, true);
    context.fill();
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.96);
  link.download = `${receiptNumber}.jpeg`;
  link.click();
}

function BookingPage({ app }) {
  const { selectedPackage, selectedPrice, selectedSystem, submitBooking, bookingSent, loading, lastBooking, currentUser, formatPrice, pendingPayment, navigate } =
    app;
  const autoSubmitRef = useRef(false);
  const autoDownloadRef = useRef("");

  const receiptBooking = useMemo(() => {
    if (lastBooking) return lastBooking;
    if (!pendingPayment || !selectedPackage || !selectedPrice) return null;
    return {
      id: buildPendingReceiptNumber(selectedPrice),
      created_at: new Date().toISOString(),
      package_details: {
        title: pendingPayment?.package_title || selectedSystem?.name || selectedPackage.title,
        amount: selectedPrice.amount,
        currency: selectedPrice.currency,
        billing_period: selectedPrice.billing_period,
      },
      system_details: selectedSystem
        ? {
            name: selectedSystem.name,
          }
        : null,
    };
  }, [lastBooking, pendingPayment, selectedPackage, selectedPrice, selectedSystem]);

  const issuedAt = receiptBooking?.created_at ? new Date(receiptBooking.created_at) : new Date();
  const receiptNumber = lastBooking ? buildReceiptNumber(lastBooking) : buildPendingReceiptNumber(selectedPrice);
  const customerName = currentUser?.first_name || currentUser?.username || "Customer";
  const packageName =
    receiptBooking?.system_details?.name ||
    pendingPayment?.system_name ||
    selectedSystem?.name ||
    selectedPackage?.title ||
    receiptBooking?.package_details?.title ||
    "Selected package";
  const amountText = formatPrice(receiptBooking?.package_details?.amount, receiptBooking?.package_details?.currency);
  const dateText = `${issuedAt.toLocaleDateString()} · ${issuedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const controlDetails = receiptBooking?.control_details || null;

  useEffect(() => {
    if (!selectedPackage || !selectedPrice) {
      return;
    }
    if (!pendingPayment || bookingSent || lastBooking || loading || autoSubmitRef.current) {
      return;
    }
    autoSubmitRef.current = true;
    submitBooking();
  }, [selectedPackage, selectedPrice, pendingPayment, bookingSent, lastBooking, loading, submitBooking]);

  useEffect(() => {
    if (!receiptBooking?.id) {
      return;
    }
    if (autoDownloadRef.current === String(receiptBooking.id)) {
      return;
    }
    autoDownloadRef.current = String(receiptBooking.id);
    downloadReceiptImage({
      receiptNumber,
      amountText,
      dateText,
      customerName,
      packageName,
    });
  }, [receiptBooking, receiptNumber, amountText, dateText, customerName, packageName]);

  return (
    <main className="main-content">
      <section className="section-card single-column-card">
        <div className="section-headline">
          <p className="micro-label">booking</p>
          <h2>Booking</h2>
        </div>

        {receiptBooking ? (
          <div className="ticket-wrap">
            <div className="success-ticket receipt-ticket">
              <div className="ticket-top">
                <div className="ticket-icon receipt-ticket-icon">✓</div>
                <h3>Thank you!</h3>
                <p>Your ticket has been issued successfully</p>
              </div>

              <div className="ticket-dash" />

              <div className="receipt-meta-grid">
                <div>
                  <span>Ticket ID</span>
                  <strong>{receiptNumber}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{amountText}</strong>
                </div>
                <div>
                  <span>Date & time</span>
                  <strong>{dateText}</strong>
                </div>
              </div>

              <div className="ticket-payment-card receipt-user-card">
                <div className="ticket-payment-logo">
                  <span className="dot-red" />
                  <span className="dot-gold" />
                </div>
                <div>
                  <strong>{customerName}</strong>
                  <span>{packageName}</span>
                </div>
              </div>

              <div className="ticket-dash light" />

              <div className="receipt-admin-note">
                {lastBooking
                  ? "Booking sent to admin successfully."
                  : "Receipt is ready now. Booking is being sent silently to admin in the background."}
              </div>

              {controlDetails ? (
                <div className="receipt-control-block">
                  <div className="section-headline receipt-control-head">
                    <div>
                      <p className="micro-label">system access</p>
                      <h3>License and API keys</h3>
                    </div>
                  </div>
                  <div className="receipt-control-grid">
                    <div className="credential-card">
                      <span className="micro-label">license key</span>
                      <strong>{controlDetails.license_key}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">api key</span>
                      <strong>{controlDetails.api_key}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">admin url</span>
                      <strong>{controlDetails.admin_url || controlDetails.public_url || "Will be added by admin"}</strong>
                    </div>
                    <div className="credential-card">
                      <span className="micro-label">connection</span>
                      <strong>{String(controlDetails.connection_status || "active").replace("_", " ")}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="receipt-barcode-wrap">
                <ReceiptBarcode value={receiptNumber} />
                <div className="receipt-barcode-text">{receiptNumber}</div>
              </div>

              <div className="hero-actions receipt-actions">
                <button
                  type="button"
                  className="solid-button"
                  onClick={() =>
                    downloadReceiptImage({
                      receiptNumber,
                      amountText,
                      dateText,
                      customerName,
                      packageName,
                    })
                  }
                >
                  Download JPEG receipt
                </button>
                <button type="button" className="outline-button" onClick={() => navigate("/dashboard")}>
                  View dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="form-card">
            <h3>{selectedPackage?.title || "Selected package"}</h3>
            <p>
              {selectedPrice?.billing_period || "billing"} - {formatPrice(selectedPrice?.amount || "", selectedPrice?.currency || "USD")}
            </p>
            <div className="hero-actions">
              <button type="button" className="solid-button" onClick={() => navigate("/billing")}>
                Complete billing first
              </button>
              <button type="button" className="outline-button" onClick={() => navigate("/package")}>
                Change package
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default BookingPage;
