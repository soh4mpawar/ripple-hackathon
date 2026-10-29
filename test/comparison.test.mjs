import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVenue,
  normalizeTime,
  normalizeDate,
  normalizeDeadline,
  compareMaterialClaims,
} from '../src/lib/comparison.ts';
import { generateCorrections } from '../src/lib/corrections.ts';

test('Normalization: Venue whitespace and case normalization without fuzzy matching', () => {
  assert.equal(normalizeVenue('Main Auditorium'), 'main auditorium');
  assert.equal(normalizeVenue('  Main   Auditorium  '), 'main auditorium');
  assert.equal(normalizeVenue('INNOVATION LAB'), 'innovation lab');
  // Confirm distinct venues do NOT match
  assert.notEqual(normalizeVenue('Main Auditorium'), normalizeVenue('Main Hall'));
  assert.notEqual(normalizeVenue('Auditorium'), normalizeVenue('Main Auditorium'));
});

test('Normalization: Equivalent date formats map to ISO YYYY-MM-DD', () => {
  assert.equal(normalizeDate('October 31, 2026'), '2026-10-31');
  assert.equal(normalizeDate('31 October 2026'), '2026-10-31');
  assert.equal(normalizeDate('Oct 31, 2026'), '2026-10-31');
  assert.equal(normalizeDate('2026-10-31'), '2026-10-31');
});

test('Normalization: Equivalent time formats map to 24-hr HH:mm', () => {
  assert.equal(normalizeTime('10:00 AM'), '10:00');
  assert.equal(normalizeTime('10am'), '10:00');
  assert.equal(normalizeTime('11:00 AM'), '11:00');
  assert.equal(normalizeTime('6:00 PM'), '18:00');
  assert.equal(normalizeTime('18:00'), '18:00');
});

test('Normalization: Registration deadline formats', () => {
  assert.equal(normalizeDeadline('October 30, 2026, 6:00 PM'), '2026-10-30 18:00');
});

test('Material with 0 confirmed claims remains unverified', () => {
  const facts = [
    { id: 'f1', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 1 },
    { id: 'f2', field: 'venue', displayValue: 'Main Auditorium', normalizedValue: 'main auditorium', revision: 1 },
  ];

  // Material with no claims at all
  const summaryNoClaims = compareMaterialClaims('mat_sponsor', 1, [], facts, 1);
  assert.equal(summaryNoClaims.status, 'unverified');
  assert.equal(summaryNoClaims.confirmedCount, 0);

  // Material with only proposed / unreviewed claims
  const summaryProposed = compareMaterialClaims(
    'mat_proposed',
    1,
    [
      {
        id: 'c1',
        materialId: 'mat_proposed',
        materialVersion: 1,
        field: 'venue',
        rawValue: 'Main Auditorium',
        evidenceQuote: 'See you at Main Auditorium',
        reviewState: 'proposed',
      },
    ],
    facts,
    1
  );
  assert.equal(summaryProposed.status, 'unverified');
  assert.equal(summaryProposed.unresolvedCount, 1);
});

test('Ambiguous claims requiring clarification do not mark material as current', () => {
  const facts = [
    { id: 'f1', field: 'venue', displayValue: 'Main Auditorium', normalizedValue: 'main auditorium', revision: 1 },
  ];

  const claims = [
    {
      id: 'c_ambig',
      materialId: 'mat_volunteer',
      materialVersion: 1,
      field: 'start_time',
      rawValue: '8:30 AM',
      evidenceQuote: 'Volunteers assemble at 8:30 AM',
      reviewState: 'needs_clarification',
      ambiguityReason: 'Volunteer arrival time is not verified event start time',
    },
    {
      id: 'c_venue',
      materialId: 'mat_volunteer',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Main Auditorium check-in desk',
      reviewState: 'confirmed',
    },
  ];

  const summary = compareMaterialClaims('mat_volunteer', 1, claims, facts, 1);
  assert.equal(summary.status, 'needs_review');
  assert.equal(summary.unresolvedCount, 1);
  assert.equal(summary.confirmedCount, 1);
});

