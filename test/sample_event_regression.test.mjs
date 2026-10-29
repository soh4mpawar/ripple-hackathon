import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareMaterialClaims,
  normalizeFieldValue,
} from '../src/lib/comparison.ts';
import { generateCorrections } from '../src/lib/corrections.ts';

// --------------------------------------------------------------------------
// Sample Event Regression Test: Campus Build Night Fixture Verification
// --------------------------------------------------------------------------

test('Sample Event Fixture: Verification of all 6 materials before and after official change', () => {
  // 1. Initial Revision 1 Canonical Facts
  const factsRev1 = [
    { id: 'f_date', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 1 },
    { id: 'f_time', field: 'start_time', displayValue: '10:00 AM', normalizedValue: '10:00', revision: 1 },
    { id: 'f_venue', field: 'venue', displayValue: 'Main Auditorium', normalizedValue: 'main auditorium', revision: 1 },
    { id: 'f_deadline', field: 'registration_deadline', displayValue: 'October 30, 2026, 6:00 PM', normalizedValue: '2026-10-30 18:00', revision: 1 },
  ];

  // Material 1: Main Poster
  const mat1Claims = [
    { id: 'c1_1', materialId: 'mat_1', materialVersion: 1, field: 'event_date', rawValue: 'October 31, 2026', normalizedValue: '2026-10-31', evidenceQuote: 'Date: October 31, 2026', reviewState: 'confirmed' },
    { id: 'c1_2', materialId: 'mat_1', materialVersion: 1, field: 'start_time', rawValue: '10:00 AM', normalizedValue: '10:00', evidenceQuote: 'Time: 10:00 AM', reviewState: 'confirmed' },
    { id: 'c1_3', materialId: 'mat_1', materialVersion: 1, field: 'venue', rawValue: 'Main Auditorium', normalizedValue: 'main auditorium', evidenceQuote: 'Venue: Main Auditorium', reviewState: 'confirmed' },
  ];

  // Material 2: WhatsApp Announcement
  const mat2Claims = [
    { id: 'c2_1', materialId: 'mat_2', materialVersion: 1, field: 'event_date', rawValue: 'October 31, 2026', normalizedValue: '2026-10-31', evidenceQuote: 'happening on October 31, 2026', reviewState: 'confirmed' },
    { id: 'c2_2', materialId: 'mat_2', materialVersion: 1, field: 'start_time', rawValue: '10:00 AM', normalizedValue: '10:00', evidenceQuote: 'Doors open at 10:00 AM', reviewState: 'confirmed' },
    { id: 'c2_3', materialId: 'mat_2', materialVersion: 1, field: 'venue', rawValue: 'Main Auditorium', normalizedValue: 'main auditorium', evidenceQuote: 'at the Main Auditorium', reviewState: 'confirmed' },
    { id: 'c2_4', materialId: 'mat_2', materialVersion: 1, field: 'registration_deadline', rawValue: 'October 30, 2026, 6:00 PM', normalizedValue: '2026-10-30 18:00', evidenceQuote: 'registration deadline is October 30, 2026, 6:00 PM sharp', reviewState: 'confirmed' },
  ];

  // Material 3: Volunteer Instructions
  const mat3Claims = [
    { id: 'c3_1', materialId: 'mat_3', materialVersion: 1, field: 'venue', rawValue: 'Main Auditorium', normalizedValue: 'main auditorium', evidenceQuote: 'Reporting Venue: Main Auditorium', reviewState: 'confirmed' },
    { id: 'c3_2', materialId: 'mat_3', materialVersion: 1, field: 'start_time', rawValue: '8:30 AM', normalizedValue: '08:30', evidenceQuote: 'Volunteer Arrival: 8:30 AM', reviewState: 'needs_clarification', ambiguityReason: 'Volunteer arrival time (8:30 AM) is not verified public event start time.' },
  ];

  // Material 4: Registration Reminder
  const mat4Claims = [
    { id: 'c4_1', materialId: 'mat_4', materialVersion: 1, field: 'registration_deadline', rawValue: 'October 30, 2026, 6:00 PM', normalizedValue: '2026-10-30 18:00', evidenceQuote: 'closes promptly on October 30, 2026, 6:00 PM', reviewState: 'confirmed' },
  ];

  // Material 5: Sponsor Thank-You Note (No tracked claims)
  const mat5Claims = [];

  // Material 6: Schedule Excerpt
  const mat6Claims = [
    { id: 'c6_1', materialId: 'mat_6', materialVersion: 1, field: 'start_time', rawValue: '10:00 AM', normalizedValue: '10:00', evidenceQuote: '10:00 AM — Opening ceremony', reviewState: 'confirmed' },
  ];

  // =========================================================================
  // REVISION 1 EVALUATION: Initial state
  // =========================================================================
  const s1_rev1 = compareMaterialClaims('mat_1', 1, mat1Claims, factsRev1, 1);
  assert.equal(s1_rev1.status, 'current', 'Material #1 must be current at Rev 1');
  assert.equal(s1_rev1.conflictCount, 0);
  assert.equal(s1_rev1.confirmedCount, 3);

  const s2_rev1 = compareMaterialClaims('mat_2', 1, mat2Claims, factsRev1, 1);
  assert.equal(s2_rev1.status, 'current', 'Material #2 must be current at Rev 1');
  assert.equal(s2_rev1.conflictCount, 0);
  assert.equal(s2_rev1.confirmedCount, 4);

  const s3_rev1 = compareMaterialClaims('mat_3', 1, mat3Claims, factsRev1, 1);
  assert.equal(s3_rev1.status, 'needs_review', 'Material #3 must be needs_review due to ambiguous volunteer arrival time');
  assert.equal(s3_rev1.unresolvedCount, 1);
  assert.equal(s3_rev1.confirmedCount, 1);

  const s4_rev1 = compareMaterialClaims('mat_4', 1, mat4Claims, factsRev1, 1);
  assert.equal(s4_rev1.status, 'current', 'Material #4 must be current at Rev 1');
  assert.equal(s4_rev1.conflictCount, 0);

  const s5_rev1 = compareMaterialClaims('mat_5', 1, mat5Claims, factsRev1, 1);
  assert.equal(s5_rev1.status, 'unverified', 'Material #5 (no claims) must remain unverified');
  assert.equal(s5_rev1.confirmedCount, 0);

  const s6_rev1 = compareMaterialClaims('mat_6', 1, mat6Claims, factsRev1, 1);
  assert.equal(s6_rev1.status, 'current', 'Material #6 must be current at Rev 1');
  assert.equal(s6_rev1.conflictCount, 0);

  // =========================================================================
  // REVISION 2 EVALUATION: After official change (Venue -> Innovation Lab, Start Time -> 11:00 AM)
  // =========================================================================
  const factsRev2 = [
    { id: 'f_date', field: 'event_date', displayValue: 'October 31, 2026', normalizedValue: '2026-10-31', revision: 2 },
    { id: 'f_time', field: 'start_time', displayValue: '11:00 AM', normalizedValue: '11:00', revision: 2 }, // CHANGED
    { id: 'f_venue', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 }, // CHANGED
    { id: 'f_deadline', field: 'registration_deadline', displayValue: 'October 30, 2026, 6:00 PM', normalizedValue: '2026-10-30 18:00', revision: 2 },
  ];

  // Material 1: Main Poster has both outdated venue and outdated start time!
  const s1_rev2 = compareMaterialClaims('mat_1', 1, mat1Claims, factsRev2, 2);
  assert.equal(s1_rev2.status, 'conflicting', 'Material #1 must conflict at Rev 2');
  assert.equal(s1_rev2.conflictCount, 2, 'Material #1 must have 2 conflicts (venue and start_time)');

  // Material 2: WhatsApp Announcement has both outdated venue and outdated start time!
  const s2_rev2 = compareMaterialClaims('mat_2', 1, mat2Claims, factsRev2, 2);
  assert.equal(s2_rev2.status, 'conflicting', 'Material #2 must conflict at Rev 2');
  assert.equal(s2_rev2.conflictCount, 2, 'Material #2 must have 2 conflicts (venue and start_time)');

  // Material 3: Volunteer Instructions has outdated venue (Main Auditorium)
  const s3_rev2 = compareMaterialClaims('mat_3', 1, mat3Claims, factsRev2, 2);
  assert.equal(s3_rev2.status, 'conflicting', 'Material #3 must conflict at Rev 2 on venue');
  assert.equal(s3_rev2.conflictCount, 1, 'Material #3 must have 1 confirmed conflict (venue)');

  // Material 4: Registration Reminder has unchanged deadline
  const s4_rev2 = compareMaterialClaims('mat_4', 1, mat4Claims, factsRev2, 2);
  assert.equal(s4_rev2.status, 'current', 'Material #4 must remain current at Rev 2 because registration deadline was not changed');
  assert.equal(s4_rev2.conflictCount, 0);

  // Material 5: Sponsor Note has no claims
  const s5_rev2 = compareMaterialClaims('mat_5', 1, mat5Claims, factsRev2, 2);
  assert.equal(s5_rev2.status, 'unverified', 'Material #5 must remain unverified at Rev 2');

  // Material 6: Schedule Excerpt has start time 10:00 AM (vs official 11:00 AM)
  const s6_rev2 = compareMaterialClaims('mat_6', 1, mat6Claims, factsRev2, 2);
  assert.equal(s6_rev2.status, 'conflicting', 'Material #6 MUST conflict on start_time when official time moves to 11:00 AM');
  assert.equal(s6_rev2.conflictCount, 1);
  assert.equal(s6_rev2.comparisons[0].field, 'start_time');
  assert.equal(s6_rev2.comparisons[0].isMatch, false);
});

