"use client";

import { useEffect, useState } from "react";

export type FrameworkOption = { value: string; label: string };

/**
 * Client hook returning the admin-managed framework list ({value, label}) from
 * /api/frameworks. Empty array until loaded (and on error) so callers can render
 * gracefully. `value` is the slug used in filters; `label` is the display name.
 */
export function useFrameworks(): FrameworkOption[] {
  const [frameworks, setFrameworks] = useState<FrameworkOption[]>([]);
  useEffect(() => {
    fetch("/api/frameworks")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d) =>
          Array.isArray(d?.frameworks) &&
          setFrameworks(d.frameworks.map((f: any) => ({ value: f.slug, label: f.name })))
      )
      .catch(() => {});
  }, []);
  return frameworks;
}
