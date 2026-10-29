import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import {
  dbAdapter,
  createNewMaterialVersion,
  createClaim,
  recordResolution,
  MaterialRow,
} from '@/lib/server/tables-db';
import { z } from 'zod';
import { OfficialField } from '@/lib/comparison';

const ApplyCorrectionSchema = z.object({
  correctedText: z.string().optional(),
  replacementFileId: z.string().optional(),
  eventRevision: z.number().int().positive(),
  confirmedClaims: z
    .array(
      z.object({
        field: z.enum(['event_date', 'start_time', 'venue', 'registration_deadline']),
        rawValue: z.string().min(1),
        evidenceQuote: z.string().min(1),
        evidenceLocation: z.string().optional().nullable(),
      })
    )
    .optional(),
  note: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: materialId } = await params;
    const body = await req.json();

    const validated = ApplyCorrectionSchema.parse(body);

    const material = await dbAdapter.getRow<MaterialRow>('materials', materialId);
    if (!material || material.ownerId !== user.id) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const newVersion = material.version + 1;

    // Create new material version (bumps version number, saves new text/file)
    const updatedMaterial = await createNewMaterialVersion(
      user.id,
      materialId,
      validated.correctedText,
      validated.replacementFileId
    );

    // If confirmed claims provided for the new version, insert them
    if (validated.confirmedClaims && validated.confirmedClaims.length > 0) {
      for (const c of validated.confirmedClaims) {
        await createClaim(user.id, material.eventId, materialId, newVersion, {
          field: c.field as OfficialField,
          rawValue: c.rawValue,
          evidenceQuote: c.evidenceQuote,
          evidenceLocation: c.evidenceLocation,
          reviewState: 'confirmed',
        });
      }
    }

    // Record resolution audit
    await recordResolution(
      user.id,
      material.eventId,
      materialId,
      newVersion,
      validated.eventRevision,
      `Applied correction (Version ${newVersion})`,
      validated.note || 'Material revised and claims reconfirmed to match official details.'
    );

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      newVersion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create new material version' },
      { status: error.message?.includes('Unauthorized') ? 401 : 400 }
    );
  }
}
