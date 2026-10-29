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

  let workingFullText = sourceText || '';

  for (const comp of conflictingComparisons) {
    const fact = factMap.get(comp.field);
    if (!fact) continue;

    const originalQuote = comp.claimRaw;
    const replacementText = fact.displayValue;

    // Suggest replacement in context if exact text found
    if (workingFullText && workingFullText.includes(originalQuote)) {
      workingFullText = workingFullText.replaceAll(originalQuote, replacementText);
    }

    suggestions.push({
      materialId,
      materialVersion,
      eventRevision: currentEventRevision,
      isStale: false,
      field: comp.field,
      originalQuote,
      officialValue: fact.displayValue,
      replacementText,
      suggestedFullText: workingFullText || undefined,
      explanation: `Update ${comp.field.replace('_', ' ')} from "${originalQuote}" to official value "${fact.displayValue}" (Rev ${currentEventRevision}).`,
    });
  }

  return suggestions;
}
