// Verification script for remaining integration test gaps
import { Client, Users, ID } from 'node-appwrite';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

const admin = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(admin);

async function createAuthenticatedUser(name) {
  const userId = ID.unique();
  await users.create({ userId, name });
  const session = await users.createSession({ userId });
  return {
    userId,
    cookie: `ripple_session=${session.secret}`,
  };
}

async function runGapsVerification() {
  console.log('====================================================');
  console.log(' Ripple — Integration Test Gaps Verification');
  console.log('====================================================');

  // GAP 1: Cross-user mutation with valid request bodies
  console.log('\n[Gap 1] Testing cross-user mutation with valid request bodies...');
  const userA = await createAuthenticatedUser('User A (Owner)');
  const userB = await createAuthenticatedUser('User B (Attacker)');

  // User A creates event
  const createEvRes = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      name: 'Owner Security Event',
      timezone: 'Asia/Kolkata',
      facts: {
        event_date: 'November 1, 2026',
        start_time: '10:00 AM',
        venue: 'Original Hall',
        registration_deadline: 'October 31, 2026, 6:00 PM',
      },
    }),
  });
  if (!createEvRes.ok) throw new Error('User A failed to create event');
  const evA = (await createEvRes.json()).event;

  // User A creates material
  const createMatRes = await fetch(`${BASE_URL}/api/events/${evA.$id}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      title: 'Official Poster Text',
      sourceText: 'Join us at Original Hall on November 1, 2026 at 10:00 AM.',
    }),
  });
  if (!createMatRes.ok) throw new Error('User A failed to create material');
  const matA = (await createMatRes.json()).material;

  // User A adds a claim with valid body -> Must SUCCEED (201)
  const validClaimBody = {
    field: 'venue',
    rawValue: 'Original Hall',
    evidenceQuote: 'Original Hall',
    reviewState: 'confirmed',
  };
  const aClaimRes = await fetch(`${BASE_URL}/api/materials/${matA.$id}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify(validClaimBody),
  });
  if (!aClaimRes.ok) throw new Error('User A failed to add valid claim');
  console.log('✓ User A (Owner) added valid claim successfully (201).');

  // User B sends the EXACT SAME valid claim body to User A material -> Must be DENIED
  const bClaimRes = await fetch(`${BASE_URL}/api/materials/${matA.$id}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
    body: JSON.stringify(validClaimBody),
  });
  console.log(`✓ User B denied adding claim to User A material: status=${bClaimRes.status} (expected: 404/401)`);
  if (bClaimRes.ok) throw new Error('SECURITY VIOLATION: User B added claim to User A material!');

  // User B sends valid official update body to User A event -> Must be DENIED
  const validOfficialBody = {
    expectedRevision: 1,
    updatedFields: { venue: 'Compromised Venue' },
  };
  const bOfficialRes = await fetch(`${BASE_URL}/api/events/${evA.$id}/official`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
    body: JSON.stringify(validOfficialBody),
  });
  console.log(`✓ User B denied mutating User A event: status=${bOfficialRes.status} (expected: 404/401)`);
  if (bOfficialRes.ok) throw new Error('SECURITY VIOLATION: User B mutated User A event!');

  // Verify User A event in database is completely intact
  const verifyEvARes = await fetch(`${BASE_URL}/api/events/${evA.$id}`, {
    headers: { Cookie: userA.cookie },
  });
  const verifyEvAData = await verifyEvARes.json();
  const venueFact = verifyEvAData.facts.find((f) => f.field === 'venue');
  if (venueFact.displayValue !== 'Original Hall' || verifyEvAData.event.currentRevision !== 1) {
    throw new Error('SECURITY VIOLATION: Stored event data was modified!');
  }
  console.log('✓ Verified: Stored event data remains completely unmodified at Rev 1.');

  // GAP 2: Two truly concurrent official-detail edits against the same revision
  console.log('\n[Gap 2] Testing two truly concurrent official-detail edits against Revision 1...');
  const editAlpha = fetch(`${BASE_URL}/api/events/${evA.$id}/official`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      expectedRevision: 1,
      updatedFields: { venue: 'Alpha Pavilion' },
    }),
  });

  const editBeta = fetch(`${BASE_URL}/api/events/${evA.$id}/official`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      expectedRevision: 1,
      updatedFields: { venue: 'Beta Auditorium' },
    }),
  });

  const [resAlpha, resBeta] = await Promise.all([editAlpha, editBeta]);
  console.log(`  - Edit Alpha status: ${resAlpha.status}`);
  console.log(`  - Edit Beta status:  ${resBeta.status}`);
  if (resAlpha.status !== 200) console.log('Alpha error:', await resAlpha.clone().text());
  if (resBeta.status !== 200) console.log('Beta error:', await resBeta.clone().text());

  const statuses = [resAlpha.status, resBeta.status];
  const successCount = statuses.filter((s) => s === 200).length;
  const conflictCount = statuses.filter((s) => s === 409).length;

  console.log(`✓ Successes: ${successCount}, Conflicts: ${conflictCount}`);
  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`Expected exactly 1 success and 1 conflict, got ${successCount} success and ${conflictCount} conflict.`);
  }

  // Verify database state: Revision must be 2, and exactly 1 change row for Rev 2 exists
  const checkConcurrencyEv = await fetch(`${BASE_URL}/api/events/${evA.$id}`, {
    headers: { Cookie: userA.cookie },
  });
  const checkConcurrencyData = await checkConcurrencyEv.json();
  console.log(`✓ Event revision after concurrent edits: Rev ${checkConcurrencyData.event.currentRevision} (expected: 2)`);
  if (checkConcurrencyData.event.currentRevision !== 2) {
    throw new Error(`Revision mismatch: expected 2, got ${checkConcurrencyData.event.currentRevision}`);
  }

  const rev2Changes = checkConcurrencyData.changes.filter((c) => c.revision === 2);
  console.log(`✓ Number of Rev 2 change rows written: ${rev2Changes.length} (expected: 1)`);
  if (rev2Changes.length !== 1) {
    throw new Error(`Duplicate or partial history written! Found ${rev2Changes.length} change rows.`);
  }

  // GAP 3: Stale correction rejection through real API
  console.log('\n[Gap 3] Testing stale correction rejection through real API...');
  // Event is now at Revision 2. Trying to apply a correction generated for Revision 1 must fail with 409 Conflict.
  const staleCorrectionRes = await fetch(`${BASE_URL}/api/materials/${matA.$id}/version`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      correctedText: 'Corrected text for rev 1',
      eventRevision: 1, // STALE! Current is 2
      confirmedClaims: [
        { field: 'venue', rawValue: 'Alpha Pavilion', evidenceQuote: 'Alpha Pavilion' },
      ],
    }),
  });
  console.log(`✓ Stale correction response status: ${staleCorrectionRes.status} (expected: 409)`);
  const staleData = await staleCorrectionRes.json();
  console.log(`✓ Error message: "${staleData.error}"`);
  if (staleCorrectionRes.status !== 409) {
    throw new Error('Stale correction was not rejected with 409 Conflict!');
  }

  // GAP 4: External-update acknowledgment does not clear source conflicts
  console.log('\n[Gap 4] Testing that external-update acknowledgment does not clear source conflicts...');
  // matA claims "Original Hall", but official venue is now Alpha Pavilion or Beta Auditorium.
  // matA is conflicting.
  const summaryBefore = checkConcurrencyData.summaries[matA.$id];
  console.log(`✓ Material status before external acknowledgment: ${summaryBefore.status} (expected: conflicting)`);
  if (summaryBefore.status !== 'conflicting') {
    throw new Error(`Material was expected to be conflicting, got ${summaryBefore.status}`);
  }

  // Record an external acknowledgment (e.g. Discord announcement was updated)
  const extRes = await fetch(`${BASE_URL}/api/materials/${matA.$id}/resolutions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
    body: JSON.stringify({
      action: 'Discord announcement edited by organizer',
      note: 'Pinned message updated with new venue.',
      eventRevision: 2,
    }),
  });
  if (!extRes.ok) throw new Error('Failed to record external acknowledgment');
  console.log('✓ External acknowledgment logged in resolutions table (201).');

  // Verify material status STILL reports conflicting because source text in Ripple remains unedited
  const checkExtEv = await fetch(`${BASE_URL}/api/events/${evA.$id}`, {
    headers: { Cookie: userA.cookie },
  });
  const checkExtData = await checkExtEv.json();
  const summaryAfter = checkExtData.summaries[matA.$id];
  console.log(`✓ Material status after external acknowledgment: ${summaryAfter.status} (expected: conflicting)`);
  if (summaryAfter.status !== 'conflicting') {
    throw new Error('External acknowledgment erroneously cleared material conflict in unchanged source!');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 4 REMAINING INTEGRATION GAPS VERIFIED & PASSED!');
  console.log('====================================================');
}

runGapsVerification().catch((err) => {
  console.error('\n❌ Gaps Verification Failed:', err);
  process.exit(1);
});
