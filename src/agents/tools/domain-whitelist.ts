/**
 * Domain Whitelist Module
 *
 * Provides utilities to validate URLs and domains against an allowlist
 * configured via the ALLOWED_DOMAINS environment variable.
 *
 * Format:
 * - "*" = allow all domains
 * - "domain1.com,domain2.com,..." = comma-separated list of allowed domains
 *
 * Subdomains are automatically allowed (e.g., "github.com" allows "api.github.com")
 */

export type DomainWhitelistConfig = {
    allowAll: boolean;
    domains: Set<string>;
};

let cachedConfig: DomainWhitelistConfig | null = null;

/**
 * Parses the ALLOWED_DOMAINS environment variable and returns the whitelist configuration.
 * Results are cached for performance.
 */
export function getDomainWhitelistConfig(): DomainWhitelistConfig {
    if (cachedConfig) return cachedConfig;

    const raw = (process.env.ALLOWED_DOMAINS ?? "*").trim();

    if (raw === "*" || raw === "") {
        cachedConfig = { allowAll: true, domains: new Set() };
        return cachedConfig;
    }

    const domains = new Set<string>();
    const parts = raw.split(",");

    for (const part of parts) {
        const domain = normalizeDomain(part);
        if (domain) {
            domains.add(domain);
        }
    }

    // If no valid domains after parsing, allow all (fallback)
    if (domains.size === 0) {
        cachedConfig = { allowAll: true, domains: new Set() };
        return cachedConfig;
    }

    cachedConfig = { allowAll: false, domains };
    return cachedConfig;
}

/**
 * Normalizes a domain string by removing protocol, path, and converting to lowercase.
 */
function normalizeDomain(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return "";

    // Remove protocol if present
    let domain = trimmed.replace(/^https?:\/\//, "");

    // Remove path if present
    const slashIndex = domain.indexOf("/");
    if (slashIndex > 0) {
        domain = domain.substring(0, slashIndex);
    }

    // Remove port if present
    const colonIndex = domain.indexOf(":");
    if (colonIndex > 0) {
        domain = domain.substring(0, colonIndex);
    }

    // Remove www. prefix for consistency
    if (domain.startsWith("www.")) {
        domain = domain.substring(4);
    }

    return domain;
}

/**
 * Extracts the domain from a URL string.
 */
export function extractDomainFromUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        let hostname = parsed.hostname.toLowerCase();

        // Remove www. prefix for consistency
        if (hostname.startsWith("www.")) {
            hostname = hostname.substring(4);
        }

        return hostname;
    } catch {
        return null;
    }
}

/**
 * Checks if a domain matches any allowed domain in the whitelist.
 * Subdomains are automatically allowed (e.g., "api.github.com" matches "github.com").
 */
function isDomainAllowed(domain: string, allowedDomains: Set<string>): boolean {
    // Direct match
    if (allowedDomains.has(domain)) return true;

    // Check if it's a subdomain of an allowed domain
    for (const allowed of allowedDomains) {
        if (domain.endsWith(`.${allowed}`)) {
            return true;
        }
    }

    return false;
}

/**
 * Validates if a URL is allowed based on the domain whitelist.
 * Returns an object with the validation result and error message if blocked.
 */
export function validateUrlAccess(url: string): {
    allowed: boolean;
    domain: string | null;
    error?: string;
} {
    const config = getDomainWhitelistConfig();

    // Allow all if wildcard
    if (config.allowAll) {
        return { allowed: true, domain: extractDomainFromUrl(url) };
    }

    const domain = extractDomainFromUrl(url);
    if (!domain) {
        return {
            allowed: false,
            domain: null,
            error: "Invalid URL: could not extract domain.",
        };
    }

    if (isDomainAllowed(domain, config.domains)) {
        return { allowed: true, domain };
    }

    const allowedList = Array.from(config.domains).slice(0, 5).join(", ");
    const suffix = config.domains.size > 5 ? ` and ${config.domains.size - 5} more` : "";

    return {
        allowed: false,
        domain,
        error: `Domain "${domain}" is not in the allowed list. Allowed domains: ${allowedList}${suffix}. Configure ALLOWED_DOMAINS to add more domains.`,
    };
}

/**
 * Validates if a search query domain filter is allowed.
 * Used when search results might be filtered by domain.
 */
export function validateSearchDomain(domain: string): {
    allowed: boolean;
    error?: string;
} {
    const config = getDomainWhitelistConfig();

    if (config.allowAll) {
        return { allowed: true };
    }

    const normalized = normalizeDomain(domain);
    if (!normalized) {
        return { allowed: true }; // Empty domain filter, allow
    }

    if (isDomainAllowed(normalized, config.domains)) {
        return { allowed: true };
    }

    return {
        allowed: false,
        error: `Domain "${normalized}" is not in the allowed list. Configure ALLOWED_DOMAINS to add this domain.`,
    };
}

/**
 * Clears the cached configuration. Useful for testing or runtime reloads.
 */
export function clearDomainWhitelistCache(): void {
    cachedConfig = null;
}

/**
 * Returns a blocked access response payload for tools.
 */
export function blockedDomainPayload(domain: string | null, url: string): Record<string, unknown> {
    const config = getDomainWhitelistConfig();
    const allowedList = Array.from(config.domains).slice(0, 10);

    return {
        error: "domain_blocked",
        message: `Access to "${domain ?? url}" is blocked by domain whitelist policy.`,
        blocked_domain: domain,
        blocked_url: url,
        allowed_domains: allowedList,
        allowed_count: config.domains.size,
        docs: "Configure ALLOWED_DOMAINS environment variable to modify the whitelist.",
    };
}

/**
 * Type guard for checking if whitelist is active (not allowing all).
 */
export function isWhitelistActive(): boolean {
    return !getDomainWhitelistConfig().allowAll;
}

export const __testing = {
    normalizeDomain,
    isDomainAllowed,
    clearDomainWhitelistCache,
} as const;
