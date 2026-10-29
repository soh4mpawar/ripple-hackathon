import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import { updateOfficialDetails } from '@/lib/server/tables-db';
import { z } from 'zod';

const UpdateOfficialDetailsSchema = z.object({
  expectedRevision: z.number().int().positive(),
  updatedFields: z.object({
    event_date: z.string().optional(),
    start_time: z.string().optional(),
    venue: z.string().optional(),
    registration_deadline: z.string().optional(),
  }),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: eventId } = await params;
    const body = await req.json();

    const validated = UpdateOfficialDetailsSchema.parse(body);

    const result = await updateOfficialDetails(
      user.id,
      eventId,
      validated.expectedRevision,
      validated.updatedFields
    );

    return NextResponse.json({
      success: true,
      event: result.event,
      changes: result.changes,
      newRevision: result.newRevision,
    });
  } catch (error: any) {
    const msg = error.message || '';
    const isConflict =
      msg.toLowerCase().includes('revision conflict') ||
      msg.toLowerCase().includes('transaction') ||
      msg.toLowerCase().includes('conflict') ||
      error.code === 409;
    return NextResponse.json(
      { error: msg || 'Failed to update official details' },
      { status: isConflict ? 409 : 400 }
    );
  }
}
