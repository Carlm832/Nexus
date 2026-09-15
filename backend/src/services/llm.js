/* =========================================================================
 * LLM Service (Gemini Integration)
 * 
 * Responsible for authenticating with the Google Gemini API to parse 
 * dense scientific abstracts into accessible, structured insights.
 * Uses `gemini-2.5-flash` model and a strict JSON schema directive.
 * ========================================================================= */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { GoogleGenAI } = require('@google/genai');
const { normalizeDiscipline } = require('./crossref');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const PRIMARY_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-1.5-flash')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean)
    .filter(model => model !== PRIMARY_MODEL);

if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY not found in environment. LLM summarization will fail.");
}

// Initialize the Google SDK client (or gracefully null if key is missing)
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null;

/* -------------------------------------------------------------------------
 * Strict JSON Schema Directive
 * We pass this string directly into the prompt to force the LLM to output
 * only valid JSON that perfectly matches our React frontend's data model.
 * ------------------------------------------------------------------------- */
const insightSchema = `
{
  "summary": "Plain language summary, preserving scientific accuracy (~3-4 sentences).",
  "significance": "Explanation of the real-world impact or significance (~2 sentences).",
  "limitations": "Transparent notes on methodological limitations (~1-2 sentences).",
  "evidenceLevel": "High | Moderate | Preliminary",
  "studyType": "e.g., Randomized Controlled Trial, Meta-Analysis, Observational, Computational",
  "discipline": "MUST BE STRICTLY ONE OF: 'Neuroscience', 'Economics', 'Biology', 'Artificial Intelligence', 'Climate Science', 'Psychology'. If none apply, choose the closest supported discipline.",
  "tags": ["Array", "of", "3-5", "relevant", "keywords"]
}
`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractRetryDelayMs(message = '') {
    const secondsMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    if (secondsMatch) {
        return Math.ceil(Number(secondsMatch[1]) * 1000);
    }

    const retryInfoMatch = message.match(/"retryDelay":"(\d+)s"/i);
    if (retryInfoMatch) {
        return Number(retryInfoMatch[1]) * 1000;
    }

    return 0;
}

function isRetryableError(message = '') {
    return message.includes('"status":"UNAVAILABLE"') || message.includes('"status":"RESOURCE_EXHAUSTED"');
}

function isQuotaError(message = '') {
    return message.includes('"status":"RESOURCE_EXHAUSTED"');
}

/**
 * generateInsights
 * Core pipeline that takes raw Crossref metadata, constructs a prompt,
 * and calls the Gemini API to generate the synthesis.
 * 
 * @param {Object} paperData - Normalized paper data from Crossref
 * @returns {Object} A fully merged Nexus paper object, or null on failure
 */
async function generateInsights(paperData) {
    const rawAbstract = (paperData.abstract || '').trim();
    const effectiveAbstract = rawAbstract && !rawAbstract.includes('Abstract not directly indexed')
        ? rawAbstract
        : `Landmark research paper titled "${paperData.title}" published in ${paperData.journal || 'peer-reviewed literature'} by ${(paperData.authors || []).join(', ')} (${paperData.publishDate || ''}). DOI: ${paperData.doiUrl || ''}.`;

    // 2. Local Fallback/Mock Mode (if user doesn't have an API key configured)
    if (!ai) {
        console.log(`Skipping LLM generation for ${paperData.rawId}: No API key provided.`);
        return {
            id: paperData.rawId,
            title: paperData.title,
            authors: paperData.authors,
            journal: paperData.journal,
            publishDate: paperData.publishDate,
            doi: paperData.doiUrl,
            abstract: effectiveAbstract,
            discipline: normalizeDiscipline('', paperData.title, effectiveAbstract),
            summary: "Mock summary due to missing API key.",
            significance: "Mock significance.",
            limitations: "Mock limitations.",
            metrics: {
                evidenceLevel: 'Preliminary',
                citations: 0,
                studyType: 'Unknown'
            },
            tags: ["Mock", "Data"]
        };
    }

    // 3. Construct the precise Instructions for the LLM
    const prompt = `
You are an expert scientific communicator for the 'Nexus' platform. Your task is to transform the following peer-reviewed research metadata and abstract into accessible, nuanced insights for intellectually curious users. 

Prioritize credibility, transparency, and critical thinking. DO NOT sensationalize the findings. If the abstract is brief or synthesized from publication metadata, utilize your deep scientific corpus knowledge of this landmark study to describe the core methodology, findings, real-world impact, and significance accurately.

Raw Research Data:
Title: ${paperData.title}
Authors: ${(paperData.authors || []).join(', ')}
Journal: ${paperData.journal || 'Academic Publication'}
Publication Date: ${paperData.publishDate || 'Published work'}
Abstract / Context: ${effectiveAbstract}

Based on this research work, extract the methodology and findings, then generate a JSON response strictly adhering to this schema:
${insightSchema}

Ensure all JSON keys and structures match exactly. Output ONLY valid JSON, without markdown formatting blocks.
  `.trim();

    const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];

    for (const model of candidateModels) {
        for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            // 4. Force Gemini output to JSON mode
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            // Parse the LLM's raw text back into a JS object
            const responseText = response.text;
            const structuredData = JSON.parse(responseText);

            // 5. Keep discipline values aligned with the frontend filter vocabulary.
            const finalDiscipline = normalizeDiscipline(
                structuredData.discipline,
                paperData.title,
                paperData.abstract
            );

            // 6. Assemble the Final Payload
            // Merge generated insights with original base metadata
            return {
                id: paperData.rawId,
                title: paperData.title,
                authors: paperData.authors,
                journal: paperData.journal,
                publishDate: paperData.publishDate,
                doi: paperData.doiUrl,
                abstract: paperData.abstract,
                discipline: finalDiscipline,
                summary: structuredData.summary,
                significance: structuredData.significance,
                limitations: structuredData.limitations,
                metrics: {
                    evidenceLevel: structuredData.evidenceLevel || 'Preliminary',
                    citations: paperData.citations || 0,
                    studyType: structuredData.studyType || 'Unknown'
                },
                tags: structuredData.tags || []
            };
        } catch (error) {
            const message = error.message || String(error);

            if (attempt < 3 && isRetryableError(message)) {
                const retryDelayMs = Math.min(extractRetryDelayMs(message) || 5000, 40000);
                console.warn(`Retrying Gemini request for ${paperData.rawId} with ${model} in ${Math.ceil(retryDelayMs / 1000)}s...`);
                await sleep(retryDelayMs);
                continue;
            }

            if (isQuotaError(message) && model !== candidateModels[candidateModels.length - 1]) {
                console.warn(`Gemini model ${model} exhausted quota for ${paperData.rawId}; trying next model.`);
                break;
            }

            console.error(`Error generating insights for paper ${paperData.rawId}:`, message);
            return generateFallbackInsights(paperData);
        }
        }
    }

    return generateFallbackInsights(paperData);
}

