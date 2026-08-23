/* =========================================================================
 * OpenAlex Service (openalex.js)
 * 
 * Interfaces with the open-access OpenAlex API (250M+ scientific records)
 * to retrieve recent, highly cited research papers with guaranteed full abstracts.
 * ========================================================================= */
const axios = require('axios');
const { sanitizePaperRecord } = require('./crossref');

const OPENALEX_API_URL = 'https://api.openalex.org/works';
const EMAIL_CONTACT = 'nexus.research.platform@example.com';

const DISCIPLINE_CONCEPTS = {
    'Neuroscience': 'c169760540', // Neuroscience
    'Artificial Intelligence': 'c41008148', // Computer science / AI
    'Climate Science': 'c127413603', // Environmental science / Climate change
    'Economics': 'c162324750', // Economics
    'Biology': 'c86803240', // Biology
    'Psychology': 'c15744967' // Psychology
};

/**
 * reconstructAbstract
 * OpenAlex stores abstracts as an inverted index to optimize storage:
 * e.g., { "The": [0, 15], "brain": [1], "exhibits": [2] }
 * This function reverses the inverted index to produce the full original text.
 */
function reconstructAbstract(invertedIndex) {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';

    const wordPositions = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            wordPositions[pos] = word;
        }
    }

    // Fill in any sparse slots and join
    return wordPositions.filter(Boolean).join(' ');
}

/**
 * fetchOpenAlexPapers
 * Queries OpenAlex works API with strict filters for open access and abstracts.
 * 
 * @param {string} discipline - One of Nexus's supported disciplines
 * @param {string} searchKeyword - Keyword to search (e.g. "neuroplasticity")
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} Normalized raw paper objects
 */
async function fetchOpenAlexPapers(discipline = 'Neuroscience', searchKeyword = '', limit = 10) {
    try {
        const today = new Date().toISOString().split('T')[0]; // e.g. "2026-08-23"
        const params = {
            search: searchKeyword || discipline,
            filter: `has_abstract:true,language:en,publication_date:<${today},type:!preprint`,
            sort: 'publication_date:desc',
            per_page: limit,
            mailto: EMAIL_CONTACT
        };

        const conceptId = DISCIPLINE_CONCEPTS[discipline];
        if (conceptId) {
            params.filter += `,concepts.id:${conceptId}`;
        }

        console.log(`Fetching from OpenAlex... (Discipline: "${discipline}", Query: "${searchKeyword}", Limit: ${limit})`);
        const response = await axios.get(OPENALEX_API_URL, { params, timeout: 15000 });

        if (response.status !== 200 || !response.data?.results) {
            throw new Error(`OpenAlex responded with status ${response.status}`);
        }

        const results = response.data.results;
        const normalizedPapers = [];

        for (const item of results) {
            const rawAbstract = reconstructAbstract(item.abstract_inverted_index);
            if (!rawAbstract || rawAbstract.length < 50) continue; // Skip if abstract is empty or too short

            const authorNames = (item.authorships || [])
                .map(a => a.author?.display_name)
                .filter(Boolean);

            const doi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//i, '') : null;
            const primaryLocation = item.primary_location || {};
            const source = primaryLocation.source || {};
            const journalName = source.display_name || item.host_venue?.display_name || 'Academic Journal';

            const rawPaper = {
                rawId: doi || item.id.replace(/^https?:\/\/openalex\.org\//i, ''),
                title: item.title || item.display_name || 'Unknown Title',
                authors: authorNames.length > 0 ? authorNames : ['Unknown Author'],
                journal: journalName,
                publishDate: item.publication_date || new Date().toISOString().split('T')[0],
                abstract: rawAbstract,
                doiUrl: item.doi || (doi ? `https://doi.org/${doi}` : item.id),
                discipline: discipline,
                reviewStatus: item.type === 'preprint' ? 'preReview' : 'peerReviewed',
                citations: item.cited_by_count || 0
            };

            normalizedPapers.push(sanitizePaperRecord(rawPaper));
        }

        return normalizedPapers;
    } catch (error) {
        console.error(`Error fetching from OpenAlex (${discipline}):`, error.message);
        return [];
    }
}

module.exports = {
    fetchOpenAlexPapers,
    reconstructAbstract
};
