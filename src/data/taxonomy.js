/* =========================================================================
 * Academic Taxonomy & Dynamic Categorization (taxonomy.js)
 *
 * Defines the hierarchical structure of scholarly domains, disciplines,
 * and key research concepts for Nexus.
 * ========================================================================= */

export const ACADEMIC_DOMAINS = [
    {
        id: 'all',
        label: 'All Fields',
        description: 'Cross-disciplinary scholarly research'
    },
    {
        id: 'ai-cs',
        label: 'Artificial Intelligence',
        openAlexName: 'Artificial Intelligence',
        subdisciplines: [
            'Machine Learning',
            'Large Language Models',
            'Computer Vision',
            'Robotics & Control',
            'Neural Networks',
            'Natural Language Processing'
        ]
    },
    {
        id: 'neuroscience',
        label: 'Neuroscience',
        openAlexName: 'Neuroscience',
        subdisciplines: [
            'Cognitive Neuroscience',
            'Neuroplasticity',
            'Brain-Computer Interfaces',
            'Synaptic Transmission',
            'Neurodegenerative Disease',
            'fMRI & Neuroimaging'
        ]
    },
    {
        id: 'medicine',
        label: 'Health & Medicine',
        openAlexName: 'Medicine',
        subdisciplines: [
            'Oncology & Cancer Research',
            'Cardiovascular Medicine',
            'Immunology & Vaccines',
            'Pharmacology & Drug Discovery',
            'Public Health & Epidemiology',
            'Gene Therapy'
        ]
    },
    {
        id: 'biology',
        label: 'Biological Sciences',
        openAlexName: 'Biology',
        subdisciplines: [
            'Genomics & CRISPR',
            'Cellular Biology',
            'Microbiome Research',
            'Biochemistry',
            'Ecology & Conservation',
            'Evolutionary Biology'
        ]
    },
    {
        id: 'climate',
        label: 'Climate & Earth',
        openAlexName: 'Environmental Science',
        subdisciplines: [
            'Climate Change & Modeling',
            'Carbon Sequestration',
            'Renewable Energy Systems',
            'Oceanography & Marine Science',
            'Atmospheric Science',
            'Ecosystem Resilience'
        ]
    },
    {
        id: 'economics',
        label: 'Economics & Finance',
        openAlexName: 'Economics',
        subdisciplines: [
            'Behavioral Economics',
            'Macroeconomics & Monetary Policy',
            'Financial Markets & Risk',
            'Development Economics',
            'Econometrics & Game Theory',
            'Labor Economics'
        ]
    },
    {
        id: 'psychology',
        label: 'Psychology',
        openAlexName: 'Psychology',
        subdisciplines: [
            'Cognitive Psychology',
            'Mental Health & Psychiatry',
            'Social & Behavioral Dynamics',
            'Decision Making & Heuristics',
            'Developmental Psychology'
        ]
    },
    {
        id: 'physics',
        label: 'Physics & Quantum',
        openAlexName: 'Physics',
        subdisciplines: [
            'Quantum Computing & Information',
            'Condensed Matter Physics',
            'Astrophysics & Cosmology',
            'High Energy Particle Physics',
            'Materials Science & Nanotechnology',
            'Optics & Photonics'
        ]
    }
];

export const disciplines = ACADEMIC_DOMAINS
    .filter(d => d.id !== 'all')
    .map(d => d.label);

export const YEAR_FILTER_OPTIONS = [
    { label: 'All Years', fromYear: null, toYear: null },
    { label: 'Recent (2023–2026)', fromYear: 2023, toYear: null },
    { label: 'Past 5 Years (2020–2026)', fromYear: 2020, toYear: null },
    { label: 'Past 10 Years (2015–2026)', fromYear: 2015, toYear: null },
    { label: 'Historical (Pre-2015)', fromYear: null, toYear: 2014 }
];

export const SORT_OPTIONS = [
    { id: 'cited_by_count:desc', label: 'Highest Impact (Citations)' },
    { id: 'publication_date:desc', label: 'Most Recent' },
    { id: 'relevance_score:desc', label: 'Most Relevant' }
];
