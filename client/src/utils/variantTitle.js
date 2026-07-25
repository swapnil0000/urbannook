/**
 * Resolves a product's display title for a given selected variant.
 *
 * Admin can optionally set `variantTitleTemplate` on a product (e.g.
 * "{variant} Cosplay Wooden Katana ({variant} Inspired, 104cm)"). The
 * literal token `{variant}` is replaced with the selected variant's name.
 * Blank/missing template (the default for every product that hasn't opted
 * in) just returns `baseName` unchanged.
 */
export function resolveVariantTitle(baseName, variantTitleTemplate, selectedVariant) {
  const template = variantTitleTemplate?.trim();
  if (!template || !selectedVariant) return baseName;
  return template.split("{variant}").join(selectedVariant);
}

/**
 * Splits a resolved title into a main heading and a parenthetical sub-line,
 * e.g. "Sasuke Cosplay Wooden Katana (Sasuke Inspired, 104cm)" →
 * { main: "Sasuke Cosplay Wooden Katana", sub: "(Sasuke Inspired, 104cm)" }.
 * Titles with no "(" (plain productName, or a template that never used one)
 * just come back as `main` with an empty `sub`.
 */
export function splitTitleForDisplay(title) {
  if (!title) return { main: "", sub: "" };
  const idx = title.indexOf("(");
  if (idx === -1) return { main: title, sub: "" };
  return { main: title.slice(0, idx).trim(), sub: title.slice(idx).trim() };
}
