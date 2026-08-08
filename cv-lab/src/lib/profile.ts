import type { Evidence, PrivateProfile } from "./schemas";

const IDENTIFIER_KEYS = /^(fullName|name|email|phone|address|exactAddress|birthDate|nationality|id|privateUrl|links)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const URL = /https?:\/\/\S+/gi;

export function redactText(value: string, identifiers: string[] = []) {
  const withoutKnownIdentifiers = identifiers.filter((item) => item.trim().length >= 3).sort((a, b) => b.length - a.length).reduce((text, identifier) => text.replace(new RegExp(identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[redacted identifier]"), value);
  return withoutKnownIdentifiers.replace(EMAIL, "[redacted email]").replace(PHONE, "[redacted phone]").replace(URL, "[redacted url]");
}

export function stripDirectIdentifiers<T>(value: T, identifiers: string[] = []): T {
  if (typeof value === "string") return redactText(value, identifiers) as T;
  if (Array.isArray(value)) return value.map((item) => stripDirectIdentifiers(item, identifiers)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !IDENTIFIER_KEYS.test(key))
        .map(([key, item]) => [key, stripDirectIdentifiers(item, identifiers)]),
    ) as T;
  }
  return value;
}

export function mergeEvidence(publicEvidence: Evidence[], profile: PrivateProfile) {
  const seen = new Set<string>();
  return [...publicEvidence, ...profile.privateEvidence].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export const emptyPrivateProfile: PrivateProfile = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  privateEvidence: [],
};
