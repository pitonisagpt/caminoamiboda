/** Tiny `{{var}}` substitution — the only interpolation feature this app's
 * UI strings actually need, so no i18n library was pulled in just for this. */
export function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}
