// Repeatable setup & reconciliation script for Appwrite TablesDB and Storage
import { Client, TablesDB, Storage, TablesDBIndexType, OrderBy } from 'node-appwrite';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load .env.local or .env
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
  console.error('\nPlease provide valid credentials in .env.local');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const tablesDB = new TablesDB(client);
const storage = new Storage(client);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures the target database exists in TablesDB.
 */
async function ensureDatabase() {
  console.log(`\nVerifying database "${DATABASE_ID}"...`);
  try {
    await tablesDB.get({ databaseId: DATABASE_ID });
    console.log(`✓ Database "${DATABASE_ID}" is active.`);
  } catch (err) {
    if (err.code === 404 || err.type === 'database_not_found') {
      console.log(`Creating database "${DATABASE_ID}"...`);
      await tablesDB.create({
        databaseId: DATABASE_ID,
        name: 'Ripple Database',
      });
      console.log(`✓ Database "${DATABASE_ID}" created.`);
    } else {
      console.error(`❌ Failed to verify/create database "${DATABASE_ID}":`, err.message);
      throw err;
    }
  }
}

/**
 * Ensures a table exists with rowSecurity enabled and ZERO broad table-level permissions.
 * Reconciles existing tables to strip broad table permissions.
 */
async function ensureTable(tableId, name) {
  try {
    const existing = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    console.log(`\nReconciling table "${tableId}" (${name})...`);

    // Reconcile permissions: strip any broad permissions, enforce rowSecurity
    if (existing.permissions && existing.permissions.length > 0 || !existing.rowSecurity) {
      console.log(`  Updating table "${tableId}" security: rowSecurity=true, permissions=[]`);
      await tablesDB.updateTable({
        databaseId: DATABASE_ID,
        tableId,
        name,
        permissions: [],
        rowSecurity: true,
        enabled: true,
      });
      console.log(`  ✓ Table "${tableId}" security reconciled.`);
    } else {
      console.log(`  ✓ Table "${tableId}" security verified (rowSecurity=true, permissions=[]).`);
    }
  } catch (err) {
    if (err.code === 404 || err.type === 'table_not_found') {
      console.log(`\nCreating table "${tableId}" (${name})...`);
      await tablesDB.createTable({
        databaseId: DATABASE_ID,
        tableId,
        name,
        permissions: [], // No broad grants; rowSecurity handles ownership
        rowSecurity: true,
        enabled: true,
      });
      console.log(`  ✓ Table "${tableId}" created with rowSecurity=true.`);
    } else {
      console.error(`❌ Failed to verify/create table "${tableId}":`, err.message);
      throw err;
    }
  }
}

/**
 * Waits for a column to transition to 'available' status.
 */
async function waitForColumnReady(tableId, key, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const col = await tablesDB.getColumn({ databaseId: DATABASE_ID, tableId, key });
      if (col.status === 'available') {
        return col;
      }
      if (col.status === 'failed' || col.status === 'stuck') {
        throw new Error(`Column "${key}" reached failure state "${col.status}"`);
      }
    } catch (err) {
      if (err.message && err.message.includes('reached failure state')) {
        throw err;
      }
    }
    await sleep(400);
  }
  throw new Error(`Timed out waiting for column "${key}" in table "${tableId}" to become available.`);
}

/**
 * Waits for an index to transition to 'available' status.
 */
async function waitForIndexReady(tableId, key, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const idx = await tablesDB.getIndex({ databaseId: DATABASE_ID, tableId, key });
      if (idx.status === 'available') {
        return idx;
      }
      if (idx.status === 'failed' || idx.status === 'stuck') {
        throw new Error(`Index "${key}" reached failure state "${idx.status}"`);
      }
    } catch (err) {
      if (err.message && err.message.includes('reached failure state')) {
        throw err;
      }
    }
    await sleep(400);
  }
  throw new Error(`Timed out waiting for index "${key}" in table "${tableId}" to become available.`);
}

/**
 * Reconciles string column: creates if missing and waits for readiness.
 */
async function reconcileStringCol(tableId, key, size = 255, required = true, existingKeys) {
  if (existingKeys.has(key)) {
    await waitForColumnReady(tableId, key);
    return;
  }
  console.log(`    + Creating string column: ${key} (size=${size}, req=${required})`);
  await tablesDB.createStringColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    size,
    required,
  });
  await waitForColumnReady(tableId, key);
  console.log(`    ✓ Column "${key}" is ready.`);
}

