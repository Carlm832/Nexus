/* =========================================================================
 * Crossref Library Integration
 * 
 * Provides utility functions to interface with the global Crossref database.
 * Used for querying bulk recent research papers globally or fetching
 * metadata for a specific DOI upon user submission.
 * ========================================================================= */
const axios = require('axios');

const DISCIPLINES = [
    'Neuroscience',
    'Economics',
    'Biology',
    'Artificial Intelligence',
    'Climate Science',
    'Psychology'
];

function decodeHtmlEntities(text = '') {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x2013;/gi, '-')
        .replace(/&#x2014;/gi, '-')
        .replace(/&#x2019;/gi, "'")
        .replace(/&#x201c;/gi, '"')
        .replace(/&#x201d;/gi, '"')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripMarkup(text = '') {
    return decodeHtmlEntities(text)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeAuthors(authors = []) {
    const cleanedAuthors = authors
        .map(author => author.trim())
        .filter(Boolean)
        .filter((author, index, list) => list.indexOf(author) === index);

    if (cleanedAuthors.length === 0) {
        return ['Unknown Author'];
    }

    if (cleanedAuthors.length > 8) {
        return [...cleanedAuthors.slice(0, 8), 'et al.'];
    }

    return cleanedAuthors;
}

function inferDiscipline(text = '', fallback = 'Biology') {
    const normalizedText = text.toLowerCase();
    const disciplineKeywords = [
        {
            discipline: 'Neuroscience',
            keywords: ['brain', 'neuro', 'neuron', 'cortex', 'cognitive', 'dementia', 'parkinson', 'alzheimer']
        },
        {
            discipline: 'Psychology',
            keywords: ['psychology', 'psychiatr', 'depression', 'anxiety', 'behavior', 'behaviour', 'mental health']
        },
        {
            discipline: 'Economics',
            keywords: ['econom', 'market', 'finance', 'trade', 'gdp', 'inflation', 'employment']
        },
        {
            discipline: 'Artificial Intelligence',
            keywords: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'llm', 'reinforcement learning']
        },
        {
            discipline: 'Climate Science',
            keywords: ['climate', 'carbon', 'warming', 'emission', 'biodiversity loss', 'sustainability', 'temperature']
        },
        {
            discipline: 'Biology',
            keywords: ['cell', 'genetic', 'genome', 'protein', 'microbi', 'disease', 'physiology', 'ecology']
        }
    ];

    for (const entry of disciplineKeywords) {
        if (entry.keywords.some(keyword => normalizedText.includes(keyword))) {
            return entry.discipline;
        }
    }

    return fallback;
}

function normalizeDiscipline(rawDiscipline, title = '', abstract = '') {
    if (DISCIPLINES.includes(rawDiscipline)) {
        return rawDiscipline;
    }

    return inferDiscipline(`${title} ${abstract}`);
}

function sanitizePaperRecord(record = {}) {
    const title = stripMarkup(record.title || 'Unknown Title');
    const abstract = stripMarkup(record.abstract || '');

    return {
        ...record,
        title,
        authors: normalizeAuthors(Array.isArray(record.authors) ? record.authors : []),
        journal: stripMarkup(record.journal || 'Unknown Journal'),
        abstract,
        discipline: normalizeDiscipline(record.discipline, title, abstract)
    };
}

const CROSSREF_API_URL = 'https://api.crossref.org/works';

// Polite pool metadata: appending an email allows Crossref monitoring to contact us instead of blocking an IP.
const EMAIL_CONTACT = 'nexus.research.platform@example.com';

/**
 * fetchRecentPapers
 * Queries the Crossref API for recent journal articles that contain abstracts.
 * 
 * @param {string} query - Optional search query to restrict by topic (e.g. "neuroscience")
 * @param {number} limit - Number of results to return
 * @returns {Array} List of raw paper metadata objects directly from Crossref
 */
async function fetchRecentPapers(query = '', limit = 10) {
    try {
        // Randomize the sort criteria so repeated polling yields diverse batches
        const sortOptions = ['published', 'issued', 'relevance'];
        const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];

        // Core query parameters
        const params = {
            rows: limit,
            // Strict filter: must be an article and *must* have an abstract to be parsed by Gemini
            filter: 'type:journal-article,has-abstract:true',
            sort: randomSort,
            order: Math.random() > 0.5 ? 'desc' : 'asc', // To diversify chronological ordering
            mailto: EMAIL_CONTACT
        };

        // Append search string if provided
        if (query) {
            params.query = query;
        }

        console.log(`Fetching papers from Crossref... (Query: "${query}", Limit: ${limit})`);

        // Fire the REST request
        const response = await axios.get(CROSSREF_API_URL, { params });

        if (response.status !== 200) {
            throw new Error(`Crossref API responded with status: ${response.status}`);
        }

        return response.data.message.items;
    } catch (error) {
        console.error('Error fetching from Crossref API:', error.message);
        return [];
    }
}

/**
 * normalizePaperData
 * A critical mapping function that isolates just the necessary variables
 * out of the heavily nested Crossref API response object.
 * 
 * @param {Object} item - A raw Crossref item object
 * @returns {Object} A sanitized data model ready for Gemini analysis
 */
function normalizePaperData(item) {
    // 1. Array parsing for authors (concatenate given & family names gracefully)
    const authorNames = item.author
        ? item.author.map(a => `${a.given || ''} ${a.family || ''}`.trim())
        : ['Unknown Author'];

    // 2. Date parsing: Crossref publishes dates in various keys (published vs created)
    // and as nested arrays (e.g., [2024, 10, 14]).
    const dateParts = item.published?.['date-parts']?.[0] || item.created?.['date-parts']?.[0] || [];
    // Convert [2024, 10, 14] -> "2024-10-14"
    const dateString = dateParts.length > 0 ? dateParts.join('-') : new Date().toISOString().split('T')[0];

    // 3. Assemble normalized container
    return sanitizePaperRecord({
        rawId: item.DOI,
        reviewStatus: 'peerReviewed',
        title: item.title?.[0] || 'Unknown Title',
        authors: authorNames,
        journal: item['container-title']?.[0] || 'Unknown Journal',
        publishDate: dateString,
        abstract: item.abstract || '',
        doiUrl: item.URL || `https://doi.org/${item.DOI}`
    });
}

module.exports = {
    DISCIPLINES,
    fetchRecentPapers,
    inferDiscipline,
    normalizeDiscipline,
    normalizePaperData,
    sanitizePaperRecord
};
