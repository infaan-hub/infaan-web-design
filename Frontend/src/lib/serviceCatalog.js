export const serviceImages = {
  website:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  system_subscription:
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  system_developing:
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  system_development:
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  maintenance:
    "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80",
  digital_ads:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  logo_poster:
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
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