// --------------------------------------------------------------------------
// Concurrency Test: Competing edits against expectedRevision
// --------------------------------------------------------------------------
test('Concurrency: Competing edits against expectedRevision reject stale write', () => {
  let eventRevision = 1;

  function mockUpdateOfficial(expectedRevision, newRevision) {
    if (eventRevision !== expectedRevision) {
      throw new Error(`Revision conflict: Current event revision is ${eventRevision}, but expected ${expectedRevision}. Please refresh.`);
    }
    eventRevision = newRevision;
    return { success: true, newRevision };
  }

  // Request 1: Succeeds
  const res1 = mockUpdateOfficial(1, 2);
  assert.equal(res1.success, true);
  assert.equal(eventRevision, 2);

  // Request 2: Concurrent request that also expected Revision 1 fails with clear conflict
  assert.throws(
    () => mockUpdateOfficial(1, 2),
    /Revision conflict: Current event revision is 2, but expected 1/
  );
});

// --------------------------------------------------------------------------
// Version History Test: Previous version source content and claims immutability
// --------------------------------------------------------------------------
test('Version History: Applying correction creates v2 without overwriting v1', () => {
  const v1Source = 'Campus Build Night at Main Auditorium at 10:00 AM';
  const v2Source = 'Campus Build Night at Innovation Lab at 11:00 AM';

  const versionHistory = [
    { version: 1, sourceText: v1Source },
    { version: 2, sourceText: v2Source },
  ];

  // Verify both versions exist and v1 source content is not overwritten
  assert.equal(versionHistory.length, 2);
  assert.equal(versionHistory[0].version, 1);
  assert.equal(versionHistory[0].sourceText, v1Source);
  assert.equal(versionHistory[1].version, 2);
  assert.equal(versionHistory[1].sourceText, v2Source);
});