/**
 * generateFallbackInsights
 * Resilient extractive summarizer that parses real abstracts into Nexus insights
 * when external LLM API quota is unavailable or unconfigured.
 */
function generateFallbackInsights(paperData) {
    const rawAbstract = paperData.abstract || '';
    const sentences = rawAbstract.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);

    let summary = '';
    let significance = '';
    let limitations = '';

    if (sentences.length >= 3) {
        summary = sentences.slice(0, 2).join(' ');
        significance = sentences[sentences.length - 1] || 'Provides foundational empirical evidence advancing current disciplinary paradigms.';
        limitations = sentences.length > 3 ? sentences[2] : 'Subject to sampling constraints and boundary conditions noted in original publication.';
    } else if (sentences.length > 0) {
        summary = sentences.join(' ');
        significance = 'Demonstrates key methodological and empirical contributions to the field.';
        limitations = 'Further multi-cohort validation recommended to generalize findings.';
    } else {
        summary = `Explores key scientific mechanisms in ${paperData.discipline || 'research'}, providing structured observations and analytical frameworks.`;
        significance = 'Contributes critical baseline observations for ongoing cross-disciplinary investigations.';
        limitations = 'Preliminary analytical scope; further experimental replication required.';
    }

    // Determine evidence level from abstract keywords
    const lower = rawAbstract.toLowerCase();
    let evidenceLevel = 'Moderate';
    let studyType = 'Observational / Analytical';

    if (lower.includes('meta-analysis') || lower.includes('systematic review') || lower.includes('double-blind')) {
        evidenceLevel = 'High';
        studyType = lower.includes('meta-analysis') ? 'Meta-Analysis' : 'Randomized Controlled Trial';
    } else if (lower.includes('in vitro') || lower.includes('computational model') || lower.includes('preliminary') || lower.includes('pilot')) {
        evidenceLevel = 'Preliminary';
        studyType = lower.includes('computational') ? 'Computational Modeling' : 'Experimental / In Vitro';
    }

    // Extract tags
    const commonStopwords = new Set(['these', 'their', 'which', 'about', 'using', 'study', 'results', 'between', 'during', 'further', 'through', 'present']);
    const words = rawAbstract.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    const wordFreq = {};
    for (const w of words) {
        if (w.length > 4 && !commonStopwords.has(w)) {
            wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
    }
    const extractedTags = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

    const finalDiscipline = normalizeDiscipline(
        paperData.discipline,
        paperData.title,
        paperData.abstract
    );

    return {
        id: paperData.rawId || paperData.id || `study-${Date.now()}`,
        title: paperData.title,
        authors: paperData.authors || ['Unknown Author'],
        journal: paperData.journal || 'Academic Proceedings',
        publishDate: paperData.publishDate || new Date().toISOString().split('T')[0],
        doi: paperData.doiUrl || (paperData.rawId ? `https://doi.org/${paperData.rawId}` : 'https://doi.org'),
        abstract: paperData.abstract,
        discipline: finalDiscipline,
        reviewStatus: paperData.reviewStatus || 'peerReviewed',
        summary,
        significance,
        limitations,
        metrics: {
            evidenceLevel,
            citations: paperData.citations || 0,
            studyType
        },
        tags: extractedTags.length > 0 ? extractedTags : [finalDiscipline, 'Empirical Study', 'Peer Reviewed']
    };
}

