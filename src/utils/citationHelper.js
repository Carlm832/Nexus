/* =========================================================================
 * Citation Formatting Helper (citationHelper.js)
 * 
 * Generates standards-compliant academic citations in APA, MLA, Chicago,
 * and BibTeX formats for any scholarly paper.
 * ========================================================================= */

/**
 * Format authors in standard list format
 */
export function formatAuthors(authors = []) {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
}

/**
 * Extract 4-digit publication year
 */
export function extractYear(dateStr) {
    if (!dateStr) return '2024';
    const match = String(dateStr).match(/\b(19\d{2}|20\d{2})\b/);
    return match ? match[1] : '2024';
}

/**
 * Clean DOI string
 */
export function cleanDoi(doiStr, fallbackId = '') {
    const raw = doiStr || fallbackId || '';
    return raw.replace(/^https?:\/\/doi\.org\//i, '').trim();
}

/**
 * Generate APA 7th Edition citation
 */
export function formatAPA(paper) {
    const authors = formatAuthors(paper.authors);
    const year = extractYear(paper.publishDate);
    const title = paper.title || 'Untitled';
    const journal = paper.journal || 'Academic Publication';
    const doi = cleanDoi(paper.doi, paper.id);

    return `${authors} (${year}). ${title}. ${journal}.${doi ? ` https://doi.org/${doi}` : ''}`;
}

/**
 * Generate MLA 9th Edition citation
 */
export function formatMLA(paper) {
    const authors = (paper.authors && paper.authors[0]) || 'Unknown Author';
    const title = paper.title ? `"${paper.title}."` : '"Untitled."';
    const journal = paper.journal ? `${paper.journal},` : '';
    const year = extractYear(paper.publishDate);
    const doi = cleanDoi(paper.doi, paper.id);

    return `${authors}. ${title} ${journal} ${year}.${doi ? ` https://doi.org/${doi}` : ''}`;
}

/**
 * Generate Chicago 17th Edition citation
 */
export function formatChicago(paper) {
    const authors = formatAuthors(paper.authors);
    const title = paper.title ? `"${paper.title}."` : '"Untitled."';
    const journal = paper.journal || 'Academic Publication';
    const year = extractYear(paper.publishDate);
    const doi = cleanDoi(paper.doi, paper.id);

    return `${authors}. ${year}. ${title} ${journal}.${doi ? ` https://doi.org/${doi}.` : ''}`;
}

/**
 * Generate BibTeX citation entry
 */
export function formatBibTeX(paper) {
    const year = extractYear(paper.publishDate);
    const firstAuthor = (paper.authors?.[0] || 'Author').split(' ').slice(-1)[0].toLowerCase();
    const cleanId = `${firstAuthor}${year}_${(paper.id || 'paper').replace(/[^a-zA-Z0-9]/g, '')}`;
    const authors = (paper.authors || ['Unknown Author']).join(' and ');
    const title = paper.title || 'Untitled';
    const journal = paper.journal || 'Academic Publication';
    const doi = cleanDoi(paper.doi, paper.id);

    return `@article{${cleanId},
  title = {${title}},
  author = {${authors}},
  journal = {${journal}},
  year = {${year}}${doi ? `,\n  doi = {${doi}}` : ''}
}`;
}
