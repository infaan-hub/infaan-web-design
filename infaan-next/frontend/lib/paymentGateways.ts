import mastercardImage from "../assets/Beds - French Furniture Orlando.jpg";
import americanExpressImage from "../assets/BEST SELLERS.jpg";
import paypalImage from "../assets/Paypal free icons designed by Roundicons.jpg";
import visaImage from "../assets/Visa free icons designed by Roundicons.jpg";
import mixxImage from "../assets/Yas Mixx Logo PNG Vector (EPS) Free Download.jpg";

export const PAYMENT_GATEWAYS = {
  mastercard: {
    key: "mastercard",
    label: "Mastercard",
    image: mastercardImage,
    type: "card",
    contactField: "card_number",
    contactLabel: "Card number",
    contactPlaceholder: "0000 0000 0000 0000",
  },
  visa: {
    key: "visa",
    label: "Visa",
    image: visaImage,
    type: "card",
    contactField: "card_number",
    contactLabel: "Card number",
    contactPlaceholder: "0000 0000 0000 0000",
  },
  amex: {
    key: "amex",
    label: "American Express",
    image: americanExpressImage,
    type: "card",
    contactField: "card_number",
    contactLabel: "Card number",
    contactPlaceholder: "0000 000000 00000",
  },
  paypal: {
    key: "paypal",
    label: "PayPal",
    image: paypalImage,
    type: "paypal",
    contactField: "paypal_email",
    contactLabel: "PayPal email",
    contactPlaceholder: "paypal@email.com",
  },
  mixx: {
    key: "mixx",
    label: "Mixx by Yas",
    image: mixxImage,
    type: "mobile",
    contactField: "phone_number",
    contactLabel: "Phone number",
    contactPlaceholder: "Phone number to send money",
  },
};

export const PAYMENT_GATEWAY_LIST = [
  PAYMENT_GATEWAYS.mastercard,
  PAYMENT_GATEWAYS.visa,
  PAYMENT_GATEWAYS.amex,
  PAYMENT_GATEWAYS.paypal,
  PAYMENT_GATEWAYS.mixx,
];

export function normalizePaymentMethod(method) {
  if (method === "card") return "mastercard";
  return method || "mastercard";
}

export function getPaymentGateway(method) {
  const normalizedMethod = normalizePaymentMethod(method);
  return PAYMENT_GATEWAYS[normalizedMethod] || PAYMENT_GATEWAYS.mastercard;
}

export function maskPaymentValue(method, payment) {
  const gateway = getPaymentGateway(method);
  const rawValue = String(payment?.[gateway.contactField] || "").trim();

  if (!rawValue) return gateway.label;

  if (gateway.type === "card") {
    const digits = rawValue.replace(/\D/g, "");
    return digits ? `•••• ${digits.slice(-4)}` : rawValue;
  }

  return rawValue;
}

