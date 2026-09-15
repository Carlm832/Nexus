/* =========================================================================
 * OpenAlex Global Search Service (openalexSearch.js)
 * 
 * Provides live, real-time querying against OpenAlex's 250M+ scholarly index.
 * Supports keyword search, author search, discipline filtering, year ranges,
 * citation count sorting, and open-access PDF resolution.
 * ========================================================================= */
const axios = require('axios');

const OPENALEX_API_URL = 'https://api.openalex.org/works';
const EMAIL_CONTACT = 'nexus.scholarly.engine@example.com';

// Concept IDs for major academic domains in OpenAlex
const DOMAIN_CONCEPTS = {
    'Artificial Intelligence': 'c41008148',
    'Computer Science': 'c41008148',
    'Neuroscience': 'c169760540',
    'Health & Medicine': 'c71924100',
    'Medicine': 'c71924100',
    'Biology': 'c86803240',
    'Economics': 'c162324750',
    'Climate Science': 'c127413603',
    'Environmental Science': 'c127413603',
    'Psychology': 'c15744967',
    'Physics': 'c121332964',
    'Quantum Physics': 'c121332964',
    'Chemistry': 'c185592680',
    'Engineering': 'c127413603',
    'Materials Science': 'c192562407',
    'Mathematics': 'c33923547'
};

/**
 * reconstructAbstract
 * Reconstructs inverted index abstracts into full English strings.
 */
function reconstructAbstract(invertedIndex) {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';
    const wordPositions = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
        for (const pos of positions) {
            wordPositions[pos] = word;
        }
    }
    return wordPositions.filter(Boolean).join(' ');
}

/**
 * searchGlobalPapers
 * 
 * @param {Object} options
 * @param {string} options.q - Search query / keyword
 * @param {string} options.discipline - Optional academic discipline filter
 * @param {number|string} options.fromYear - Filter papers published >= fromYear
 * @param {number|string} options.toYear - Filter papers published <= toYear
 * @param {boolean} options.openAccessOnly - If true, only return open-access papers
 * @param {string} options.sort - 'cited_by_count:desc' | 'publication_date:desc' | 'relevance_score:desc'
 * @param {number} options.page - Page number (default 1)
 * @param {number} options.perPage - Items per page (default 20, max 50)
 */
