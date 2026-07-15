import pool from "@/lib/db-postgres";

/**
 * Match a product description against the return_policies table.
 *
 * A policy can identify its brand(s) in two places:
 *   - the structured `brand` column (single brand), or
 *   - a delimited list inside `item_description` (multi-brand composite rows),
 *     e.g. "CHUA\n- *Ketotop\n- **Cialis\n- **Janumet\n- **Januvia".
 *
 * Both the product description and every candidate brand term are run through
 * `normalizeForMatching` (strip asterisks, trim, lowercase) before a
 * case-insensitive substring check, so "**JANUMET XR 50 MG..." (product) matches
 * the policy term "**Janumet".
 *
 * Ranking: a brand equal to the product's first word wins; otherwise the longest
 * matched term (most specific) wins. Returns the single best match, or null when
 * nothing matches.
 *
 * Shared by the Log New Expiry auto-fill (app/api/return-policies/match) and the
 * standalone Quick Return Policy Check tool (app/api/return-policy/check) — both
 * must use this exact same matching behavior.
 */
export interface PolicyMatchResult {
  brand: string;
  supplier_name: string;
  return_type: string;
  months_before_expiry: number | null;
  special_conditions: string | null;
}

function normalizeForMatching(text: string): string {
  return text.replace(/\*/g, "").trim().toLowerCase();
}

// Split a policy's item_description into individual brand terms.
// The bracketed "(N MONTH BEFORE)" suffix is dropped from the term itself.
function extractTerms(itemDescription: string | null): string[] {
  if (!itemDescription) return [];
  return itemDescription
    .split(/[\n,]|(?:\s-\s)|^-\s?/gm)
    .map((t) => t.replace(/\(.*?\)/g, "").trim())
    .filter((t) => t.length > 0);
}

function parseMonthsFromDescription(description: string | null, term: string): number | null {
  if (!description) return null;
  const escaped = normalizeForMatching(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return null;
  // Match the term (asterisks in the source are optional) followed by "(N MONTH".
  const match = normalizeForMatching(description).match(
    new RegExp(`${escaped}\\s*\\(\\s*(\\d+)\\s*month`, "i"),
  );
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export async function matchReturnPolicy(description: string): Promise<PolicyMatchResult | null> {
  const trimmed = description.trim();
  if (!trimmed) return null;

  const rows = (
    await pool.query(
      `SELECT brand, supplier_name, return_type, months_before_expiry, special_conditions, item_description
         FROM return_policies`,
    )
  ).rows as Array<{
    brand: string | null;
    supplier_name: string;
    return_type: string;
    months_before_expiry: number | null;
    special_conditions: string | null;
    item_description: string | null;
  }>;

  const normProduct = normalizeForMatching(trimmed);
  const firstWord = normalizeForMatching(trimmed.split(/\s+/)[0] ?? "");

  // For each policy, find its best matching brand term against the product.
  const candidates = rows
    .map((row) => {
      const terms: string[] = [];
      if (row.brand) terms.push(row.brand);
      terms.push(...extractTerms(row.item_description));

      let bestTerm: string | null = null;
      let bestLen = 0;
      let isFirstWord = false;
      for (const term of terms) {
        const norm = normalizeForMatching(term);
        if (norm.length < 2) continue;
        if (!normProduct.includes(norm)) continue;
        const fw = norm === firstWord;
        // Prefer a first-word brand match, else the longest matched term.
        if ((fw && !isFirstWord) || (fw === isFirstWord && norm.length > bestLen)) {
          bestTerm = term;
          bestLen = norm.length;
          isFirstWord = fw;
        }
      }
      return bestTerm ? { row, matchedTerm: bestTerm, len: bestLen, isFirstWord } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.isFirstWord !== b.isFirstWord) return a.isFirstWord ? -1 : 1;
    return b.len - a.len;
  });

  const best = candidates[0].row;
  const matchedTerm = candidates[0].matchedTerm;
  const months =
    best.months_before_expiry ?? parseMonthsFromDescription(best.item_description, matchedTerm);

  return {
    // Report the specific brand term that matched (falls back to the column).
    brand: normalizeForMatching(matchedTerm).toUpperCase() || best.brand || "",
    supplier_name: best.supplier_name,
    return_type: best.return_type,
    months_before_expiry: months,
    special_conditions: best.special_conditions,
  };
}
