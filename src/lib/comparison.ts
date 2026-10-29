// Pure TypeScript Comparison and Normalization Engine for Ripple

export type OfficialField = 'event_date' | 'start_time' | 'venue' | 'registration_deadline';

export type ClaimReviewState = 'proposed' | 'confirmed' | 'rejected' | 'needs_clarification';

export type MaterialStatus = 'current' | 'conflicting' | 'needs_review' | 'unverified';

export interface OfficialFact {
  id: string;
  field: OfficialField;
  displayValue: string;
  normalizedValue: string;
  revision: number;
}

export interface Claim {
  id: string;
  materialId: string;
  materialVersion: number;
  factId?: string | null;
  field: OfficialField;
  rawValue: string;
  normalizedValue?: string | null;
  evidenceQuote: string;
  evidenceLocation?: string | null;
  reviewState: ClaimReviewState;
  ambiguityReason?: string | null;
}

export interface ComparisonResult {
  claimId: string;
  field: OfficialField;
  materialId: string;
  isMatch: boolean;
  officialValue: string;
  claimValue: string;
  officialDisplay: string;
  claimRaw: string;
  reason?: string;
}

export interface MaterialComparisonSummary {
  materialId: string;
  materialVersion: number;
  status: MaterialStatus;
  statusLabel: string;
  conflictCount: number;
  confirmedCount: number;
  unresolvedCount: number;
  comparisons: ComparisonResult[];
  lastCheckedRevision: number;
}

export interface ClaimValidationInput {
  field: OfficialField;
  rawValue: string;
  evidenceQuote?: string | null;
  sourceText?: string | null;
}

/**
 * Validates complete claim integrity:
 * 1. Field classification
 * 2. Rejection of synthetic "Updated in v..." quotes
 * 3. Verbatim occurrence of quote in sourceText (when sourceText is present)
 * 4. Evidence quote supports the claimed value (quote contains claimed value)
 * 5. Preserves image claims when sourceText is absent
 */
export function validateClaimIntegrity(input: ClaimValidationInput): {
  valid: boolean;
  error?: string;
} {
  const { field, rawValue, evidenceQuote, sourceText } = input;

  if (!rawValue || !rawValue.trim()) {
    return { valid: false, error: 'Claim value cannot be empty.' };
  }

  const cleanVal = rawValue.trim();

  // Basic field classification validation
  if (field === 'start_time') {
    if (!/\d{1,2}(:\d{2})|\d{1,2}\s*(am|pm)/i.test(cleanVal)) {
      return { valid: false, error: 'Start time must contain a valid time expression (e.g. 10:00 AM).' };
    }
  } else if (field === 'event_date') {
    if (!/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i.test(cleanVal)) {
      return { valid: false, error: 'Event date must contain a recognizable date expression.' };
    }
  } else if (field === 'registration_deadline') {
    if (!/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i.test(cleanVal)) {
      return { valid: false, error: 'Registration deadline must contain a recognizable date expression.' };
    }
  } else if (field === 'venue') {
    if (/^\d{1,2}(:\d{2})?\s*(am|pm)$/i.test(cleanVal)) {
      return { valid: false, error: 'A time value cannot be classified as a venue.' };
    }
  }

  // Reject synthetic quotes across all material kinds
  if (evidenceQuote && evidenceQuote.startsWith('Updated in v')) {
    return { valid: false, error: 'Synthetic evidence quotes ("Updated in v...") are not permitted.' };
  }

  // If sourceText is present (text material), perform strict substring and quote-support checks
  if (sourceText && typeof sourceText === 'string' && sourceText.trim().length > 0) {
    if (!evidenceQuote || !evidenceQuote.trim()) {
      return { valid: false, error: 'Evidence quote is required for text materials.' };
    }

    // Evidence quote must occur verbatim in sourceText
    if (!sourceText.includes(evidenceQuote)) {
      return { valid: false, error: `Evidence quote "${evidenceQuote}" does not occur verbatim in source text.` };
    }

    // Evidence quote must support the claimed value
    const cleanQuote = evidenceQuote.toLowerCase().replace(/\s+/g, ' ').trim();
    const cleanClaimed = cleanVal.toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, '');

    if (!cleanQuote.includes(cleanClaimed)) {
      return {
        valid: false,
        error: `Claimed ${field.replace('_', ' ')} "${cleanVal}" is not supported by evidence quote "${evidenceQuote}".`,
      };
    }
  }

  return { valid: true };
}

/**
 * Normalizes venue by trimming, collapsing spaces, and lowercasing for strict comparison.
 * Note: No fuzzy matching!
 */