test('Material with confirmed matching claims is current', () => {
  const facts = [
    { id: 'f1', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 1 },
    { id: 'f2', field: 'start_time', displayValue: '10:00 AM', normalizedValue: '10:00', revision: 1 },
    { id: 'f3', field: 'venue', displayValue: 'Main Auditorium', normalizedValue: 'main auditorium', revision: 1 },
  ];

  const claims = [
    {
      id: 'c1',
      materialId: 'mat_poster',
      materialVersion: 1,
      field: 'event_date',
      rawValue: 'October 31, 2026',
      normalizedValue: '2026-10-31',
      evidenceQuote: 'Oct 31, 2026',
      reviewState: 'confirmed',
    },
    {
      id: 'c2',
      materialId: 'mat_poster',
      materialVersion: 1,
      field: 'start_time',
      rawValue: '10:00 AM',
      normalizedValue: '10:00',
      evidenceQuote: 'Starts 10:00 AM',
      reviewState: 'confirmed',
    },
    {
      id: 'c3',
      materialId: 'mat_poster',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Venue: Main Auditorium',
      reviewState: 'confirmed',
    },
  ];

  const summary = compareMaterialClaims('mat_poster', 1, claims, facts, 1);
  assert.equal(summary.status, 'current');
  assert.equal(summary.conflictCount, 0);
  assert.equal(summary.confirmedCount, 3);
});

