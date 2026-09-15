/* =========================================================================
 * Migration Script: Seed Supabase from database.json
 *
 * Run once to migrate all existing papers from the local JSON database
 * into the Supabase `papers` table.
 *
 * Usage:  node src/scripts/migrate.js
 * ========================================================================= */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { supabase } = require('../services/supabase');

const DB_PATH = path.join(__dirname, '../../data/database.json');

/**
 * Normalize a date string to a valid ISO date (YYYY-MM-DD).
 * Handles partial formats like "2014-3" → "2014-03-01".
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    // Full ISO date already
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Year-month only e.g. "2014-3" or "2014-03"
    const ym = dateStr.match(/^(\d{4})-(\d{1,2})$/);
    if (ym) {
        const month = String(ym[2]).padStart(2, '0');
        return `${ym[1]}-${month}-01`;
    }
    // Year only e.g. "2014"
    const y = dateStr.match(/^(\d{4})$/);
    if (y) return `${y[1]}-01-01`;
    // Try native parse as last resort
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

/**
 * Transform a local paper object into a Supabase-compatible row shape.
 */
function paperToRow(paper) {
    return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors || [],
        journal: paper.journal || null,
        publish_date: normalizeDate(paper.publishDate),
        doi: paper.doi || null,
        abstract: paper.abstract || null,
        discipline: paper.discipline || null,
        summary: paper.summary || null,
        significance: paper.significance || null,
        limitations: paper.limitations || null,
        review_status: paper.reviewStatus || 'peerReviewed',
        audio_url: paper.audioUrl || null,
        evidence_level: paper.metrics?.evidenceLevel || 'Moderate',
        study_type: paper.metrics?.studyType || null,
        citations_count: paper.metrics?.citations || 0,
        tags: paper.tags || [],
    };
}

async function migrate() {
    if (!supabase) {
        console.error('Supabase client not initialised. Check your .env file.');
        process.exit(1);
    }

    if (!fs.existsSync(DB_PATH)) {
        console.log('No database.json found. Nothing to migrate.');
        process.exit(0);
    }

    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const papers = JSON.parse(raw);

    console.log(`Migrating ${papers.length} papers to Supabase...`);

    const rows = papers.map(paperToRow);

    // Upsert in batches of 50
    const BATCH = 50;
    let migrated = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { error } = await supabase
            .from('papers')
            .upsert(batch, { onConflict: 'id' });

        if (error) {
            console.error(`Error upserting batch starting at index ${i}:`, error.message);
        } else {
            migrated += batch.length;
            console.log(`  Migrated ${migrated}/${rows.length} papers`);
        }
    }

    console.log(`\n✅ Migration complete: ${migrated}/${rows.length} papers inserted into Supabase.`);
}

migrate();