export function normalizeVenue(venue: string): string {
  if (!venue) return '';
  return venue
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Normalizes local time to 24-hour format HH:mm.
 */
export function normalizeTime(timeStr: string): string {
  if (!timeStr) return '';
  const cleaned = timeStr.trim().toLowerCase();
  
  // Match patterns like "10:00 am", "10am", "10:00pm", "10:30", "14:45"
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) {
    // Attempt fallback parsing if date-like string was passed
    const parsed = new Date(`1970-01-01T${cleaned}`);
    if (!isNaN(parsed.getTime())) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return cleaned;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridian = match[3];

  if (meridian === 'pm' && hours < 12) {
    hours += 12;
  } else if (meridian === 'am' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

/**
 * Normalizes date to ISO calendar format: YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();

  // Pattern: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Pattern: "October 31, 2026" or "Oct 31, 2026" or "31 October 2026"
  const monthNameMatch = cleaned.match(/([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i) 
    || cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+),?\s+(\d{4})/i);

  if (monthNameMatch) {
    let monthPart = monthNameMatch[1].toLowerCase();
    let dayPart = monthNameMatch[2];
    let yearPart = monthNameMatch[3];

    // Check if day was first
    if (/^\d+$/.test(monthPart)) {
      dayPart = monthNameMatch[1];
      monthPart = monthNameMatch[2].toLowerCase();
      yearPart = monthNameMatch[3];
    }

    const monthNum = MONTH_MAP[monthPart];
    if (monthNum) {
      const dayFormatted = String(parseInt(dayPart, 10)).padStart(2, '0');
      return `${yearPart}-${monthNum}-${dayFormatted}`;
    }
  }

  // Fallback via Date.parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return cleaned.toLowerCase();
}

/**
 * Normalizes registration deadline to ISO representation: YYYY-MM-DD HH:mm (or with TZ).
 */
export function normalizeDeadline(deadlineStr: string): string {
  if (!deadlineStr) return '';
  const cleaned = deadlineStr.trim();

  // Pattern: Look for time component anywhere in string
  // e.g. "6:00 PM", "6pm", "18:00", "18:00:00"
  const timeRegex = /(?:at\s+)?(\b\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))\b|\b[0-2]?\d:[0-5]\d(?::[0-5]\d)?\b)/i;
  const timeMatch = cleaned.match(timeRegex);

  if (timeMatch) {
    const rawTime = timeMatch[1];
    const rawDate = cleaned.replace(timeMatch[0], '').replace(/,\s*$/, '').trim();
    const normalizedDatePart = normalizeDate(rawDate);
    const normalizedTimePart = normalizeTime(rawTime);

    if (normalizedDatePart && normalizedTimePart) {
      return `${normalizedDatePart} ${normalizedTimePart}`;
    }
  }

  // Direct Date.parse fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  return cleaned.toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize any supported field value based on its field type.
 */
export function normalizeFieldValue(field: OfficialField, value: string): string {
  switch (field) {
    case 'event_date':
      return normalizeDate(value);
    case 'start_time':
      return normalizeTime(value);
    case 'venue':
      return normalizeVenue(value);
    case 'registration_deadline':
      return normalizeDeadline(value);
  }
}

/**
 * Compares confirmed claims of a material against the official facts of an event.
 * Follows all Ripple domain rules:
 * - Only confirmed claims are compared.
 * - Confirmed claims matching official facts are current.
 * - Any confirmed mismatch marks the material as conflicting.
 * - Materials with 0 confirmed claims are 'unverified' ("No confirmed facts").
 * - Materials with no conflicts but unresolved claims ('proposed' | 'needs_clarification') are 'needs_review'.
 */
export function compareMaterialClaims(
  materialId: string,
  materialVersion: number,
  claims: Claim[],
  facts: OfficialFact[],
  currentRevision: number,
  sourceText?: string | null
): MaterialComparisonSummary {
  // Filter claims strictly belonging to this material and current version
  const relevantClaims = claims.filter(
    (c) => c.materialId === materialId && c.materialVersion === materialVersion
  );

  const confirmedClaims = relevantClaims.filter((c) => c.reviewState === 'confirmed');
  const unresolvedClaims = relevantClaims.filter(
    (c) => c.reviewState === 'proposed' || c.reviewState === 'needs_clarification'
  );

  const factsByField = new Map<OfficialField, OfficialFact>();
  for (const fact of facts) {
    factsByField.set(fact.field, fact);
  }

  const comparisons: ComparisonResult[] = [];
  let conflictCount = 0;
  let unsupportedCount = 0;

  for (const claim of confirmedClaims) {
    const officialFact = factsByField.get(claim.field);
    if (!officialFact) {
      // Official fact missing for this field
      continue;
    }

    // Validate complete claim integrity (source support, quote support, field classification)
    const validation = validateClaimIntegrity({
      field: claim.field,
      rawValue: claim.rawValue,
      evidenceQuote: claim.evidenceQuote,
      sourceText,
    });
    const isSupported = validation.valid;

    if (!isSupported) {
      unsupportedCount++;
    }

    const officialNorm = officialFact.normalizedValue;
    const claimNorm = claim.normalizedValue || normalizeFieldValue(claim.field, claim.rawValue);

    // To match, the claim must BOTH equal the official fact AND be validated as supported
    const isMatch = isSupported && officialNorm === claimNorm;
    if (!isMatch) {
      conflictCount++;
    }

    comparisons.push({
      claimId: claim.id,
      field: claim.field,
      materialId,
      isMatch,
      officialValue: officialNorm,
      claimValue: claimNorm,
      officialDisplay: officialFact.displayValue,
      claimRaw: claim.rawValue,
      reason: isMatch
        ? undefined
        : !isSupported
        ? validation.error
        : `Official ${claim.field.replace('_', ' ')} is "${officialFact.displayValue}", but material states "${claim.rawValue}"`,
    });
  }

  // Derive status
  let status: MaterialStatus;
  let statusLabel: string;

  if (conflictCount > 0) {
    status = 'conflicting';
    statusLabel = `${conflictCount} Conflicted Fact${conflictCount > 1 ? 's' : ''}`;
  } else if (confirmedClaims.length === 0) {
    status = 'unverified';
    statusLabel = unresolvedClaims.length > 0 ? 'Unreviewed Claims' : 'No Confirmed Facts';
  } else if (unresolvedClaims.length > 0) {
    status = 'needs_review';
    statusLabel = `${unresolvedClaims.length} Pending Review`;
  } else {
    status = 'current';
    statusLabel = 'All Verified Match';
  }

  return {
    materialId,
    materialVersion,
    status,
    statusLabel,
    conflictCount,
    confirmedCount: confirmedClaims.length,
    unresolvedCount: unresolvedClaims.length,
    comparisons,
    lastCheckedRevision: currentRevision,
  };
}
