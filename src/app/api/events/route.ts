import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { listUserEvents, createEventWithFacts } from '@/lib/server/tables-db';
import { z } from 'zod';

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  timezone: z.string().default('Asia/Kolkata'),
  facts: z.object({
    event_date: z.string().min(1, 'Event date is required'),
    start_time: z.string().min(1, 'Start time is required'),
    venue: z.string().min(1, 'Venue is required'),
    registration_deadline: z.string().min(1, 'Registration deadline is required'),
  }),
});

export async function GET() {
  try {
    const user = await requireAuthUser();
    const events = await listUserEvents(user.id);
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuthUser();
    const body = await req.json();
    const validated = CreateEventSchema.parse(body);

    const { event, facts } = await createEventWithFacts(
      user.id,
      validated.name,
      validated.timezone,
      validated.facts
    );

    return NextResponse.json({ event, facts }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 400 }
    );
  }
}
