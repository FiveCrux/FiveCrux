// Framework constants for the marketplace
export const VALID_FRAMEWORKS = ['qbcore', 'qbox', 'esx', 'ox', 'standalone'] as const;
export type ValidFramework = typeof VALID_FRAMEWORKS[number];

// Framework display names
export const FRAMEWORK_LABELS: Record<ValidFramework, string> = {
  qbcore: 'QBCore',
  qbox: 'Qbox', 
  esx: 'ESX',
  ox: 'OX',
  standalone: 'Standalone'
};

// Sanitize a submitted framework list. Frameworks are now admin-managed in the
// DB (the `frameworks` table) — the submit form only offers valid options — so
// this no longer whitelists against a fixed set. It just normalizes: trim,
// lowercase, drop empties, dedupe. (Kept sync so create/update paths need no
// DB round-trip.)
export function validateFrameworks(frameworks: string[]): string[] {
  const seen = new Set<string>();
  for (const f of frameworks || []) {
    const slug = String(f || '').trim().toLowerCase();
    if (slug) seen.add(slug);
  }
  return Array.from(seen);
}

// Helper function to check if framework is valid
export function isValidFramework(framework: string): framework is ValidFramework {
  return VALID_FRAMEWORKS.includes(framework as ValidFramework);
}

// Get all frameworks for forms
export const FRAMEWORK_OPTIONS = VALID_FRAMEWORKS.map(framework => ({
  value: framework,
  label: FRAMEWORK_LABELS[framework]
}));
