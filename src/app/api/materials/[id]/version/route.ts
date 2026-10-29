import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/server/appwrite';
import {
  dbAdapter,
  createNewMaterialVersion,
  createClaim,
  recordResolution,
  getEventFacts,
  MaterialRow,
} from '@/lib/server/tables-db';
import { z } from 'zod';
import { OfficialField, normalizeFieldValue } from '@/lib/comparison';
import { extractClaimsFromMaterial } from '@/lib/server/ai-extractor';

const ApplyCorrectionSchema = z.object({
  correctedText: z.string().optional(),
  replacementFileId: z.string().optional(),
  eventRevision: z.number().int().positive(),
  expectedMaterialVersion: z.number().int().positive().optional(),
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
      return NextResponse.json({ error: 'Material not found or unauthorized' }, { status: 404 });
    }

    // Verify parent event revision - reject stale suggestions server-side
    const event = await dbAdapter.getRow<any>('events', material.eventId);
    if (!event || event.ownerId !== user.id) {
      return NextResponse.json({ error: 'Parent event not found or unauthorized' }, { status: 404 });
    }

    if (event.currentRevision !== validated.eventRevision) {
      return NextResponse.json(
        {
          error: `Stale correction rejected: Event revision is currently Rev ${event.currentRevision}, but suggestion was generated for Rev ${validated.eventRevision}. Please refresh and regenerate corrections.`,
        },
        { status: 409 }
      );
    }

    if (validated.expectedMaterialVersion && material.version !== validated.expectedMaterialVersion) {
      return NextResponse.json(
        {
          error: `Stale correction rejected: Material is at Version ${material.version}, but expected Version ${validated.expectedMaterialVersion}.`,
        },
        { status: 409 }
      );
    }

    const newVersion = material.version + 1;

    // Create new material version (bumps version number, saves new text/file)
    const updatedMaterial = await createNewMaterialVersion(
      user.id,
      materialId,
      validated.correctedText,
      validated.replacementFileId
    );

    // If confirmed claims provided for the new version, validate source support
    if (validated.confirmedClaims && validated.confirmedClaims.length > 0) {
      for (const c of validated.confirmedClaims) {
        if (c.evidenceQuote.startsWith('Updated in v')) {
          return NextResponse.json(
            { error: 'Synthetic evidence quotes ("Updated in v...") are not permitted.' },
            { status: 400 }
          );
        }
        if (validated.correctedText && !validated.correctedText.includes(c.evidenceQuote)) {
          return NextResponse.json(
            { error: `Evidence quote "${c.evidenceQuote}" does not occur in saved material source text.` },
            { status: 400 }
          );
        }
        await createClaim(user.id, material.eventId, materialId, newVersion, {
          field: c.field as OfficialField,
          rawValue: c.rawValue,
          evidenceQuote: c.evidenceQuote,
          evidenceLocation: c.evidenceLocation || 'Corrected text',
          reviewState: 'confirmed',
        });
      }
    } else if (validated.correctedText) {
      // Automatically extract claims from the actual saved source text
      const extraction = await extractClaimsFromMaterial({
        kind: 'text',
        text: validated.correctedText,
        eventTimezone: event.timezone,
      });

      // Get official facts to cross-reference
      const officialFacts = await getEventFacts(material.eventId, user.id);
      const factMap = new Map(officialFacts.map((f) => [f.field, f]));

      for (const extractedClaim of extraction.claims) {
        const norm = extractedClaim.proposedNormalizedValue || normalizeFieldValue(extractedClaim.field, extractedClaim.rawValue);

        // If ambiguous (e.g. volunteer arrival), keep as needs_clarification.
        // Otherwise confirm the real factual claim extracted from the saved copy.
        const reviewState = extractedClaim.needsClarification
          ? 'needs_clarification'
          : 'confirmed';

        await createClaim(user.id, material.eventId, materialId, newVersion, {
          field: extractedClaim.field,
          rawValue: extractedClaim.rawValue,
          normalizedValue: norm,
          evidenceQuote: extractedClaim.evidenceQuote,
          evidenceLocation: extractedClaim.evidenceLocation || 'Corrected text',
          reviewState,
          ambiguityReason: extractedClaim.ambiguityReason,
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
