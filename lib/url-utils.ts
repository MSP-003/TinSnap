import { AppSettings } from "./types";

export function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isDomainAllowed(
  urlStr: string,
  allowedDomains: string[]
): boolean {
  if (allowedDomains.length === 0) return true;
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    return allowedDomains.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith("." + d);
    });
  } catch {
    return false;
  }
}

export function extractCodeFromUrl(
  urlStr: string,
  paramName: string
): string | null {
  try {
    const url = new URL(urlStr);
    return url.searchParams.get(paramName);
  } catch {
    return null;
  }
}

export function buildClaimUrl(code: string, template: string): string {
  return template.replace("{CODE}", encodeURIComponent(code));
}

export function processQrText(
  rawText: string,
  settings: AppSettings
): { claimUrl: string | null; codeValue: string | null; isValidDomain: boolean } {
  if (isValidHttpUrl(rawText)) {
    const isValid = isDomainAllowed(rawText, settings.allowedDomains);
    const code = extractCodeFromUrl(rawText, settings.codeParamName);
    return { claimUrl: rawText, codeValue: code, isValidDomain: isValid };
  }

  const claimUrl = buildClaimUrl(rawText, settings.claimUrlTemplate);
  const isValid = isDomainAllowed(claimUrl, settings.allowedDomains);
  return { claimUrl, codeValue: rawText, isValidDomain: isValid };
}

export function shortenUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url;
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const shortened = u.hostname + (path.length > 20 ? path.slice(0, 20) + "..." : path);
    return shortened.length > maxLength
      ? shortened.slice(0, maxLength - 3) + "..."
      : shortened;
  } catch {
    return url.slice(0, maxLength - 3) + "...";
  }
}
