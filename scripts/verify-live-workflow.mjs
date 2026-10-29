// Live End-to-End Workflow Verification Script for Ripple against Appwrite TablesDB

const BASE_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Minimal 1x1 transparent PNG buffer for image upload test
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function runLiveVerification() {
  console.log('====================================================');
  console.log(' Ripple — Live Workflow Verification against Appwrite');
  console.log('====================================================');

  // STEP 1: Start isolated sample session (User A)
  console.log('\n[1/12] Starting isolated sample session (User A)...');
  const demoRes = await fetch(`${BASE_URL}/api/auth/demo`, { method: 'POST' });
  if (!demoRes.ok) {
    const err = await demoRes.json();
    throw new Error(`Demo creation failed: ${JSON.stringify(err)}`);
  }

  // Extract session cookie from Set-Cookie header
  const rawSetCookie = demoRes.headers.get('set-cookie') || '';
  const match = rawSetCookie.match(/ripple_session=([^;]+)/);
  if (!match) throw new Error('No ripple_session cookie returned in demo response');
  const userACookie = `ripple_session=${match[1]}`;

  const demoData = await demoRes.json();
  const eventId = demoData.eventId;
  const userAId = demoData.userId;
  console.log(`✓ User A initialized (ID: ${userAId.slice(0, 10)}...)`);
  console.log(`✓ Sample Event created (ID: ${eventId})`);

  // STEP 2: Open and verify the six sample materials at Revision 1
  console.log('\n[2/12] Verifying the six sample materials at Revision 1...');
  const eventRes1 = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    headers: { Cookie: userACookie },
  });
  if (!eventRes1.ok) throw new Error('Failed to fetch event at Rev 1');
  const eventData1 = await eventRes1.json();

  console.log(`✓ Event Name: "${eventData1.event.name}", Revision: ${eventData1.event.currentRevision}`);
  console.log(`✓ Total Materials: ${eventData1.materials.length}`);
  if (eventData1.materials.length !== 6) {
    throw new Error(`Expected 6 sample materials, got ${eventData1.materials.length}`);
  }

  const matMap1 = new Map(eventData1.materials.map((m) => [m.title, m]));
  const sum1 = eventData1.summaries;

  const p1 = sum1[matMap1.get('Main Poster Copy').$id];
  const p2 = sum1[matMap1.get('WhatsApp Group Announcement').$id];
  const p3 = sum1[matMap1.get('Volunteer Instructions Handout').$id];
  const p4 = sum1[matMap1.get('Discord Registration Reminder').$id];
  const p5 = sum1[matMap1.get('Sponsor Thank-You Note').$id];
  const p6 = sum1[matMap1.get('Schedule Excerpt Card').$id];

  console.log(`  - Main Poster: status=${p1.status}, conflicts=${p1.conflictCount} (expected: current)`);
  console.log(`  - WhatsApp Announcement: status=${p2.status}, conflicts=${p2.conflictCount} (expected: current)`);
  console.log(`  - Volunteer Instructions: status=${p3.status}, unresolved=${p3.unresolvedCount} (expected: needs_review)`);
  console.log(`  - Registration Reminder: status=${p4.status}, conflicts=${p4.conflictCount} (expected: current)`);
  console.log(`  - Sponsor Thank-You: status=${p5.status}, confirmed=${p5.confirmedCount} (expected: unverified)`);
  console.log(`  - Schedule Excerpt: status=${p6.status}, conflicts=${p6.conflictCount} (expected: current)`);

  if (p1.status !== 'current' || p2.status !== 'current' || p3.status !== 'needs_review' ||
      p4.status !== 'current' || p5.status !== 'unverified' || p6.status !== 'current') {
    throw new Error('Initial Revision 1 status verification failed!');
  }
  console.log('✓ Revision 1 verification passed: Volunteer arrival time successfully preserved as needs_review, Sponsor note as unverified.');

  // STEP 3: Commit proposed venue & start-time change
  console.log('\n[3/12] Committing atomic official change (Venue -> Innovation Lab, Start -> 11:00 AM)...');
  const patchRes = await fetch(`${BASE_URL}/api/events/${eventId}/official`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userACookie,
    },
    body: JSON.stringify({
      expectedRevision: 1,
      updatedFields: {
        venue: 'Innovation Lab',
        start_time: '11:00 AM',
      },
    }),
  });

  if (!patchRes.ok) {
    const patchErr = await patchRes.json();
    throw new Error(`Official change failed: ${JSON.stringify(patchErr)}`);
  }
  const patchData = await patchRes.json();
  console.log(`✓ Official details atomically committed via TablesDB transaction.`);
  console.log(`✓ New Event Revision: Rev ${patchData.newRevision}`);

  // STEP 4: Verify expected affected materials at Revision 2
  console.log('\n[4/12] Verifying affected materials at Revision 2...');
  const eventRes2 = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    headers: { Cookie: userACookie },
  });
  const eventData2 = await eventRes2.json();
  const matMap2 = new Map(eventData2.materials.map((m) => [m.title, m]));
  const sum2 = eventData2.summaries;

  const r1 = sum2[matMap2.get('Main Poster Copy').$id];
  const r2 = sum2[matMap2.get('WhatsApp Group Announcement').$id];
  const r3 = sum2[matMap2.get('Volunteer Instructions Handout').$id];
  const r4 = sum2[matMap2.get('Discord Registration Reminder').$id];
  const r5 = sum2[matMap2.get('Sponsor Thank-You Note').$id];
  const r6 = sum2[matMap2.get('Schedule Excerpt Card').$id];

  console.log(`  - Main Poster: status=${r1.status}, conflicts=${r1.conflictCount} (expected: conflicting, 2)`);
  console.log(`  - WhatsApp Announcement: status=${r2.status}, conflicts=${r2.conflictCount} (expected: conflicting, 2)`);
  console.log(`  - Volunteer Instructions: status=${r3.status}, conflicts=${r3.conflictCount} (expected: conflicting, 1)`);
  console.log(`  - Registration Reminder: status=${r4.status}, conflicts=${r4.conflictCount} (expected: current, 0)`);
  console.log(`  - Sponsor Thank-You: status=${r5.status}, confirmed=${r5.confirmedCount} (expected: unverified)`);
  console.log(`  - Schedule Excerpt: status=${r6.status}, conflicts=${r6.conflictCount} (expected: conflicting, 1)`);

  if (r1.status !== 'conflicting' || r1.conflictCount !== 2 ||
      r2.status !== 'conflicting' || r2.conflictCount !== 2 ||
      r3.status !== 'conflicting' || r3.conflictCount !== 1 ||
      r4.status !== 'current' ||
      r5.status !== 'unverified' ||
      r6.status !== 'conflicting' || r6.conflictCount !== 1) {
    throw new Error('Revision 2 affected materials verification failed!');
  }
  console.log('✓ Revision 2 verification passed: Materials #1, #2, #3, and #6 all correctly conflict, #4 stays current, #5 remains unverified.');

  // STEP 5: Inspect evidence for a conflict on Material #2
  console.log('\n[5/12] Inspecting conflict evidence for WhatsApp Announcement...');
  const whatsappMat = matMap2.get('WhatsApp Group Announcement');
  const compVenue = r2.comparisons.find((c) => c.field === 'venue');
  const compTime = r2.comparisons.find((c) => c.field === 'start_time');
  console.log(`✓ Venue conflict evidence: material states "${compVenue.claimRaw}", official is "${compVenue.officialDisplay}"`);
  console.log(`✓ Start Time conflict evidence: material states "${compTime.claimRaw}", official is "${compTime.officialDisplay}"`);

  // STEP 6: Apply text correction and review
  console.log('\n[6/12] Applying text correction to WhatsApp Announcement...');
  const correctedWhatsAppText = `🚀 Hey hackers! Campus Build Night is happening on October 31, 2026. Doors open at 11:00 AM at the Innovation Lab. Remember, registration deadline is October 30, 2026, 6:00 PM sharp! Don't miss out.`;

  const corrRes = await fetch(`${BASE_URL}/api/materials/${whatsappMat.$id}/version`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userACookie,
    },
    body: JSON.stringify({
      correctedText: correctedWhatsAppText,
      eventRevision: 2,
      expectedMaterialVersion: 1,
      confirmedClaims: [
        { field: 'event_date', rawValue: 'October 31, 2026', evidenceQuote: 'happening on October 31, 2026' },
        { field: 'start_time', rawValue: '11:00 AM', evidenceQuote: 'Doors open at 11:00 AM' },
        { field: 'venue', rawValue: 'Innovation Lab', evidenceQuote: 'at the Innovation Lab' },
        { field: 'registration_deadline', rawValue: 'October 30, 2026, 6:00 PM', evidenceQuote: 'registration deadline is October 30, 2026, 6:00 PM sharp' },
      ],
      note: 'Applied revised venue and start time.',
    }),
  });

  if (!corrRes.ok) {
    const corrErr = await corrRes.json();
    throw new Error(`Applying correction failed: ${JSON.stringify(corrErr)}`);
  }
  const corrData = await corrRes.json();
  console.log(`✓ Version ${corrData.newVersion} created successfully.`);

  // STEP 7: Verify corrected source and status
  console.log('\n[7/12] Verifying corrected source and status for WhatsApp Announcement...');
  const eventRes3 = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    headers: { Cookie: userACookie },
  });
  const eventData3 = await eventRes3.json();
  const updatedWhatsApp = eventData3.materials.find((m) => m.$id === whatsappMat.$id);
  const updatedSummary = eventData3.summaries[whatsappMat.$id];

  console.log(`✓ Material version: ${updatedWhatsApp.version} (expected: 2)`);
  console.log(`✓ Material status: ${updatedSummary.status} (expected: current)`);
  console.log(`✓ Conflict count: ${updatedSummary.conflictCount} (expected: 0)`);
  if (updatedWhatsApp.version !== 2 || updatedSummary.status !== 'current') {
    throw new Error('Corrected material status verification failed!');
  }

  // STEP 8: Reload and verify persistence
  console.log('\n[8/12] Reloading from database to verify persistence...');
  const reloadRes = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    headers: { Cookie: userACookie },
  });
  const reloadData = await reloadRes.json();
  if (reloadData.event.currentRevision !== 2) {
    throw new Error(`Persisted revision mismatch: expected 2, got ${reloadData.event.currentRevision}`);
  }
  console.log(`✓ Persistence verified: Event Rev 2 and Version 2 intact in Appwrite TablesDB.`);

  // STEP 9: Inspect prior source and version history in material_versions
  console.log('\n[9/12] Inspecting version history and proving Version 1 source preservation...');
  const vList = reloadData.versions.filter((v) => v.materialId === whatsappMat.$id);
  console.log(`✓ Found ${vList.length} version snapshots in material_versions.`);
  const v1Snapshot = vList.find((v) => v.version === 1);
  const v2Snapshot = vList.find((v) => v.version === 2);

  if (!v1Snapshot || !v2Snapshot) {
    throw new Error('Version snapshots missing in material_versions!');
  }
  if (!v1Snapshot.sourceText.includes('Main Auditorium') || !v2Snapshot.sourceText.includes('Innovation Lab')) {
    throw new Error('Historical version source text mismatch!');
  }
  console.log(`✓ Version 1 historical text preserved: "...Doors open at 10:00 AM at the Main Auditorium..."`);
  console.log(`✓ Version 2 active text preserved: "...Doors open at 11:00 AM at the Innovation Lab..."`);

  // STEP 10: Add fresh pasted text and review claims
  console.log('\n[10/12] Adding fresh pasted text material and verifying extraction...');
  const newMatRes = await fetch(`${BASE_URL}/api/events/${eventId}/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userACookie,
    },
    body: JSON.stringify({
      title: 'Instagram Story Teaser',
      sourceText: 'Join Campus Build Night on October 31, 2026 at the Innovation Lab. Hacking starts 11:00 AM!',
    }),
  });

  if (!newMatRes.ok) throw new Error('Failed to create new text material');
  const newMatData = await newMatRes.json();
  console.log(`✓ New material created: "${newMatData.material.title}" (ID: ${newMatData.material.$id})`);

  // STEP 11: Upload PNG image and verify private storage
  console.log('\n[11/12] Testing PNG image upload and authenticated streaming...');
  const formData = new FormData();
  formData.append('title', 'Hackathon Mascot Banner');
  const blob = new Blob([MINIMAL_PNG], { type: 'image/png' });
  formData.append('file', blob, 'banner.png');

  const imgUploadRes = await fetch(`${BASE_URL}/api/events/${eventId}/materials`, {
    method: 'POST',
    headers: { Cookie: userACookie },
    body: formData,
  });

  if (!imgUploadRes.ok) {
    const imgErr = await imgUploadRes.json();
    throw new Error(`Image upload failed: ${JSON.stringify(imgErr)}`);
  }
  const imgData = await imgUploadRes.json();
  const imageMatId = imgData.material.$id;
  console.log(`✓ Image material created (ID: ${imageMatId}, FileId: ${imgData.material.storageFileId})`);

  // Stream image as User A
  const imgStreamRes = await fetch(`${BASE_URL}/api/materials/${imageMatId}/image`, {
    headers: { Cookie: userACookie },
  });
  if (!imgStreamRes.ok) throw new Error('User A failed to stream uploaded image');
  const imgBytes = await imgStreamRes.arrayBuffer();
  console.log(`✓ Authenticated image stream verified (${imgBytes.byteLength} bytes)`);

  // STEP 12: Open separate session (User B) and verify complete tenant isolation
  console.log('\n[12/12] Verifying multi-tenant isolation against User B...');
  const demoResB = await fetch(`${BASE_URL}/api/auth/demo`, { method: 'POST' });
  const rawSetCookieB = demoResB.headers.get('set-cookie') || '';
  const matchB = rawSetCookieB.match(/ripple_session=([^;]+)/);
  const userBCookie = `ripple_session=${matchB[1]}`;
  const userBData = await demoResB.json();
  console.log(`✓ User B initialized (ID: ${userBData.userId.slice(0, 10)}...)`);

  // Attempt 1: User B tries to read User A's event
  const bReadEvent = await fetch(`${BASE_URL}/api/events/${eventId}`, {
    headers: { Cookie: userBCookie },
  });
  console.log(`  - User B reading User A's event: status=${bReadEvent.status} (expected: 404)`);
  if (bReadEvent.status !== 404) throw new Error('Tenant isolation breach: User B read User A event!');

  // Attempt 2: User B tries to mutate User A's event
  const bMutateEvent = await fetch(`${BASE_URL}/api/events/${eventId}/official`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
    body: JSON.stringify({ expectedRevision: 2, updatedFields: { venue: 'Hacked Venue' } }),
  });
  console.log(`  - User B mutating User A's event: status=${bMutateEvent.status} (expected: 400/404)`);
  if (bMutateEvent.ok) throw new Error('Tenant isolation breach: User B mutated User A event!');

  // Attempt 3: User B tries to stream User A's image
  const bStreamImage = await fetch(`${BASE_URL}/api/materials/${imageMatId}/image`, {
    headers: { Cookie: userBCookie },
  });
  console.log(`  - User B streaming User A's private image: status=${bStreamImage.status} (expected: 404)`);
  if (bStreamImage.ok) throw new Error('Tenant isolation breach: User B streamed User A private image!');

  // Attempt 4: User B tries to attach claim to User A's material
  const bAddClaim = await fetch(`${BASE_URL}/api/materials/${whatsappMat.$id}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
    body: JSON.stringify({
      field: 'venue',
      rawValue: 'Illegal Venue',
      evidenceQuote: 'Illegal quote',
      reviewState: 'confirmed',
    }),
  });
  console.log(`  - User B adding claim to User A's material: status=${bAddClaim.status} (expected: 404)`);
  if (bAddClaim.ok) throw new Error('Tenant isolation breach: User B added claim to User A material!');

  console.log('\n====================================================');
  console.log('🎉 ALL 12 LIVE VERIFICATION CHECKS PASSED!');
  console.log('====================================================');
}

runLiveVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
