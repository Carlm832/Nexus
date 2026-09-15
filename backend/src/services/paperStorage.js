/* =========================================================================
 * Paper Storage Repository (paperStorage.js)
 * 
 * Centralized data access layer for papers table in Supabase
 * with resilient local JSON fallback.
 * ========================================================================= */
const fs = require('fs');
const path = require('path');
const { supabase } = require('./supabase');

const DB_PATH = path.join(__dirname, '../../data/database.json');

/**
 * Normalize a date string to a valid ISO date (YYYY-MM-DD).
 */
function normalizeDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const ym = dateStr.match(/^(\d{4})-(\d{1,2})$/);
    if (ym) return `${ym[1]}-${String(ym[2]).padStart(2, '0')}-01`;
    const y = dateStr.match(/^(\d{4})$/);
    if (y) return `${y[1]}-01-01`;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

/**
 * Convert a Supabase row (snake_case) -> Nexus paper object (camelCase).
 */
function supabaseRowToPaper(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        authors: row.authors || [],
        journal: row.journal,
        publishDate: row.publish_date,
        doi: row.doi,
        abstract: row.abstract,
        discipline: row.discipline,
        summary: row.summary,
        significance: row.significance,
        limitations: row.limitations,
        reviewStatus: row.review_status || 'peerReviewed',
        audioUrl: row.audio_url || null,
        metrics: {
            evidenceLevel: row.evidence_level || 'Moderate',
            studyType: row.study_type || 'Unknown',
            citations: row.citations_count || 0,
        },
        tags: row.tags || [],
    };
}

/**
 * Convert a Nexus paper object (camelCase) -> Supabase row (snake_case).
 */
function paperToSupabaseRow(paper) {
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

/**
 * Read papers from Supabase (or local JSON fallback).
 */
async function readPapers() {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('papers')
                .select('*')
                .order('publish_date', { ascending: false });

            if (error) throw error;
            return (data || []).map(supabaseRowToPaper);
        } catch (err) {
            console.warn('Supabase read failed, falling back to JSON:', err.message);
        }
    }
    // Fallback to local JSON
    if (!fs.existsSync(DB_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch {
        return [];
    }
}

/**
 * Upsert a paper into Supabase (or append to JSON file as fallback).
 */
async function savePaper(paper) {
    if (supabase) {
        try {
            const row = paperToSupabaseRow(paper);
            const { error } = await supabase
                .from('papers')
                .upsert(row, { onConflict: 'id' });
            if (error) throw error;
            return;
        } catch (err) {
            console.warn('Supabase write failed, falling back to JSON:', err.message);
        }
    }
    // Fallback: write to JSON
    let existingData = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            existingData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        } catch {}
    }
    if (!existingData.some(p => p.id === paper.id)) {
        existingData.unshift(paper);
        fs.writeFileSync(DB_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
    }
}

module.exports = {
    readPapers,
    savePaper,
    supabaseRowToPaper,
    paperToSupabaseRow,
    normalizeDate
};
