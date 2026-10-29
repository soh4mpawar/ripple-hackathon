import { NextResponse } from 'next/server';
import { requireAuthUser, createAdminClient, STORAGE_BUCKET_ID } from '@/lib/server/appwrite';
import {
  getEventById,
  createMaterial,
  createClaim,
  updateMaterialStatus,
} from '@/lib/server/tables-db';
import { extractClaimsFromMaterial } from '@/lib/server/ai-extractor';
import { ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthUser();
    const { id: eventId } = await params;

    const event = await getEventById(eventId, user.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';

    // Check if multipart form data (Image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const title = (formData.get('title') as string) || 'Event Poster';
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Image file is required for image materials' },
          { status: 400 }
        );
      }

      // Upload file to Appwrite Storage
      const admin = createAdminClient();
      const fileId = ID.unique();
      const buffer = Buffer.from(await file.arrayBuffer());
      const inputFile = InputFile.fromBuffer(buffer, file.name);

      await admin.storage.createFile(
        STORAGE_BUCKET_ID,
        fileId,
        inputFile,
        [
          Permission.read(Role.user(user.id)),
          Permission.update(Role.user(user.id)),
          Permission.delete(Role.user(user.id)),
        ]
      );

      // Create material record
      const material = await createMaterial(
        user.id,
        eventId,
        title,
        'image',
        null,
        fileId
      );

      // Trigger server-side multimodal extraction
      const base64 = buffer.toString('base64');
      const extraction = await extractClaimsFromMaterial({
        kind: 'image',
        imageBase64: base64,
        mimeType: file.type || 'image/png',
        eventTimezone: event.timezone,
      });

      // Save extracted claims as proposed
      if (extraction.success && extraction.claims.length > 0) {
        for (const claim of extraction.claims) {
          await createClaim(user.id, eventId, material.$id, 1, {
            field: claim.field,
            rawValue: claim.rawValue,
            normalizedValue: claim.proposedNormalizedValue,
            evidenceQuote: claim.evidenceQuote,
            evidenceLocation: claim.evidenceLocation,
            reviewState: claim.needsClarification ? 'needs_clarification' : 'proposed',
            ambiguityReason: claim.ambiguityReason,
          });
        }
        await updateMaterialStatus(user.id, material.$id, 'ready', 'unreviewed');
      } else {
        await updateMaterialStatus(user.id, material.$id, 'ready', 'unreviewed');
      }

      return NextResponse.json(
        { material, extractionWarning: extraction.warning },
        { status: 201 }
      );
    }

    // Otherwise JSON body (Plain text material)
    const body = await req.json();
    const title = body.title || 'Announcement Text';
    const sourceText = body.sourceText;

    if (!sourceText) {
      return NextResponse.json(
        { error: 'Source text is required' },
        { status: 400 }
      );
    }

    const material = await createMaterial(
      user.id,
      eventId,
      title,
      'text',
      sourceText,
      null
    );

    // Run extraction
    const extraction = await extractClaimsFromMaterial({
      kind: 'text',
      text: sourceText,
      eventTimezone: event.timezone,
    });

    if (extraction.success && extraction.claims.length > 0) {
      for (const claim of extraction.claims) {
        await createClaim(user.id, eventId, material.$id, 1, {
          field: claim.field,
          rawValue: claim.rawValue,
          normalizedValue: claim.proposedNormalizedValue,
          evidenceQuote: claim.evidenceQuote,
          evidenceLocation: claim.evidenceLocation,
          reviewState: claim.needsClarification ? 'needs_clarification' : 'proposed',
          ambiguityReason: claim.ambiguityReason,
        });
      }
      await updateMaterialStatus(user.id, material.$id, 'ready', 'unreviewed');
    } else {
      await updateMaterialStatus(user.id, material.$id, 'ready', 'unreviewed');
    }

    return NextResponse.json(
      { material, extractionWarning: extraction.warning },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create material' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
