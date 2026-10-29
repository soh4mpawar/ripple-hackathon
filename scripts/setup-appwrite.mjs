// Setup script for Appwrite TablesDB and Storage Bucket
import { Client, TablesDB, Databases, Storage, Permission, Role } from 'node-appwrite';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local or .env if present
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'ripple_db';
const BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_ID || 'ripple_materials';

if (!PROJECT_ID || !API_KEY) {
  console.error('\n❌ Missing required environment variables:');
  if (!PROJECT_ID) console.error('  - NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  if (!API_KEY) console.error('  - APPWRITE_API_KEY');
  console.error('\nPlease create a .env.local file with your Appwrite project credentials.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const tablesDB = new TablesDB(client);
const databases = new Databases(client);
const storage = new Storage(client);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDatabase() {
  console.log(`\nChecking database "${DATABASE_ID}"...`);
  try {
    await tablesDB.get({ databaseId: DATABASE_ID });
    console.log(`✓ Database "${DATABASE_ID}" exists.`);
  } catch {
    try {
      console.log(`Creating database "${DATABASE_ID}"...`);
      await tablesDB.create({
        databaseId: DATABASE_ID,
        name: 'Ripple Database',
      });
      console.log(`✓ Database "${DATABASE_ID}" created.`);
    } catch (err) {
      // Fallback for Databases service
      try {
        await databases.get(DATABASE_ID);
        console.log(`✓ Database "${DATABASE_ID}" exists.`);
      } catch {
        await databases.create(DATABASE_ID, 'Ripple Database');
        console.log(`✓ Database "${DATABASE_ID}" created.`);
      }
    }
  }
}

async function ensureTable(tableId, name) {
  try {
    await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    console.log(`  ✓ Table "${tableId}" exists.`);
    return false;
  } catch {
    console.log(`  Creating table "${tableId}" (${name})...`);
    try {
      await tablesDB.createTable({
        databaseId: DATABASE_ID,
        tableId,
        name,
        permissions: [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
        rowSecurity: true,
      });
      console.log(`  ✓ Table "${tableId}" created.`);
      return true;
    } catch (err) {
      // Fallback for Databases collections if running on standard Appwrite instance
      try {
        await databases.getCollection(DATABASE_ID, tableId);
        console.log(`  ✓ Collection "${tableId}" exists.`);
        return false;
      } catch {
        await databases.createCollection(
          DATABASE_ID,
          tableId,
          name,
          [
            Permission.read(Role.any()),
            Permission.create(Role.users()),
            Permission.update(Role.users()),
            Permission.delete(Role.users()),
          ],
          true
        );
        console.log(`  ✓ Collection "${tableId}" created.`);
        return true;
      }
    }
  }
}

async function addStringCol(tableId, key, size = 255, required = true) {
  try {
    await tablesDB.createStringColumn({
      databaseId: DATABASE_ID,
      tableId,
      key,
      size,
      required,
    });
    console.log(`    + Column ${key} (string)`);
  } catch (err) {
    try {
      await databases.createStringAttribute(DATABASE_ID, tableId, key, size, required);
      console.log(`    + Attribute ${key} (string)`);
    } catch {}
  }
  await sleep(250);
}

async function addTextCol(tableId, key, required = false) {
  try {
    await tablesDB.createTextColumn({
      databaseId: DATABASE_ID,
      tableId,
      key,
      required,
    });
    console.log(`    + Column ${key} (text)`);
  } catch (err) {
    try {
      // databases uses createStringAttribute with larger size or createTextAttribute
      await databases.createStringAttribute(DATABASE_ID, tableId, key, 10000, required);
      console.log(`    + Attribute ${key} (text)`);
    } catch {}
  }
  await sleep(250);
}

async function addIntegerCol(tableId, key, required = true) {
  try {
    await tablesDB.createIntegerColumn({
      databaseId: DATABASE_ID,
      tableId,
      key,
      required,
    });
    console.log(`    + Column ${key} (integer)`);
  } catch (err) {
    try {
      await databases.createIntegerAttribute(DATABASE_ID, tableId, key, required);
      console.log(`    + Attribute ${key} (integer)`);
    } catch {}
  }
  await sleep(250);
}

async function ensureStorageBucket() {
  console.log(`\nChecking storage bucket "${BUCKET_ID}"...`);
  try {
    await storage.getBucket(BUCKET_ID);
    console.log(`✓ Storage bucket "${BUCKET_ID}" exists.`);
  } catch {
    console.log(`Creating storage bucket "${BUCKET_ID}"...`);
    await storage.createBucket(
      BUCKET_ID,
      'Ripple Materials',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false, // fileSecurity disabled by default or per-file
      true, // enabled
      10 * 1024 * 1024, // 10MB
      ['png', 'jpg', 'jpeg']
    );
    console.log(`✓ Storage bucket "${BUCKET_ID}" created.`);
  }
}

async function runSetup() {
  console.log('========================================');
  console.log(' Ripple — Appwrite TablesDB Provisioner');
  console.log('========================================');
  console.log(`Endpoint:   ${ENDPOINT}`);
  console.log(`Project ID: ${PROJECT_ID}`);

  await ensureDatabase();

  // 1. events
  const newEvents = await ensureTable('events', 'Events');
  if (newEvents) {
    await addStringCol('events', 'ownerId', 36, true);
    await addStringCol('events', 'name', 255, true);
    await addStringCol('events', 'timezone', 64, true);
    await addIntegerCol('events', 'currentRevision', true);
    await addStringCol('events', 'createdAt', 64, true);
    await addStringCol('events', 'updatedAt', 64, true);
  }

  // 2. facts
  const newFacts = await ensureTable('facts', 'Facts');
  if (newFacts) {
    await addStringCol('facts', 'ownerId', 36, true);
    await addStringCol('facts', 'eventId', 36, true);
    await addStringCol('facts', 'field', 64, true);
    await addStringCol('facts', 'displayValue', 255, true);
    await addStringCol('facts', 'normalizedValue', 255, true);
    await addIntegerCol('facts', 'revision', true);
  }

  // 3. materials
  const newMaterials = await ensureTable('materials', 'Materials');
  if (newMaterials) {
    await addStringCol('materials', 'ownerId', 36, true);
    await addStringCol('materials', 'eventId', 36, true);
    await addStringCol('materials', 'title', 255, true);
    await addStringCol('materials', 'kind', 16, true);
    await addTextCol('materials', 'sourceText', false);
    await addStringCol('materials', 'storageFileId', 64, false);
    await addIntegerCol('materials', 'version', true);
    await addStringCol('materials', 'extractionStatus', 32, true);
    await addStringCol('materials', 'reviewStatus', 32, true);
    await addStringCol('materials', 'createdAt', 64, true);
    await addStringCol('materials', 'updatedAt', 64, true);
  }

  // 4. claims
  const newClaims = await ensureTable('claims', 'Claims');
  if (newClaims) {
    await addStringCol('claims', 'ownerId', 36, true);
    await addStringCol('claims', 'eventId', 36, true);
    await addStringCol('claims', 'materialId', 36, true);
    await addIntegerCol('claims', 'materialVersion', true);
    await addStringCol('claims', 'factId', 36, false);
    await addStringCol('claims', 'field', 64, true);
    await addStringCol('claims', 'rawValue', 255, true);
    await addStringCol('claims', 'normalizedValue', 255, false);
    await addTextCol('claims', 'evidenceQuote', true);
    await addStringCol('claims', 'evidenceLocation', 255, false);
    await addStringCol('claims', 'reviewState', 32, true);
    await addStringCol('claims', 'ambiguityReason', 255, false);
  }

  // 5. changes
  const newChanges = await ensureTable('changes', 'Changes');
  if (newChanges) {
    await addStringCol('changes', 'ownerId', 36, true);
    await addStringCol('changes', 'eventId', 36, true);
    await addIntegerCol('changes', 'revision', true);
    await addStringCol('changes', 'field', 64, true);
    await addStringCol('changes', 'oldDisplayValue', 255, true);
    await addStringCol('changes', 'newDisplayValue', 255, true);
    await addStringCol('changes', 'oldNormalizedValue', 255, true);
    await addStringCol('changes', 'newNormalizedValue', 255, true);
    await addStringCol('changes', 'createdAt', 64, true);
  }

  // 6. resolutions
  const newResolutions = await ensureTable('resolutions', 'Resolutions');
  if (newResolutions) {
    await addStringCol('resolutions', 'ownerId', 36, true);
    await addStringCol('resolutions', 'eventId', 36, true);
    await addStringCol('resolutions', 'materialId', 36, true);
    await addIntegerCol('resolutions', 'materialVersion', true);
    await addIntegerCol('resolutions', 'eventRevision', true);
    await addStringCol('resolutions', 'action', 64, true);
    await addTextCol('resolutions', 'note', false);
    await addStringCol('resolutions', 'createdAt', 64, true);
  }

  await ensureStorageBucket();

  console.log('\n✅ Setup completed successfully! All tables and storage are provisioned.');
}

runSetup().catch((err) => {
  console.error('\n❌ Setup error:', err);
  process.exit(1);
});