/**
 * Reconciles text column: creates if missing and waits for readiness.
 */
async function reconcileTextCol(tableId, key, required = false, existingKeys) {
  if (existingKeys.has(key)) {
    await waitForColumnReady(tableId, key);
    return;
  }
  console.log(`    + Creating text column: ${key} (req=${required})`);
  await tablesDB.createTextColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    required,
  });
  await waitForColumnReady(tableId, key);
  console.log(`    ✓ Column "${key}" is ready.`);
}

/**
 * Reconciles integer column: creates if missing and waits for readiness.
 */
async function reconcileIntegerCol(tableId, key, required = true, existingKeys) {
  if (existingKeys.has(key)) {
    await waitForColumnReady(tableId, key);
    return;
  }
  console.log(`    + Creating integer column: ${key} (req=${required})`);
  await tablesDB.createIntegerColumn({
    databaseId: DATABASE_ID,
    tableId,
    key,
    required,
  });
  await waitForColumnReady(tableId, key);
  console.log(`    ✓ Column "${key}" is ready.`);
}

/**
 * Reconciles an index: creates if missing and waits for readiness.
 */
async function reconcileIndex(tableId, key, type, columns, existingIndexKeys) {
  if (existingIndexKeys.has(key)) {
    await waitForIndexReady(tableId, key);
    return;
  }
  console.log(`    + Creating index: ${key} on [${columns.join(', ')}]`);
  await tablesDB.createIndex({
    databaseId: DATABASE_ID,
    tableId,
    key,
    type,
    columns,
  });
  await waitForIndexReady(tableId, key);
  console.log(`    ✓ Index "${key}" is ready.`);
}

/**
 * Ensures private storage bucket with fileSecurity=true and no broad public access.
 */
async function ensureStorageBucket() {
  console.log(`\nVerifying storage bucket "${BUCKET_ID}"...`);
  try {
    const existing = await storage.getBucket({ bucketId: BUCKET_ID });
    console.log(`  Reconciling storage bucket "${BUCKET_ID}"...`);
    // Enforce private storage: fileSecurity=true and empty permissions array
    if (existing.permissions && existing.permissions.length > 0 || !existing.fileSecurity) {
      console.log(`  Updating bucket security: fileSecurity=true, permissions=[]`);
      await storage.updateBucket({
        bucketId: BUCKET_ID,
        name: 'Ripple Materials',
        permissions: [], // Private; individual file permissions govern access
        fileSecurity: true,
        enabled: true,
        maximumFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileExtensions: ['png', 'jpg', 'jpeg'],
      });
      console.log(`  ✓ Storage bucket "${BUCKET_ID}" security reconciled.`);
    } else {
      console.log(`  ✓ Storage bucket "${BUCKET_ID}" security verified (fileSecurity=true, permissions=[]).`);
    }
  } catch (err) {
    if (err.code === 404 || err.type === 'bucket_not_found') {
      console.log(`  Creating private storage bucket "${BUCKET_ID}"...`);
      await storage.createBucket({
        bucketId: BUCKET_ID,
        name: 'Ripple Materials',
        permissions: [], // Private bucket; files use owner permissions
        fileSecurity: true, // Only users with explicit file permissions can access
        enabled: true,
        maximumFileSize: 10 * 1024 * 1024,
        allowedFileExtensions: ['png', 'jpg', 'jpeg'],
      });
      console.log(`  ✓ Private storage bucket "${BUCKET_ID}" created.`);
    } else {
      console.error(`❌ Failed to verify/create storage bucket "${BUCKET_ID}":`, err.message);
      throw err;
    }
  }
}

/**
 * Main provisioning & reconciliation flow.
 */
