/* =========================================================================
 * CLI Tool: Add DOI to Supabase (addDoi.js)
 *
 * Fetches paper metadata from Crossref, synthesizes insights using Gemini AI,
 * optionally generates ElevenLabs audio narration, and inserts directly
 * into the Supabase `papers` table.
 *
 * Usage:
 *   node src/scripts/addDoi.js 10.1038/s41586-020-2649-2
 *   node src/scripts/addDoi.js --audio 10.1038/s41586-020-2649-2
 * ========================================================================= */
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { supabase } = require('../services/supabase');
const { normalizePaperData } = require('../services/crossref');
const { generateInsights } = require('../services/llm');
const { generateSpeech } = require('../services/tts');

const AUDIO_DIR = path.join(__dirname, '../../data/audio');
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function normalizeDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const ym = dateStr.match(/^(\d{4})-(\d{1,2})$/);
    if (ym) {
        const month = String(ym[2]).padStart(2, '0');
        return `${ym[1]}-${month}-01`;
    }
    const y = dateStr.match(/^(\d{4})$/);
    if (y) return `${y[1]}-01-01`;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
}

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

async function addDoi(doiInput, withAudio = false) {
    // Strip leading URL if provided (e.g., https://doi.org/10.1038/...)
    const cleanDoi = doiInput.replace(/^https?:\/\/doi\.org\//i, '').trim();

    if (!cleanDoi) {
        console.error('❌ Error: Please provide a valid DOI.');
        process.exit(1);
    }

    console.log(`\n🔍 Fetching metadata for DOI: ${cleanDoi}...`);

    try {
        const response = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
        if (response.status !== 200 || !response.data?.message) {
            console.error('❌ Error: DOI not found in Crossref.');
            return;
        }

        const rawItem = response.data.message;
        const normalized = normalizePaperData(rawItem);

        if (!normalized.abstract) {
            console.warn('⚠️ Warning: No abstract available in Crossref metadata (paywalled paper).');
            console.log('Attempting synthesis with title & metadata...');
        }

        console.log(`🧠 Synthesizing structured insights with Gemini AI...`);
        const processed = await generateInsights(normalized);

        if (!processed) {
            console.error('❌ Failed to generate insights with Gemini.');
            return;
        }

        if (withAudio) {
            console.log(`🎙️ Generating voice narration with ElevenLabs...`);
            const audioFilename = `${processed.id.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
            const audioPath = path.join(AUDIO_DIR, audioFilename);
            const textToRead = `${processed.title}. Summary: ${processed.summary} Why it matters: ${processed.significance}`;

            const hasAudio = await generateSpeech(textToRead, audioPath);
            if (hasAudio) {
                processed.audioUrl = `/api/audio/${audioFilename}`;
                console.log(`✅ Audio saved to ${audioFilename}`);
            }
        }

        if (supabase) {
            console.log(`💾 Saving to Supabase database...`);
            const row = paperToRow(processed);
            const { data, error } = await supabase
                .from('papers')
                .upsert(row, { onConflict: 'id' })
                .select();

            if (error) {
                console.error('❌ Supabase insert error:', error.message);
            } else {
                console.log(`\n🎉 Success! Paper added to Supabase:`);
                console.log(`   Title: "${processed.title}"`);
                console.log(`   Discipline: ${processed.discipline}`);
                console.log(`   ID: ${processed.id}`);
                console.log(`   DOI: ${processed.doi}`);
            }
        } else {
            console.warn('⚠️ Supabase client not connected. Paper was synthesized but not persisted to DB.');
        }
    } catch (err) {
        console.error('❌ Error processing DOI:', err.message);
    }
}

// CLI argument parsing
if (require.main === module) {
    const args = process.argv.slice(2);
    const withAudio = args.includes('--audio');
    const doi = args.find(a => !a.startsWith('--'));

    if (!doi) {
        console.log(`
Nexus DOI Ingestion CLI
Usage:
  node src/scripts/addDoi.js <DOI>
  node src/scripts/addDoi.js --audio <DOI>

Examples:
  node src/scripts/addDoi.js 10.1038/s41586-020-2649-2
  node src/scripts/addDoi.js --audio 10.1126/science.abc1234
        `);
        process.exit(0);
    }

    addDoi(doi, withAudio);
}

module.exports = { addDoi };
