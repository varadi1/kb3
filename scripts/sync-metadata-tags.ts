#!/usr/bin/env npx tsx

/**
 * Migration script to synchronize tags from metadata JSON to relational database
 * This ensures all tags are properly stored in the url_tags table
 * and removes them from metadata to avoid dual storage
 */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'packages', 'backend', 'data', 'unified.db');

interface UrlRow {
  id: string;
  url: string;
  metadata: string;
}

interface TagRow {
  id: string;
  name: string;
}

class TagMigration {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  async run(): Promise<void> {
    console.log('Starting tag migration from metadata to relational table...\n');

    try {
      // Get all URLs with metadata containing tags
      const urls = await this.getUrlsWithMetadataTags();
      console.log(`Found ${urls.length} URLs with tags in metadata\n`);

      let migrated = 0;
      let errors = 0;

      for (const url of urls) {
        try {
          const metadata = JSON.parse(url.metadata);
          const metadataTags = metadata.tags || [];

          if (metadataTags.length === 0) continue;

          console.log(`Processing ${url.url}:`);
          console.log(`  Metadata tags: ${metadataTags.join(', ')}`);

          // Get current database tags
          const currentTags = await this.getCurrentTags(url.id);
          console.log(`  Current DB tags: ${currentTags.join(', ') || '(none)'}`);

          // Find tags that need to be added
          const tagsToAdd = metadataTags.filter((tag: string) => !currentTags.includes(tag));

          if (tagsToAdd.length > 0) {
            await this.addTagsToUrl(url.id, tagsToAdd);
            console.log(`  Added: ${tagsToAdd.join(', ')}`);
          }

          // Remove tags from metadata
          delete metadata.tags;
          await this.updateMetadata(url.id, metadata);
          console.log('  Removed tags from metadata\n');

          migrated++;
        } catch (error) {
          console.error(`  Error processing ${url.url}: ${error}\n`);
          errors++;
        }
      }

      console.log(`\nMigration complete:`);
      console.log(`  Migrated: ${migrated} URLs`);
      console.log(`  Errors: ${errors} URLs`);

      // Verify migration
      await this.verifyMigration();

    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      this.close();
    }
  }

  private getUrlsWithMetadataTags(): Promise<UrlRow[]> {
    return new Promise((resolve, reject) => {
      this.db.all<UrlRow>(
        `SELECT id, url, metadata FROM urls WHERE metadata LIKE '%"tags":%'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private getCurrentTags(urlId: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all<{ name: string }>(
        `SELECT t.name FROM url_tags ut
         JOIN tags t ON ut.tag_id = t.id
         WHERE ut.url_id = ?`,
        [urlId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows ? rows.map(r => r.name) : []);
        }
      );
    });
  }

  private async addTagsToUrl(urlId: string, tags: string[]): Promise<void> {
    for (const tagName of tags) {
      // Ensure tag exists
      const tagId = await this.ensureTag(tagName);

      // Add association
      await this.run(
        `INSERT OR IGNORE INTO url_tags (url_id, tag_id) VALUES (?, ?)`,
        [urlId, tagId]
      );
    }
  }

  private async ensureTag(name: string): Promise<string> {
    // Check if tag exists
    const existing = await this.get<TagRow>(
      `SELECT id FROM tags WHERE name = ?`,
      [name]
    );

    if (existing) {
      return existing.id;
    }

    // Create new tag
    const id = this.generateUUID();
    await this.run(
      `INSERT INTO tags (id, name, parent_id, created_at, updated_at)
       VALUES (?, ?, NULL, datetime('now'), datetime('now'))`,
      [id, name]
    );

    return id;
  }

  private updateMetadata(urlId: string, metadata: any): Promise<void> {
    return this.run(
      `UPDATE urls SET metadata = ? WHERE id = ?`,
      [JSON.stringify(metadata), urlId]
    );
  }

  private async verifyMigration(): Promise<void> {
    console.log('\nVerifying migration...');

    // Check for any remaining tags in metadata
    const remaining = await this.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM urls WHERE metadata LIKE '%"tags":%'`
    );

    if (remaining && remaining.count > 0) {
      console.warn(`Warning: ${remaining.count} URLs still have tags in metadata`);
    } else {
      console.log('✓ All tags removed from metadata');
    }

    // Check url_tags table
    const tagCount = await this.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM url_tags`
    );

    console.log(`✓ Total tag associations in database: ${tagCount?.count || 0}`);
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private close(): void {
    this.db.close();
  }
}

// Run migration
const migration = new TagMigration(DB_PATH);
migration.run();