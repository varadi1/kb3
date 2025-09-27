#!/usr/bin/env npx tsx

import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const dbPath = path.join(__dirname, 'data', 'urls.db');

interface UrlRecord {
  url: string;
  status: string;
  content_hash: string | null;
  first_seen: number;
  last_checked: number;
  process_count: number;
  error_message: string | null;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatHash(hash: string | null): string {
  if (!hash) return 'No hash';
  return hash.substring(0, 12) + '...';
}

async function listUrls() {
  const db = new sqlite3.Database(dbPath);

  console.log('\n📊 URLs in Database');
  console.log('━'.repeat(80));

  const query = `
    SELECT url, status, content_hash, first_seen, last_checked, process_count, error_message
    FROM urls
    ORDER BY last_checked DESC
  `;

  db.all(query, (err, rows: UrlRecord[]) => {
    if (err) {
      console.error('Error reading database:', err);
      db.close();
      return;
    }

    if (rows.length === 0) {
      console.log('No URLs found in database.');
      db.close();
      return;
    }

    // Summary statistics
    const stats = {
      total: rows.length,
      completed: rows.filter(r => r.status === 'completed').length,
      failed: rows.filter(r => r.status === 'failed').length,
      pending: rows.filter(r => r.status === 'pending').length,
      processing: rows.filter(r => r.status === 'processing').length,
      skipped: rows.filter(r => r.status === 'skipped').length
    };

    console.log('\n📈 Summary:');
    console.log(`  Total URLs: ${stats.total}`);
    console.log(`  ✅ Completed: ${stats.completed}`);
    console.log(`  ❌ Failed: ${stats.failed}`);
    console.log(`  ⏳ Pending: ${stats.pending}`);
    console.log(`  🔄 Processing: ${stats.processing}`);
    console.log(`  ⏭️  Skipped: ${stats.skipped}`);

    console.log('\n📝 URL Details:');
    console.log('─'.repeat(80));

    rows.forEach((row, index) => {
      const statusEmoji = {
        'completed': '✅',
        'failed': '❌',
        'pending': '⏳',
        'processing': '🔄',
        'skipped': '⏭️'
      }[row.status] || '❓';

      console.log(`\n${index + 1}. ${statusEmoji} ${row.url}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Hash: ${formatHash(row.content_hash)}`);
      console.log(`   First seen: ${formatDate(row.first_seen)}`);
      console.log(`   Last checked: ${formatDate(row.last_checked)}`);
      console.log(`   Process count: ${row.process_count}`);

      if (row.error_message) {
        console.log(`   ⚠️  Error: ${row.error_message}`);
      }
    });

    console.log('\n' + '━'.repeat(80));
    db.close();
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const filterStatus = args.find(arg => arg.startsWith('--status='))?.split('=')[1];

if (showHelp) {
  console.log(`
📋 URL Database Viewer
────────────────────────
Usage: npx tsx list-urls.ts [options]

Options:
  --help, -h       Show this help message
  --status=STATUS  Filter by status (completed, failed, pending, etc.)

Examples:
  npx tsx list-urls.ts                    # List all URLs
  npx tsx list-urls.ts --status=failed    # Show only failed URLs
  `);
  process.exit(0);
}

listUrls();