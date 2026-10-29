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

export interface ReplacementSpan {
  field: string;
  claimId?: string;
  originalValue: string;
  replacementValue: string;
  evidenceQuote?: string;
  originalStart: number;
  originalEnd: number;
  replacementStart: number;
  replacementEnd: number;
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

export interface CorrectionTarget {
  claimId?: string;
  field: string;
  originalValue: string;
  replacementValue: string;
  evidenceQuote?: string;
}

export interface PreciseCorrectionResult {
  originalText: string;
  suggestedText: string;
  spans: ReplacementSpan[];
  hasAmbiguity: boolean;
  unresolvedCount: number;
}

function findAllIndices(text: string, sub: string): number[] {
  const indices: number[] = [];
  if (!sub || !text) return indices;
  let pos = 0;
  while ((pos = text.indexOf(sub, pos)) !== -1) {
    indices.push(pos);
    pos += sub.length;
  }
  return indices;
}

/**
 * Generates precise value span replacements for conflicting claims.
 * Replaces strictly the factual value spans (e.g. "10:00 AM" -> "11:00 AM",
 * "Main Auditorium" -> "Innovation Lab") while preserving surrounding words,
 * punctuation, whitespace, and unrelated content.
 * Disambiguates repeated values using evidence quote context.
 * Requires manual editing when replacement locations cannot be unambiguously determined.
 */
export function generatePreciseCorrection(
  sourceText: string | null | undefined,
  targets: CorrectionTarget[]
): PreciseCorrectionResult {
  if (!sourceText) {
    return {
      originalText: '',
      suggestedText: '',
      spans: [],
      hasAmbiguity: false,
      unresolvedCount: 0,
    };
  }

  const spans: ReplacementSpan[] = [];

  for (const t of targets) {
    const rawVal = t.originalValue;
    const repVal = t.replacementValue;
    const quote = t.evidenceQuote?.trim() || '';

    let originalStart = -1;
    let originalEnd = -1;
    let isAmbiguous = false;
    let ambiguityReason: string | undefined;

    if (quote) {
      const quoteIndices = findAllIndices(sourceText, quote);
      if (quoteIndices.length === 1) {
        const quoteStart = quoteIndices[0];
        // Locate rawVal inside quote
        let valIndicesInQuote = findAllIndices(quote, rawVal);
        if (valIndicesInQuote.length === 1) {
          originalStart = quoteStart + valIndicesInQuote[0];
          originalEnd = originalStart + rawVal.length;
        } else if (valIndicesInQuote.length === 0) {
          // Fallback to case-insensitive lookup within quote
          const quoteLower = quote.toLowerCase();
          const rawLower = rawVal.toLowerCase();
          const lowerValIndices = findAllIndices(quoteLower, rawLower);
          if (lowerValIndices.length === 1) {
            originalStart = quoteStart + lowerValIndices[0];
            originalEnd = originalStart + rawVal.length;
          } else {
            isAmbiguous = true;
            ambiguityReason = `Value "${rawVal}" cannot be uniquely identified inside evidence quote "${quote}". Manual edit required.`;
          }
        } else {
          isAmbiguous = true;
          ambiguityReason = `Value "${rawVal}" appears multiple times within evidence quote. Manual edit required.`;
        }
      } else if (quoteIndices.length > 1) {
        isAmbiguous = true;
        ambiguityReason = `Evidence quote "${quote}" occurs multiple times in source text. Manual edit required.`;
      } else {
        // Quote not found verbatim in source text, fall back to matching rawVal directly
        const valIndices = findAllIndices(sourceText, rawVal);
        if (valIndices.length === 1) {
          originalStart = valIndices[0];
          originalEnd = originalStart + rawVal.length;
        } else if (valIndices.length === 0) {
          isAmbiguous = true;
          ambiguityReason = `Neither evidence quote nor value "${rawVal}" was found in source text. Manual edit required.`;
        } else {
          isAmbiguous = true;
          ambiguityReason = `Value "${rawVal}" occurs ${valIndices.length} times in source text without a distinguishing quote. Manual edit required.`;
        }
      }
    } else {
      // No quote provided: match rawVal directly in sourceText
      const valIndices = findAllIndices(sourceText, rawVal);
      if (valIndices.length === 1) {
        originalStart = valIndices[0];
        originalEnd = originalStart + rawVal.length;
      } else if (valIndices.length === 0) {
        isAmbiguous = true;
        ambiguityReason = `Value "${rawVal}" was not found in source text. Manual edit required.`;
      } else {
        isAmbiguous = true;
        ambiguityReason = `Value "${rawVal}" occurs ${valIndices.length} times in source text. Manual edit required to select the correct occurrence.`;
      }
    }

    spans.push({
      field: t.field,
      claimId: t.claimId,
      originalValue: rawVal,
      replacementValue: repVal,
      evidenceQuote: quote || undefined,
      originalStart,
      originalEnd,
      replacementStart: -1,
      replacementEnd: -1,
      isAmbiguous,
      ambiguityReason,
    });
  }

  // Check for span overlaps among non-ambiguous spans
  for (let i = 0; i < spans.length; i++) {
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i];
      const b = spans[j];
      if (!a.isAmbiguous && !b.isAmbiguous) {
        if (a.originalStart < b.originalEnd && b.originalStart < a.originalEnd) {
          a.isAmbiguous = true;
          a.ambiguityReason = `Overlapping replacement spans detected between "${a.originalValue}" and "${b.originalValue}". Manual edit required.`;
          b.isAmbiguous = true;
          b.ambiguityReason = `Overlapping replacement spans detected between "${a.originalValue}" and "${b.originalValue}". Manual edit required.`;
        }
      }
    }
  }

  // Sort valid non-ambiguous spans ascending by originalStart
  const validSpans = spans.filter((s) => !s.isAmbiguous).sort((a, b) => a.originalStart - b.originalStart);

  let suggestedText = '';
  let cursor = 0;

  for (const s of validSpans) {
    suggestedText += sourceText.slice(cursor, s.originalStart);
    s.replacementStart = suggestedText.length;
    suggestedText += s.replacementValue;
    s.replacementEnd = suggestedText.length;
    cursor = s.originalEnd;
  }
  suggestedText += sourceText.slice(cursor);

  return {
    originalText: sourceText,
    suggestedText,
    spans,
    hasAmbiguity: spans.some((s) => s.isAmbiguous),
    unresolvedCount: spans.filter((s) => s.isAmbiguous).length,
  };
}