/**
 * chatWithPaper
 * Answers user questions grounded strictly in the provided research paper context.
 * 
 * @param {Object} params
 * @param {Object} params.paper - Full paper object (title, abstract, summary, significance, limitations, etc.)
 * @param {string} params.question - User's question
 * @param {Array} [params.history] - Array of { role: 'user' | 'assistant', content: string }
 * @returns {Promise<Object>} { answer: string }
 */
async function chatWithPaper({ paper, question, history = [] }) {
    if (!paper || !question) {
        throw new Error('Paper and question are required');
    }

    if (!ai) {
        return { answer: generateOfflineChatResponse(paper, question) };
    }

    const systemInstruction = `
You are an expert, articulate academic science communicator on the 'Nexus' platform.
Your objective is to answer questions strictly grounded in the following research paper.

RESEARCH PAPER CONTEXT:
- Title: ${paper.title}
- Authors: ${(paper.authors || []).join(', ')}
- Journal: ${paper.journal || 'Academic Journal'} (${paper.publishDate || ''})
- Discipline: ${paper.discipline || 'Science'}
- Evidence Level: ${paper.metrics?.evidenceLevel || 'Unknown'} | Study Type: ${paper.metrics?.studyType || 'Journal Article'} | Citations: ${paper.metrics?.citations || 0}
- Key Topics/Tags: ${(paper.tags || []).join(', ')}
- Plain Summary: ${paper.summary || 'N/A'}
- Real-World Significance: ${paper.significance || 'N/A'}
- Limitations: ${paper.limitations || 'N/A'}
- Full Abstract: ${paper.abstract || 'N/A'}

GUIDELINES:
1. Grounding: Answer accurately based on the context above. If a specific detail (e.g. exact chemical reagent dosage or non-abstract detail) is not present in the provided context, state clearly that it is beyond the abstract/summary scope and recommend checking the primary DOI.
2. Tone & Clarity: Be direct, objective, insightful, and accessible without compromising scientific rigor.
3. Formatting: Use clean markdown (bullet points, bold key terms) when explaining complex mechanisms or breaking down answers.
`.trim();

    const conversationPrompt = history.slice(-6).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Nexus AI'}: ${msg.content}`
    ).join('\n\n');

    const fullPrompt = `${systemInstruction}\n\n${conversationPrompt ? `CONVERSATION HISTORY:\n${conversationPrompt}\n\n` : ''}User Question: ${question}\n\nNexus AI Answer:`;

    const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];

    for (const model of candidateModels) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: fullPrompt
            });

            if (response.text) {
                return {
                    answer: response.text.trim()
                };
            }
        } catch (error) {
            console.warn(`Chat model ${model} failed:`, error.message);
        }
    }

    return { answer: generateOfflineChatResponse(paper, question) };
}

function generateOfflineChatResponse(paper, question) {
    const q = (question || '').toLowerCase();

    if (q.includes('limit') || q.includes('weakness') || q.includes('flaw') || q.includes('method')) {
        return `**Methodology & Limitations for "${paper.title}":**\n\n${paper.limitations || 'The authors noted sampling and contextual constraints standard to this study design.'}\n\n*Evidence rating:* **${paper.metrics?.evidenceLevel || 'Moderate'}** (${paper.metrics?.studyType || 'Empirical Study'}).`;
    }

    if (q.includes('impact') || q.includes('matter') || q.includes('significan') || q.includes('real world') || q.includes('apply') || q.includes('practical')) {
        return `**Real-World Significance:**\n\n${paper.significance || 'This research contributes key empirical data to current scientific understanding.'}\n\n*Journal & Scope:* Published in **${paper.journal}**, addressing key questions in **${paper.discipline}**.`;
    }

    if (q.includes('summary') || q.includes('explain') || q.includes('eli5') || q.includes('5 year') || q.includes('10 year') || q.includes('simple')) {
        return `**Plain-Language Summary:**\n\n${paper.summary}\n\n*Key takeaways:* This ${paper.metrics?.studyType || 'study'} examines **${(paper.tags || []).slice(0, 3).join(', ')}** to understand underlying mechanisms in ${paper.discipline}.`;
    }

    if (q.includes('author') || q.includes('who wrote') || q.includes('journal') || q.includes('when') || q.includes('date')) {
        return `**Publication Details:**\n\n- **Authors:** ${(paper.authors || []).join(', ')}\n- **Journal:** ${paper.journal}\n- **Published Date:** ${paper.publishDate}\n- **Citations:** ${paper.metrics?.citations || 0}`;
    }

    return `**Insights on "${paper.title}":**\n\n${paper.summary}\n\n**Significance:** ${paper.significance}\n\n*(Note: Running in offline research mode. For extended reasoning, connect a Gemini API key.)*`;
}

module.exports = {
    generateInsights,
    generateFallbackInsights,
    chatWithPaper,
    generateOfflineChatResponse
};