async function searchGlobalPapers({
    q = '',
    discipline = '',
    fromYear = null,
    toYear = null,
    openAccessOnly = false,
    sort = null,
    page = 1,
    perPage = 20
} = {}) {
    try {
        const filters = [];

        // Year filtering
        if (fromYear) {
            filters.push(`from_publication_date:${fromYear}-01-01`);
        }
        if (toYear) {
            filters.push(`to_publication_date:${toYear}-12-31`);
        }

        // Open Access filtering
        if (openAccessOnly) {
            filters.push('is_oa:true');
        }

        // Discipline concept filter
        if (discipline && DOMAIN_CONCEPTS[discipline]) {
            filters.push(`concepts.id:${DOMAIN_CONCEPTS[discipline]}`);
        }

        const params = {
            per_page: Math.min(perPage, 50),
            page: Math.max(1, page),
            mailto: EMAIL_CONTACT
        };

        if (filters.length > 0) {
            params.filter = filters.join(',');
        }

        const queryTrimmed = (q || '').trim();
        if (queryTrimmed) {
            params.search = queryTrimmed;
        }

        // Apply sort: when searching with a query, default to OpenAlex relevance ranking unless explicitly requested
        if (sort && sort !== 'relevance' && sort !== 'default') {
            params.sort = sort;
        } else if (!queryTrimmed && !sort) {
            params.sort = 'cited_by_count:desc';
        }

        console.log(`[OpenAlex Global Search] Query: "${queryTrimmed}", Filters: "${params.filter || 'none'}", Sort: "${params.sort || 'relevance'}", Page: ${page}`);

        const response = await axios.get(OPENALEX_API_URL, { params, timeout: 15000 });

        if (response.status !== 200 || !response.data?.results) {
            return { results: [], total: 0, page, perPage };
        }

        const rawResults = response.data.results;
        const totalCount = response.data.meta?.count || rawResults.length;

        const cleanQ = queryTrimmed.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

        const normalized = rawResults.map(item => {
            const rawAbstract = reconstructAbstract(item.abstract_inverted_index);
            const authorNames = (item.authorships || [])
                .map(a => a.author?.display_name)
                .filter(Boolean);

            const doi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//i, '') : null;
            const primaryLocation = item.primary_location || {};
            const source = primaryLocation.source || {};
            const journalName = source.display_name || item.host_venue?.display_name || 'Academic Journal';

            // Find best Open Access PDF / full-text URL
            const oaInfo = item.open_access || {};
            const oaUrl = oaInfo.oa_url || primaryLocation.pdf_url || primaryLocation.landing_page_url || (doi ? `https://doi.org/${doi}` : null);

            // Infer best discipline label
            let inferredDiscipline = discipline;
            if (!inferredDiscipline) {
                const primaryTopic = item.primary_topic || {};
                inferredDiscipline = primaryTopic.field?.display_name || primaryTopic.domain?.display_name || 'General Science';
            }

            // Extract topic tags
            const tags = (item.concepts || [])
                .slice(0, 4)
                .map(c => c.display_name)
                .filter(Boolean);

            const pubDate = item.publication_date || `${item.publication_year || 2024}-01-01`;
            const title = item.title || item.display_name || 'Untitled Paper';

            return {
                id: doi || item.id.replace(/^https?:\/\/openalex\.org\//i, ''),
                rawId: doi || item.id.replace(/^https?:\/\/openalex\.org\//i, ''),
                title: title,
                authors: authorNames.length > 0 ? authorNames : ['Unknown Author'],
                journal: journalName,
                publishDate: pubDate,
                publicationYear: item.publication_year || (pubDate ? parseInt(pubDate.split('-')[0], 10) : 2024),
                abstract: rawAbstract || 'Abstract not directly indexed in open metadata. Instant AI synthesis will generate full methodology and real-world significance on demand.',
                doi: doi ? `https://doi.org/${doi}` : null,
                rawDoi: doi,
                discipline: inferredDiscipline,
                reviewStatus: item.type === 'preprint' ? 'preReview' : 'peerReviewed',
                citations: item.cited_by_count || 0,
                isOpenAccess: !!oaInfo.is_oa,
                oaUrl: oaUrl,
                pdfUrl: primaryLocation.pdf_url || (oaInfo.is_oa ? oaUrl : null),
                tags: tags.length > 0 ? tags : [inferredDiscipline],
                isCached: false // Frontend/backend cross-checks this against Supabase
            };
        });

        // Exact / High Title Match Prioritization
        if (cleanQ.length > 5) {
            normalized.sort((a, b) => {
                const cleanA = (a.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanB = (b.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

                const exactA = cleanA === cleanQ;
                const exactB = cleanB === cleanQ;
                if (exactA && !exactB) return -1;
                if (!exactA && exactB) return 1;

                const startsA = cleanA.startsWith(cleanQ);
                const startsB = cleanB.startsWith(cleanQ);
                if (startsA && !startsB) return -1;
                if (!startsA && startsB) return 1;

                const includesA = cleanA.includes(cleanQ);
                const includesB = cleanB.includes(cleanQ);
                if (includesA && !includesB) return -1;
                if (!includesA && includesB) return 1;

                return 0;
            });
        }

        return {
            results: normalized,
            total: totalCount,
            page,
            perPage
        };
    } catch (err) {
        console.error('[OpenAlex Global Search Error]:', err.message);
        return { results: [], total: 0, page, perPage, error: err.message };
    }
}

module.exports = {
    searchGlobalPapers,
    DOMAIN_CONCEPTS
};
