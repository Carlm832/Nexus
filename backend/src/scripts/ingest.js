/* =========================================================================
 * Bulk Ingestion Script (ingest.js)
 * 
 * Scalable ingestion pipeline using OpenAlex & Crossref APIs.
 * Generates structured Gemini AI syntheses with automated deduplication
 * and on-demand audio generation capabilities.
 * ========================================================================= */
const fs = require('fs');
const path = require('path');
const { fetchOpenAlexPapers } = require('../services/openalex');
const { fetchRecentPapers, normalizePaperData, sanitizePaperRecord } = require('../services/crossref');
const { generateInsights } = require('../services/llm');
const { generateSpeech } = require('../services/tts');

const DEFAULT_TOPICS = [
    { discipline: 'Neuroscience', query: 'neuroplasticity OR cognitive neuroscience OR brain' },
    { discipline: 'Artificial Intelligence', query: 'deep learning OR large language models OR neural networks' },
    { discipline: 'Climate Science', query: 'climate change OR carbon emissions OR renewable energy' },
    { discipline: 'Economics', query: 'behavioral economics OR monetary policy OR market volatility' },
    { discipline: 'Biology', query: 'genomics OR microbiome OR cellular biology' },
    { discipline: 'Psychology', query: 'cognitive psychology OR mental health OR decision making' }
];

const DB_PATH = path.join(__dirname, '../../data/database.json');
const AUDIO_DIR = path.join(__dirname, '../../data/audio');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * runIngestion
 * 
 * @param {Array} topics - List of topic objects { discipline, query }
 * @param {number} limitPerTopic - Papers to ingest per topic
 * @param {Object} options - { source: 'openalex' | 'crossref' | 'all', generateAudio: boolean }
 */
async function runIngestion(
    topics = DEFAULT_TOPICS,
    limitPerTopic = 5,
    options = { source: 'openalex', generateAudio: false }
) {
    console.log('--- Starting Nexus High-Yield Ingestion Pipeline ---');
    console.log(`Source: ${options.source}, Generate Audio: ${options.generateAudio}`);

    let allProcessedPapers = [];

    // 1. Load existing database
    let existingData = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            existingData = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')).map(sanitizePaperRecord);
        } catch {
            console.warn('Could not parse existing database, starting fresh.');
        }
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // end of today

    /**
     * isPublished — rejects forthcoming, future-dated, and pre-review papers.
     */
    function isPublished(paper) {
        if (!paper.publishDate) return false;
        const pubDate = new Date(paper.publishDate);
        if (isNaN(pubDate.getTime())) return false;
        if (pubDate > today) return false;                         // future-dated
        if (paper.reviewStatus === 'preReview') return false;      // preprint / unreviewed
        return true;
    }

    // Clean existing database: strip future-dated / pre-review entries
    const beforeCount = existingData.length;
    existingData = existingData.filter(isPublished);
    const removed = beforeCount - existingData.length;
    if (removed > 0) {
        console.log(`Removed ${removed} forthcoming/pre-review papers from existing database.`);
    }

    const existingIds = new Set(existingData.map(p => p.id));

    // 2. Iterate over disciplines
    for (const topic of topics) {
        const discipline = topic.discipline || topic.label || 'Neuroscience';
        const query = topic.query || topic.label || discipline;

        console.log(`\n========================================`);
        console.log(`> Ingesting: ${discipline} ("${query}")`);
        console.log(`========================================`);

        let rawItems = [];

        if (options.source === 'openalex' || options.source === 'all') {
            const openAlexItems = await fetchOpenAlexPapers(discipline, query, limitPerTopic);
            rawItems = [...rawItems, ...openAlexItems];
        }

        if (options.source === 'crossref' || options.source === 'all') {
            const crossrefRaw = await fetchRecentPapers(query, limitPerTopic);
            const crossrefNormalized = crossrefRaw.map(normalizePaperData);
            rawItems = [...rawItems, ...crossrefNormalized];
        }

        console.log(`Found ${rawItems.length} candidate papers with abstracts.`);

        // 3. Process candidate papers
        for (const item of rawItems) {
            const paperId = item.rawId || item.id;
            if (!paperId || existingIds.has(paperId)) {
                console.log(`Skipping already ingested paper: ${paperId}`);
                continue;
            }

            console.log(`\nValidating: "${(item.title || '').substring(0, 65)}"`);

            // Gate: reject forthcoming or pre-review papers before LLM call
            if (!isPublished(item)) {
                const reason = new Date(item.publishDate) > today ? 'future date' : 'pre-review';
                console.log(`  ↳ Skipped (${reason}): ${item.publishDate || 'no date'}`);
                continue;
            }

            console.log(`  ↳ Synthesizing...`);

            const processedPaper = await generateInsights(item);
            if (processedPaper) {
                if (item.citations) {
                    processedPaper.metrics.citations = item.citations;
                }

                // Optional audio pre-generation (disabled by default in bulk to save voice quota)
                if (options.generateAudio) {
                    console.log(`Generating audio narration for ${processedPaper.id}...`);
                    const audioFilename = `${processedPaper.id.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
                    const audioPath = path.join(AUDIO_DIR, audioFilename);
                    const textToRead = `${processedPaper.title}. Summary: ${processedPaper.summary} Why it matters: ${processedPaper.significance}`;

                    const hasAudio = await generateSpeech(textToRead, audioPath);
                    if (hasAudio) {
                        processedPaper.audioUrl = `/api/audio/${audioFilename}`;
                    }
                }

                allProcessedPapers.push(processedPaper);
                existingIds.add(processedPaper.id);
                console.log(`✅ Ingested successfully: [${processedPaper.discipline}] ${processedPaper.id}`);

                // Rate-limiting delay between Gemini calls
                await sleep(1500);
            }
        }
    }

    // 4. Combine and persist to database
    const finalDatabase = [...allProcessedPapers, ...existingData];
    finalDatabase.sort((a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0));

    fs.writeFileSync(DB_PATH, JSON.stringify(finalDatabase, null, 2), 'utf-8');

    console.log(`\n========================================`);
    console.log(`--- Pipeline Summary ---`);
    console.log(`Newly synthesized papers: ${allProcessedPapers.length}`);
    console.log(`Total database size: ${finalDatabase.length} papers`);
    console.log(`Database saved to: ${DB_PATH}`);
    console.log(`========================================\n`);

    return allProcessedPapers;
}

if (require.main === module) {
    const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 4;
    runIngestion(DEFAULT_TOPICS, limit, { source: 'openalex', generateAudio: false })
        .catch(console.error);
}

module.exports = {
    DEFAULT_TOPICS,
    runIngestion
};

