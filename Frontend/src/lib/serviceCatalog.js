import websiteImage from "../assets/WhatsApp Image 2025-09-21 at 01.56.52_720d7821.jpg";
import systemImage from "../assets/Beds - French Furniture Orlando.jpg";
import designImage from "../assets/BEST SELLERS.jpg";
import paymentImage from "../assets/Free Payment Method & Credit Card Icon Set.jpg";

export const serviceImages = {
  website: websiteImage,
  system_subscription: systemImage,
  system_developing: systemImage,
  system_development: systemImage,
  maintenance: paymentImage,
  digital_ads: paymentImage,
  logo_poster: designImage,
};

export const homeServiceOrder = [
  "website",
  "system_subscription",
  "system_developing",
  "system_development",
  "digital_ads",
  "logo_poster",
  "maintenance",
];

const systemCategories = new Set([
  "system_subscription",
  "system_developing",
  "system_development",
  "maintenance",
]);

export function formatServiceCategoryLabel(category = "") {
  return String(category || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getServiceImage(categoryOrService) {
  const category =
    typeof categoryOrService === "string" ? categoryOrService : categoryOrService?.category;

  if (category && serviceImages[category]) {
    return serviceImages[category];
  }

  if (isSystemService(categoryOrService)) {
    return serviceImages.system_subscription;
  }

  return serviceImages.website;
}

export function getOrderedServices(services, order = homeServiceOrder) {
  const preferred = order
    .map((category) => services.find((service) => service.category === category))
    .filter(Boolean);

  const preferredIds = new Set(preferred.map((service) => service.id));
  const remaining = services.filter((service) => !preferredIds.has(service.id));

  return [...preferred, ...remaining];
}

export function isSystemService(service) {
  if (!service) return false;

  if (systemCategories.has(service.category)) {
    return true;
  }

  const serviceText = [service.name, service.short_description, service.details]
    .join(" ")
    .toLowerCase();

  return ["system", "subscription", "hire", "billing", "weekly", "monthly", "yearly"].some((keyword) =>
    serviceText.includes(keyword)
  );
}

export function getSystemServices(services) {
  return services.filter((service) => isSystemService(service) && service.packages?.length);
}
