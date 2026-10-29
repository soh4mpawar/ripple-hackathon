import { createEventWithFacts, createMaterial, createClaim } from './tables-db';

export async function seedSampleEvent(ownerId: string): Promise<string> {
  // 1. Create official event & facts
  const { event } = await createEventWithFacts(
    ownerId,
    'Campus Build Night',
    'Asia/Kolkata',
    {
      event_date: 'October 31, 2026',
      start_time: '10:00 AM',
      venue: 'Main Auditorium',
      registration_deadline: 'October 30, 2026, 6:00 PM',
    }
  );

  const eventId = event.$id;

  // Material 1: Main Poster
  const mat1 = await createMaterial(
    ownerId,
    eventId,
    'Main Poster Copy',
    'text',
    `CAMPUS BUILD NIGHT 2026\nDate: October 31, 2026\nTime: 10:00 AM\nVenue: Main Auditorium\nHack, build, and pitch your prototype in 12 hours!`
  );
  await createClaim(ownerId, eventId, mat1.$id, 1, {
    field: 'event_date',
    rawValue: 'October 31, 2026',
    evidenceQuote: 'Date: October 31, 2026',
    evidenceLocation: 'Poster body line 2',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat1.$id, 1, {
    field: 'start_time',
    rawValue: '10:00 AM',
    evidenceQuote: 'Time: 10:00 AM',
    evidenceLocation: 'Poster body line 3',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat1.$id, 1, {
    field: 'venue',
    rawValue: 'Main Auditorium',
    evidenceQuote: 'Venue: Main Auditorium',
    evidenceLocation: 'Poster body line 4',
    reviewState: 'confirmed',
  });

  // Material 2: WhatsApp Announcement
  const mat2 = await createMaterial(
    ownerId,
    eventId,
    'WhatsApp Group Announcement',
    'text',
    `🚀 Hey hackers! Campus Build Night is happening on October 31, 2026. Doors open at 10:00 AM at the Main Auditorium. Remember, registration deadline is October 30, 2026, 6:00 PM sharp! Don't miss out.`
  );
  await createClaim(ownerId, eventId, mat2.$id, 1, {
    field: 'event_date',
    rawValue: 'October 31, 2026',
    evidenceQuote: 'happening on October 31, 2026',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat2.$id, 1, {
    field: 'start_time',
    rawValue: '10:00 AM',
    evidenceQuote: 'Doors open at 10:00 AM',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat2.$id, 1, {
    field: 'venue',
    rawValue: 'Main Auditorium',
    evidenceQuote: 'at the Main Auditorium',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat2.$id, 1, {
    field: 'registration_deadline',
    rawValue: 'October 30, 2026, 6:00 PM',
    evidenceQuote: 'registration deadline is October 30, 2026, 6:00 PM sharp',
    reviewState: 'confirmed',
  });

  // Material 3: Volunteer Instructions
  const mat3 = await createMaterial(
    ownerId,
    eventId,
    'Volunteer Instructions Handout',
    'text',
    `VOLUNTEER BRIEFING:\nReporting Venue: Main Auditorium, Volunteer Help Desk.\nVolunteer Arrival: 8:30 AM for breakfast and badge assignment.\nNote: General attendee check-in starts later. Do not share volunteer arrival time on attendee channels.`
  );
  await createClaim(ownerId, eventId, mat3.$id, 1, {
    field: 'venue',
    rawValue: 'Main Auditorium',
    evidenceQuote: 'Reporting Venue: Main Auditorium',
    reviewState: 'confirmed',
  });
  await createClaim(ownerId, eventId, mat3.$id, 1, {
    field: 'start_time',
    rawValue: '8:30 AM',
    evidenceQuote: 'Volunteer Arrival: 8:30 AM',
    reviewState: 'needs_clarification',
    ambiguityReason:
      'Volunteer arrival time (8:30 AM) is not verified public event start time.',
  });

  // Material 4: Registration Reminder
  const mat4 = await createMaterial(
    ownerId,
    eventId,
    'Discord Registration Reminder',
    'text',
    `Last chance to register for Campus Build Night! The registration portal closes promptly on October 30, 2026, 6:00 PM. No walk-ins allowed.`
  );
  await createClaim(ownerId, eventId, mat4.$id, 1, {
    field: 'registration_deadline',
    rawValue: 'October 30, 2026, 6:00 PM',
    evidenceQuote: 'closes promptly on October 30, 2026, 6:00 PM',
    reviewState: 'confirmed',
  });

  // Material 5: Sponsor Thank-You Note (No tracked facts)
  await createMaterial(
    ownerId,
    eventId,
    'Sponsor Thank-You Note',
    'text',
    `A huge thank you to our premier sponsors for providing student travel grants and cloud compute credits. We appreciate your generous support in empowering the builder community!`
  );

  // Material 6: Schedule Excerpt
  const mat6 = await createMaterial(
    ownerId,
    eventId,
    'Schedule Excerpt Card',
    'text',
    `SCHEDULE AT A GLANCE:\n10:00 AM — Opening ceremony & keynote remarks\n10:45 AM — Team formation & API mentors\n11:30 AM — Hacking commences\n10:00 PM — Project submissions`
  );
  await createClaim(ownerId, eventId, mat6.$id, 1, {
    field: 'start_time',
    rawValue: '10:00 AM',
    evidenceQuote: '10:00 AM — Opening ceremony',
    reviewState: 'confirmed',
  });

  return eventId;
}