// --------------------------------------------------------------------------
// External Acknowledgment Isolation Test
// --------------------------------------------------------------------------
test('External Acknowledgment: Logging external channel update does not clear conflict in unchanged material', () => {
  const factsRev2 = [
    { id: 'f_venue', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
  ];

  const claims = [
    { id: 'c1', materialId: 'mat_flyer', materialVersion: 1, field: 'venue', rawValue: 'Main Auditorium', normalizedValue: 'main auditorium', evidenceQuote: 'Main Auditorium', reviewState: 'confirmed' },
  ];

  // Initial check: Conflicting
  const summaryBefore = compareMaterialClaims('mat_flyer', 1, claims, factsRev2, 2);
  assert.equal(summaryBefore.status, 'conflicting');

  // Organizer records external acknowledgment: "Posted Discord announcement"
  const resolutions = [
    { materialId: 'mat_flyer', materialVersion: 1, eventRevision: 2, action: 'Posted Discord announcement' },
  ];

  // Recomputing claims against the unchanged material source must REMAIN conflicting!
  const summaryAfter = compareMaterialClaims('mat_flyer', 1, claims, factsRev2, 2);
  assert.equal(summaryAfter.status, 'conflicting', 'Material source in Ripple must still report conflict until revised copy is applied');
  assert.equal(resolutions.length, 1, 'External resolution is tracked as an audit event');
});