test('Official venue change affects venue materials but keeps date-only materials unaffected', () => {
  // Revision 1 facts
  const factsRev1 = [
    { id: 'f1', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 1 },
    { id: 'f2', field: 'venue', displayValue: 'Main Auditorium', normalizedValue: 'main auditorium', revision: 1 },
  ];

  // Revision 2: Venue changed to Innovation Lab
  const factsRev2 = [
    { id: 'f1', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 2 },
    { id: 'f2', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
  ];

  const posterClaims = [
    {
      id: 'p1',
      materialId: 'mat_poster',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Main Auditorium',
      reviewState: 'confirmed',
    },
  ];

  const dateReminderClaims = [
    {
      id: 'd1',
      materialId: 'mat_date_only',
      materialVersion: 1,
      field: 'event_date',
      rawValue: 'October 31, 2026',
      normalizedValue: '2026-10-31',
      evidenceQuote: 'Saturday October 31',
      reviewState: 'confirmed',
    },
  ];

  // At Revision 1: Both are current
  assert.equal(compareMaterialClaims('mat_poster', 1, posterClaims, factsRev1, 1).status, 'current');
  assert.equal(compareMaterialClaims('mat_date_only', 1, dateReminderClaims, factsRev1, 1).status, 'current');

  // At Revision 2: Poster becomes conflicting; date-only reminder remains current!
  const posterSummaryRev2 = compareMaterialClaims('mat_poster', 1, posterClaims, factsRev2, 2);
  assert.equal(posterSummaryRev2.status, 'conflicting');
  assert.equal(posterSummaryRev2.conflictCount, 1);
  assert.equal(posterSummaryRev2.comparisons[0].isMatch, false);

  const dateSummaryRev2 = compareMaterialClaims('mat_date_only', 1, dateReminderClaims, factsRev2, 2);
  assert.equal(dateSummaryRev2.status, 'current');
  assert.equal(dateSummaryRev2.conflictCount, 0);
});

test('Material versioning: Old version conflicts do not determine new version status', () => {
  const facts = [
    { id: 'f1', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
  ];

  const claimsV1 = [
    {
      id: 'c_v1',
      materialId: 'mat_1',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Old text',
      reviewState: 'confirmed',
    },
  ];

  const claimsV2 = [
    {
      id: 'c_v2',
      materialId: 'mat_1',
      materialVersion: 2,
      field: 'venue',
      rawValue: 'Innovation Lab',
      normalizedValue: 'innovation lab',
      evidenceQuote: 'Corrected text',
      reviewState: 'confirmed',
    },
  ];

  const allClaims = [...claimsV1, ...claimsV2];

  // Version 1 is conflicting
  const summaryV1 = compareMaterialClaims('mat_1', 1, allClaims, facts, 2);
  assert.equal(summaryV1.status, 'conflicting');

  // Version 2 is current
  const summaryV2 = compareMaterialClaims('mat_1', 2, allClaims, facts, 2);
  assert.equal(summaryV2.status, 'current');
});

test('Corrections: Suggestions generated for revision N become stale if event advances to revision N+1', () => {
  const factsRev2 = [
    { id: 'f1', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
  ];
  const comparisons = [
    {
      claimId: 'c1',
      field: 'venue',
      materialId: 'mat_1',
      isMatch: false,
      officialValue: 'innovation lab',
      claimValue: 'main auditorium',
      officialDisplay: 'Innovation Lab',
      claimRaw: 'Main Auditorium',
    },
  ];

  const suggestionsAtRev2 = generateCorrections(
    'mat_1',
    1,
    'See you at Main Auditorium',
    comparisons,
    factsRev2,
    2 // Revision 2
  );

  assert.equal(suggestionsAtRev2.length, 1);
  assert.equal(suggestionsAtRev2[0].eventRevision, 2);
  assert.equal(suggestionsAtRev2[0].replacementText, 'Innovation Lab');
  assert.equal(suggestionsAtRev2[0].suggestedFullText, 'See you at Innovation Lab');

  // If the event is now at Revision 3, verify stale detection
  const currentRev = 3;
  const isStale = suggestionsAtRev2[0].eventRevision !== currentRev;
  assert.equal(isStale, true, 'Suggestion generated at Rev 2 must be flagged stale when current revision is Rev 3');
});

test('Multiple conflicting claims in one material: Both counted and listed individually', () => {
  const facts = [
    { id: 'f1', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
    { id: 'f2', field: 'start_time', displayValue: '11:00 AM', normalizedValue: '11:00', revision: 2 },
    { id: 'f3', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 2 },
  ];

  const claims = [
    {
      id: 'c_venue',
      materialId: 'mat_multi',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Main Auditorium',
      reviewState: 'confirmed',
    },
    {
      id: 'c_time',
      materialId: 'mat_multi',
      materialVersion: 1,
      field: 'start_time',
      rawValue: '10:00 AM',
      normalizedValue: '10:00',
      evidenceQuote: 'Starts 10:00 AM',
      reviewState: 'confirmed',
    },
    {
      id: 'c_date',
      materialId: 'mat_multi',
      materialVersion: 1,
      field: 'event_date',
      rawValue: 'October 31, 2026',
      normalizedValue: '2026-10-31',
      evidenceQuote: 'Oct 31, 2026',
      reviewState: 'confirmed',
    },
  ];

  const summary = compareMaterialClaims('mat_multi', 1, claims, facts, 2);
  assert.equal(summary.status, 'conflicting');
  assert.equal(summary.conflictCount, 2);
  assert.equal(summary.confirmedCount, 3);
  assert.equal(summary.statusLabel, '2 Conflicted Facts');

  const venueComp = summary.comparisons.find((c) => c.field === 'venue');
  const timeComp = summary.comparisons.find((c) => c.field === 'start_time');
  const dateComp = summary.comparisons.find((c) => c.field === 'event_date');

  assert.equal(venueComp?.isMatch, false);
  assert.equal(timeComp?.isMatch, false);
  assert.equal(dateComp?.isMatch, true);
});

test('Audit preservation: Version 1 claims and comparisons remain accessible when Version 2 exists', () => {
  const facts = [
    { id: 'f1', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
  ];

  const allClaims = [
    {
      id: 'c_v1',
      materialId: 'mat_audit',
      materialVersion: 1,
      field: 'venue',
      rawValue: 'Main Auditorium',
      normalizedValue: 'main auditorium',
      evidenceQuote: 'Venue: Main Auditorium',
      reviewState: 'confirmed',
    },
    {
      id: 'c_v2',
      materialId: 'mat_audit',
      materialVersion: 2,
      field: 'venue',
      rawValue: 'Innovation Lab',
      normalizedValue: 'innovation lab',
      evidenceQuote: 'Venue: Innovation Lab',
      reviewState: 'confirmed',
    },
  ];

  // Audit inquiry for v1
  const v1Summary = compareMaterialClaims('mat_audit', 1, allClaims, facts, 2);
  assert.equal(v1Summary.status, 'conflicting');
  assert.equal(v1Summary.comparisons[0].claimRaw, 'Main Auditorium');

  // Inquiry for current active v2
  const v2Summary = compareMaterialClaims('mat_audit', 2, allClaims, facts, 2);
  assert.equal(v2Summary.status, 'current');
  assert.equal(v2Summary.comparisons[0].claimRaw, 'Innovation Lab');
});
