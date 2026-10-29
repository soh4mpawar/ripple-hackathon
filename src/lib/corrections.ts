// Correction suggestion generator and version management

import type { OfficialFact, Claim, ComparisonResult } from './comparison.ts';

export interface CorrectionSuggestion {
  materialId: string;
  materialVersion: number;
  eventRevision: number;
  isStale: boolean;
  field: string;
  originalQuote: string;
  officialValue: string;
  replacementText: string;
  suggestedFullText?: string;
  explanation: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Applies all conflicting claim replacements to source text, ensuring that
 * multiple conflicts (e.g. venue and time shifts) all reach the final suggested copy.
 */
export function applyAllCorrectionsToText(
  sourceText: string | null,
  comparisons: ComparisonResult[],
  facts: OfficialFact[]
): string {
  if (!sourceText) return '';
  let updated = sourceText;

  const factMap = new Map(facts.map((f) => [f.field, f]));
  const conflicting = comparisons.filter((c) => !c.isMatch);

  for (const comp of conflicting) {
    const fact = factMap.get(comp.field);
    if (!fact) continue;

    const originalQuote = comp.claimRaw;
    const replacement = fact.displayValue;

    if (updated.includes(originalQuote)) {
      updated = updated.replaceAll(originalQuote, replacement);
    } else {
      // Case-insensitive regex fallback
      const re = new RegExp(escapeRegex(originalQuote), 'gi');
      if (re.test(updated)) {
        updated = updated.replace(re, replacement);
      }
    }
  }

  return updated;
}

/**
 * Generates structured correction suggestions for a material's conflicting claims.
 * Suggestion is bound to currentEventRevision.
 */
export function generateCorrections(
  materialId: string,
  materialVersion: number,
  sourceText: string | null,
  comparisons: ComparisonResult[],
  facts: OfficialFact[],
  currentEventRevision: number
): CorrectionSuggestion[] {
  const conflictingComparisons = comparisons.filter((c) => !c.isMatch);
  if (conflictingComparisons.length === 0) return [];

  const factMap = new Map(facts.map((f) => [f.field, f]));
  const suggestions: CorrectionSuggestion[] = [];

  // Compute full text with ALL conflicting claims replaced simultaneously
  const fullyCorrectedText = applyAllCorrectionsToText(sourceText, conflictingComparisons, facts);

  for (const comp of conflictingComparisons) {
    const fact = factMap.get(comp.field);
    if (!fact) continue;

    const originalQuote = comp.claimRaw;
    const replacementText = fact.displayValue;

    suggestions.push({
      materialId,
      materialVersion,
      eventRevision: currentEventRevision,
      isStale: false,
      field: comp.field,
      originalQuote,
      officialValue: fact.displayValue,
      replacementText,
      suggestedFullText: fullyCorrectedText || undefined,
      explanation: `Update ${comp.field.replace('_', ' ')} from "${originalQuote}" to official value "${fact.displayValue}" (Rev ${currentEventRevision}).`,
    });
  }

  return suggestions;
}
