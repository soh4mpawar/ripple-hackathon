import assert from 'node:assert/strict';
import { generateCorrections, applyAllCorrectionsToText } from '../src/lib/corrections.ts';
import { extractClaimsFromMaterial } from '../src/lib/server/ai-extractor.ts';
import { compareMaterialClaims } from '../src/lib/comparison.ts';

async function runRegressionTests() {
  console.log('Starting Correction & Extraction Regression Tests...\n');

  // =========================================================================
  // TEST 1: Simultaneous Time + Venue Correction
  // =========================================================================
  console.log('TEST 1: Simultaneous Time + Venue Correction');
  {
    const originalText = `🚀 Campus Build Night announcement! Doors open at 10:00 AM at the Main Auditorium.`;
    const officialFacts = [
      { id: 'f1', field: 'start_time', displayValue: '11:00 AM', normalizedValue: '11:00', revision: 2 },
      { id: 'f2', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
    ];
    const v1Claims = [
      { id: 'c1', materialId: 'm1', materialVersion: 1, factId: null, field: 'start_time', rawValue: '10:00 AM', normalizedValue: '10:00', evidenceQuote: 'Doors open at 10:00 AM', evidenceLocation: null, reviewState: 'confirmed', ambiguityReason: null },
      { id: 'c2', materialId: 'm1', materialVersion: 1, factId: null, field: 'venue', rawValue: 'Main Auditorium', normalizedValue: 'main auditorium', evidenceQuote: 'at the Main Auditorium', evidenceLocation: null, reviewState: 'confirmed', ambiguityReason: null },
    ];

    const summary = compareMaterialClaims('m1', 1, v1Claims, officialFacts, 2, originalText);
    assert.equal(summary.conflictCount, 2, 'Should have 2 conflicts (start_time and venue)');

    const suggestions = generateCorrections('m1', 1, originalText, summary.comparisons, officialFacts, 2);
    assert.ok(suggestions.length > 0, 'Should generate correction suggestions');
    const correctedText = suggestions[0].suggestedFullText;

    assert.ok(correctedText.includes('11:00 AM'), 'Corrected text must contain new start time 11:00 AM');
    assert.ok(correctedText.includes('Innovation Lab'), 'Corrected text must contain new venue Innovation Lab');
    assert.ok(!correctedText.includes('Main Auditorium'), 'Corrected text must NOT contain obsolete Main Auditorium');
    assert.ok(!correctedText.includes('10:00 AM'), 'Corrected text must NOT contain obsolete 10:00 AM');

    // Extract claims from this newly saved source text
    const extracted = await extractClaimsFromMaterial({
      kind: 'text',
      text: correctedText,
      eventTimezone: 'Asia/Kolkata',
    });

    // Verify all extracted evidence quotes are found verbatim in correctedText
    for (const claim of extracted.claims) {
      assert.ok(
        correctedText.includes(claim.evidenceQuote),
        `Extracted evidenceQuote "${claim.evidenceQuote}" must exist verbatim in corrected text`
      );
    }

    // Convert confirmed claims and run comparison with sourceText
    const v2Claims = extracted.claims
      .filter((c) => !c.needsClarification)
      .map((c, i) => ({
        id: `c_v2_${i}`,
        materialId: 'm1',
        materialVersion: 2,
        factId: null,
        field: c.field,
        rawValue: c.rawValue,
        normalizedValue: c.normalizedValue,
        evidenceQuote: c.evidenceQuote,
        evidenceLocation: null,
        reviewState: 'confirmed',
        ambiguityReason: null,
      }));

    const v2Summary = compareMaterialClaims('m1', 2, v2Claims, officialFacts, 2, correctedText);
    assert.equal(v2Summary.conflictCount, 0, 'Version 2 should have 0 conflicts');
    assert.equal(v2Summary.status, 'current', 'Version 2 should be marked current');
    console.log('✓ TEST 1 Passed: Both venue and time updated, obsolete venue removed, claims verified against source.\n');
  }

  // =========================================================================
  // TEST 2: User Edits Text Back to Obsolete Venue
  // =========================================================================
  console.log('TEST 2: User Edits Text Back to Obsolete Venue');
  {
    const officialFacts = [
      { id: 'f1', field: 'start_time', displayValue: '11:00 AM', normalizedValue: '11:00', revision: 2 },
      { id: 'f2', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
    ];

    // User took suggestion but intentionally or accidentally retyped "Main Auditorium"
    const userTamperedText = `🚀 Campus Build Night announcement! Doors open at 11:00 AM at the Main Auditorium.`;

    const extracted = await extractClaimsFromMaterial({
      kind: 'text',
      text: userTamperedText,
      eventTimezone: 'Asia/Kolkata',
    });

    const v2Claims = extracted.claims
      .filter((c) => !c.needsClarification)
      .map((c, i) => ({
        id: `c_v2_${i}`,
        materialId: 'm1',
        materialVersion: 2,
        factId: null,
        field: c.field,
        rawValue: c.rawValue,
        normalizedValue: c.normalizedValue,
        evidenceQuote: c.evidenceQuote,
        evidenceLocation: null,
        reviewState: 'confirmed',
        ambiguityReason: null,
      }));

    const v2Summary = compareMaterialClaims('m1', 2, v2Claims, officialFacts, 2, userTamperedText);
    assert.equal(v2Summary.conflictCount, 1, 'Version 2 must have 1 conflict due to Main Auditorium');
    assert.equal(v2Summary.status, 'conflicting', 'Version 2 status must be conflicting');
    console.log('✓ TEST 2 Passed: Retaining or re-introducing obsolete venue keeps material conflicting.\n');
  }

  // =========================================================================
  // TEST 3: Rejection of Synthetic and Unsupported Evidence Quotes
  // =========================================================================
  console.log('TEST 3: Rejection of Synthetic and Unsupported Evidence Quotes');
  {
    const officialFacts = [
      { id: 'f1', field: 'venue', displayValue: 'Innovation Lab', normalizedValue: 'innovation lab', revision: 2 },
    ];
    // Source text does NOT have Innovation Lab, it says Main Auditorium
    const sourceText = `Campus Build Night is at Main Auditorium.`;

    // A synthetic claim that was previously generated by the faulty UI:
    const syntheticClaim = {
      id: 'c_synth',
      materialId: 'm1',
      materialVersion: 2,
      factId: null,
      field: 'venue',
      rawValue: 'Innovation Lab',
      normalizedValue: 'innovation lab',
      evidenceQuote: 'Updated in v2: Innovation Lab',
      evidenceLocation: null,
      reviewState: 'confirmed',
      ambiguityReason: null,
    };

    const summary = compareMaterialClaims('m1', 2, [syntheticClaim], officialFacts, 2, sourceText);
    // Synthetic claim must be flagged as conflicting/unsupported because:
    // 1) "Updated in v2" is synthetic
    // 2) The evidence quote does not appear anywhere in sourceText
    assert.equal(summary.status, 'conflicting', 'Synthetic evidence must cause conflicting status');
    assert.equal(summary.conflictCount, 1, 'Synthetic evidence must count as a conflict');
    console.log('✓ TEST 3 Passed: Synthetic quotes not found in source text are rejected.\n');
  }

  // =========================================================================
  // TEST 4: Deadline Extraction Context & Time Disambiguation
  // =========================================================================
  console.log('TEST 4: Deadline Extraction Context & Time Disambiguation');
  {
    const testInput = 'Campus Build Night is on October 31, 2026. Event start time: 11:00 AM. Venue: Innovation Lab. Volunteer arrival: 8:30 AM. Registration deadline: October 30, 2026, 6:00 PM.';

    const extraction = await extractClaimsFromMaterial({
      kind: 'text',
      text: testInput,
      eventTimezone: 'Asia/Kolkata',
    });

    const deadline = extraction.claims.find((c) => c.field === 'registration_deadline');
    assert.ok(deadline, 'Must extract registration_deadline');
    assert.equal(
      deadline.rawValue,
      'October 30, 2026, 6:00 PM',
      'Registration deadline must preserve both date and time (October 30, 2026, 6:00 PM)'
    );
    assert.equal(deadline.needsClarification, false, 'Registration deadline should not be ambiguous');

    const startTimes = extraction.claims.filter((c) => c.field === 'start_time');
    assert.ok(startTimes.length >= 1, 'Must extract start_time');

    // 6:00 PM is the deadline cutoff and must NEVER be extracted as start_time
    const has6PMAsStart = startTimes.some((c) => c.rawValue.includes('6:00 PM'));
    assert.equal(has6PMAsStart, false, '6:00 PM cutoff must NOT be extracted as start_time');

    // Event start time (11:00 AM) must be confident
    const eventStart = startTimes.find((c) => c.rawValue === '11:00 AM');
    assert.ok(eventStart, 'Must extract 11:00 AM as start_time');
    assert.equal(eventStart.needsClarification, false, 'Event start time 11:00 AM must not need clarification');

    // Volunteer arrival (8:30 AM) must be flagged for clarification
    const volunteerArrival = startTimes.find((c) => c.rawValue === '8:30 AM');
    assert.ok(volunteerArrival, 'Must extract volunteer arrival 8:30 AM');
    assert.equal(
      volunteerArrival.needsClarification,
      true,
      'Volunteer arrival must be flagged with needsClarification: true so it is not auto-confirmed as event start time'
    );

    // Date and Venue
    const dateClaim = extraction.claims.find((c) => c.field === 'event_date');
    assert.ok(dateClaim, 'Must extract event_date');
    assert.equal(dateClaim.rawValue, 'October 31, 2026');

    const venueClaim = extraction.claims.find((c) => c.field === 'venue');
    assert.ok(venueClaim, 'Must extract venue');
    assert.equal(venueClaim.rawValue, 'Innovation Lab');

    console.log('✓ TEST 4 Passed: Deadline date+time preserved; 6:00 PM not start_time; volunteer arrival flagged for clarification.\n');
  }

  console.log('====================================================');
  console.log('ALL REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('====================================================');
}

runRegressionTests().catch((err) => {
  console.error('❌ Regression test failed:', err);
  process.exit(1);
});