/**
 * Applies all conflicting claim replacements to source text, ensuring that
 * multiple conflicts (e.g. venue and time shifts) all reach the final suggested copy.
 */
export function applyAllCorrectionsToText(
  sourceText: string | null,
  comparisons: ComparisonResult[],
  facts: OfficialFact[],
  claims?: Claim[]
): string {
  if (!sourceText) return '';
  const factMap = new Map(facts.map((f) => [f.field, f]));
  const conflicting = comparisons.filter((c) => !c.isMatch);
  if (conflicting.length === 0) return sourceText;

  const targets: CorrectionTarget[] = conflicting.map((comp) => {
    const fact = factMap.get(comp.field);
    const claim = claims?.find((c) => c.id === comp.claimId);
    return {
      claimId: comp.claimId,
      field: comp.field,
      originalValue: claim?.rawValue || comp.claimRaw,
      replacementValue: fact ? fact.displayValue : comp.officialDisplay,
      evidenceQuote: claim?.evidenceQuote,
    };
  });

  const res = generatePreciseCorrection(sourceText, targets);
  return res.suggestedText;
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
  currentEventRevision: number,
  claims?: Claim[]
): CorrectionSuggestion[] {
  const conflictingComparisons = comparisons.filter((c) => !c.isMatch);
  if (conflictingComparisons.length === 0) return [];

  const factMap = new Map(facts.map((f) => [f.field, f]));
  const suggestions: CorrectionSuggestion[] = [];

  // Compute full text with ALL conflicting claims replaced simultaneously
  const fullyCorrectedText = applyAllCorrectionsToText(sourceText, conflictingComparisons, facts, claims);

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
