/**
 * Derive a URL-safe slug from a human-entered project name.
 * Lowercases, collapses any run of non-alphanumeric characters into a single
 * hyphen, and trims leading/trailing hyphens.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
