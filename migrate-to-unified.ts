#!/usr/bin/env node
/**
 * Migration script to move from legacy multi-database to unified database
 */

import { DatabaseMigration } from './src/storage/DatabaseMigration';
import * as fs from 'fs';
import * as path from 'path';

async function migrateToUnified() {
  console.log('Starting migration to unified database architecture...');

  const legacyPaths = {
    knowledgeDb: './data/knowledge.db',
    urlsDb: './data/urls.db',
    originalFilesDb: './data/original_files.db'
  };

  const unifiedPath = './data/unified.db';

  // Check if legacy databases exist
  const hasLegacyData =
    fs.existsSync(legacyPaths.knowledgeDb) ||
    fs.existsSync(legacyPaths.urlsDb) ||
    fs.existsSync(legacyPaths.originalFilesDb);

  if (!hasLegacyData) {
    console.log('No legacy databases found. Creating new unified database...');
    // Will be created automatically when first used
    return;
  }

  // Check if unified already exists
  if (fs.existsSync(unifiedPath)) {
    console.log('Unified database already exists at:', unifiedPath);
    console.log('Skipping migration to avoid data loss.');
    return;
  }

  console.log('Found legacy databases:');
  if (fs.existsSync(legacyPaths.knowledgeDb)) {
    console.log('  - knowledge.db');
  }
  if (fs.existsSync(legacyPaths.urlsDb)) {
    console.log('  - urls.db');
  }
  if (fs.existsSync(legacyPaths.originalFilesDb)) {
    console.log('  - original_files.db');
  }

  // Perform migration
  const migration = new DatabaseMigration({
    knowledgeDbPath: legacyPaths.knowledgeDb,
    urlsDbPath: legacyPaths.urlsDb,
    originalFilesDbPath: legacyPaths.originalFilesDb,
    targetDbPath: unifiedPath,
    backupOriginal: true,
    deleteOriginalAfterSuccess: false, // Keep originals for safety
    verbose: true
  });

  try {
    const result = await migration.migrate();

    if (result.success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('Migrated data:');
      console.log(`  - URLs: ${result.migratedTables.urls}`);
      console.log(`  - Tags: ${result.migratedTables.tags}`);
      console.log(`  - URL-Tags: ${result.migratedTables.urlTags}`);
      console.log(`  - Knowledge Entries: ${result.migratedTables.knowledgeEntries}`);
      console.log(`  - Original Files: ${result.migratedTables.originalFiles}`);
      console.log('\nUnified database created at:', unifiedPath);
      console.log('Legacy databases backed up with .backup extension');
    } else {
      console.error('\n❌ Migration failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateToUnified().catch(console.error);