async function runSetup() {
  console.log('====================================================');
  console.log(' Ripple — Appwrite TablesDB Provisioner & Reconciler');
  console.log('====================================================');
  console.log(`Endpoint:   ${ENDPOINT}`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log(`Database:   ${DATABASE_ID}`);
  console.log(`Storage:    ${BUCKET_ID}`);

  await ensureDatabase();

  // 1. Table: events
  await ensureTable('events', 'Events');
  const colsEvents = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'events' });
  const keysEvents = new Set(colsEvents.columns.map((c) => c.key));
  await reconcileStringCol('events', 'ownerId', 36, true, keysEvents);
  await reconcileStringCol('events', 'name', 255, true, keysEvents);
  await reconcileStringCol('events', 'timezone', 64, true, keysEvents);
  await reconcileIntegerCol('events', 'currentRevision', true, keysEvents);
  await reconcileStringCol('events', 'createdAt', 64, true, keysEvents);
  await reconcileStringCol('events', 'updatedAt', 64, true, keysEvents);

  const idxEvents = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'events' });
  const idxKeysEvents = new Set(idxEvents.indexes.map((i) => i.key));
  await reconcileIndex('events', 'idx_events_owner', TablesDBIndexType.Key, ['ownerId'], idxKeysEvents);

  // 2. Table: facts
  await ensureTable('facts', 'Facts');
  const colsFacts = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'facts' });
  const keysFacts = new Set(colsFacts.columns.map((c) => c.key));
  await reconcileStringCol('facts', 'ownerId', 36, true, keysFacts);
  await reconcileStringCol('facts', 'eventId', 36, true, keysFacts);
  await reconcileStringCol('facts', 'field', 64, true, keysFacts);
  await reconcileStringCol('facts', 'displayValue', 255, true, keysFacts);
  await reconcileStringCol('facts', 'normalizedValue', 255, true, keysFacts);
  await reconcileIntegerCol('facts', 'revision', true, keysFacts);

  const idxFacts = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'facts' });
  const idxKeysFacts = new Set(idxFacts.indexes.map((i) => i.key));
  await reconcileIndex('facts', 'idx_facts_event', TablesDBIndexType.Key, ['ownerId', 'eventId'], idxKeysFacts);

  // 3. Table: materials
  await ensureTable('materials', 'Materials');
  const colsMaterials = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'materials' });
  const keysMaterials = new Set(colsMaterials.columns.map((c) => c.key));
  await reconcileStringCol('materials', 'ownerId', 36, true, keysMaterials);
  await reconcileStringCol('materials', 'eventId', 36, true, keysMaterials);
  await reconcileStringCol('materials', 'title', 255, true, keysMaterials);
  await reconcileStringCol('materials', 'kind', 16, true, keysMaterials);
  await reconcileTextCol('materials', 'sourceText', false, keysMaterials);
  await reconcileStringCol('materials', 'storageFileId', 64, false, keysMaterials);
  await reconcileIntegerCol('materials', 'version', true, keysMaterials);
  await reconcileStringCol('materials', 'extractionStatus', 32, true, keysMaterials);
  await reconcileStringCol('materials', 'reviewStatus', 32, true, keysMaterials);
  await reconcileStringCol('materials', 'createdAt', 64, true, keysMaterials);
  await reconcileStringCol('materials', 'updatedAt', 64, true, keysMaterials);

  const idxMaterials = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'materials' });
  const idxKeysMaterials = new Set(idxMaterials.indexes.map((i) => i.key));
  await reconcileIndex('materials', 'idx_materials_event', TablesDBIndexType.Key, ['ownerId', 'eventId'], idxKeysMaterials);

  // 4. Table: material_versions
  await ensureTable('material_versions', 'Material Versions');
  const colsMV = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'material_versions' });
  const keysMV = new Set(colsMV.columns.map((c) => c.key));
  await reconcileStringCol('material_versions', 'ownerId', 36, true, keysMV);
  await reconcileStringCol('material_versions', 'eventId', 36, true, keysMV);
  await reconcileStringCol('material_versions', 'materialId', 36, true, keysMV);
  await reconcileIntegerCol('material_versions', 'version', true, keysMV);
  await reconcileTextCol('material_versions', 'sourceText', false, keysMV);
  await reconcileStringCol('material_versions', 'storageFileId', 64, false, keysMV);
  await reconcileStringCol('material_versions', 'createdAt', 64, true, keysMV);

  const idxMV = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'material_versions' });
  const idxKeysMV = new Set(idxMV.indexes.map((i) => i.key));
  await reconcileIndex('material_versions', 'idx_mv_mat', TablesDBIndexType.Key, ['ownerId', 'materialId'], idxKeysMV);

  // 5. Table: claims
  await ensureTable('claims', 'Claims');
  const colsClaims = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'claims' });
  const keysClaims = new Set(colsClaims.columns.map((c) => c.key));
  await reconcileStringCol('claims', 'ownerId', 36, true, keysClaims);
  await reconcileStringCol('claims', 'eventId', 36, true, keysClaims);
  await reconcileStringCol('claims', 'materialId', 36, true, keysClaims);
  await reconcileIntegerCol('claims', 'materialVersion', true, keysClaims);
  await reconcileStringCol('claims', 'factId', 36, false, keysClaims);
  await reconcileStringCol('claims', 'field', 64, true, keysClaims);
  await reconcileStringCol('claims', 'rawValue', 255, true, keysClaims);
  await reconcileStringCol('claims', 'normalizedValue', 255, false, keysClaims);
  await reconcileTextCol('claims', 'evidenceQuote', true, keysClaims);
  await reconcileStringCol('claims', 'evidenceLocation', 255, false, keysClaims);
  await reconcileStringCol('claims', 'reviewState', 32, true, keysClaims);
  await reconcileStringCol('claims', 'ambiguityReason', 255, false, keysClaims);

  const idxClaims = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'claims' });
  const idxKeysClaims = new Set(idxClaims.indexes.map((i) => i.key));
  await reconcileIndex('claims', 'idx_claims_mat', TablesDBIndexType.Key, ['ownerId', 'materialId'], idxKeysClaims);

  // 6. Table: changes
  await ensureTable('changes', 'Changes');
  const colsChanges = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'changes' });
  const keysChanges = new Set(colsChanges.columns.map((c) => c.key));
  await reconcileStringCol('changes', 'ownerId', 36, true, keysChanges);
  await reconcileStringCol('changes', 'eventId', 36, true, keysChanges);
  await reconcileIntegerCol('changes', 'revision', true, keysChanges);
  await reconcileStringCol('changes', 'field', 64, true, keysChanges);
  await reconcileStringCol('changes', 'oldDisplayValue', 255, true, keysChanges);
  await reconcileStringCol('changes', 'newDisplayValue', 255, true, keysChanges);
  await reconcileStringCol('changes', 'oldNormalizedValue', 255, true, keysChanges);
  await reconcileStringCol('changes', 'newNormalizedValue', 255, true, keysChanges);
  await reconcileStringCol('changes', 'createdAt', 64, true, keysChanges);

  const idxChanges = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'changes' });
  const idxKeysChanges = new Set(idxChanges.indexes.map((i) => i.key));
  await reconcileIndex('changes', 'idx_changes_event', TablesDBIndexType.Key, ['ownerId', 'eventId'], idxKeysChanges);

  // 7. Table: resolutions
  await ensureTable('resolutions', 'Resolutions');
  const colsResolutions = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId: 'resolutions' });
  const keysResolutions = new Set(colsResolutions.columns.map((c) => c.key));
  await reconcileStringCol('resolutions', 'ownerId', 36, true, keysResolutions);
  await reconcileStringCol('resolutions', 'eventId', 36, true, keysResolutions);
  await reconcileStringCol('resolutions', 'materialId', 36, true, keysResolutions);
  await reconcileIntegerCol('resolutions', 'materialVersion', true, keysResolutions);
  await reconcileIntegerCol('resolutions', 'eventRevision', true, keysResolutions);
  await reconcileStringCol('resolutions', 'action', 64, true, keysResolutions);
  await reconcileTextCol('resolutions', 'note', false, keysResolutions);
  await reconcileStringCol('resolutions', 'createdAt', 64, true, keysResolutions);

  const idxResolutions = await tablesDB.listIndexes({ databaseId: DATABASE_ID, tableId: 'resolutions' });
  const idxKeysResolutions = new Set(idxResolutions.indexes.map((i) => i.key));
  await reconcileIndex('resolutions', 'idx_res_mat', TablesDBIndexType.Key, ['ownerId', 'materialId'], idxKeysResolutions);

  // 8. Storage Bucket
  await ensureStorageBucket();

  console.log('\n====================================================');
  console.log('✅ All 7 Tables and Storage Bucket are fully ready!');
  console.log('====================================================');
}

runSetup().catch((err) => {
  console.error('\n❌ Provisioning error:', err);
  process.exit(1);
});
