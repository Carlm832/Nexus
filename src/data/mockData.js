export const mockStudies = [
    {
        id: "doi-10-1038-s41586-024",
        title: "Neuroplasticity in Adult Lexical Learning: A Longitudinal fMRI Study",
        reviewStatus: "peerReviewed",
        authors: ["Elena Rostova", "Marcus Chen", "Sarah Jenkins"],
        journal: "Nature Neuroscience",
        publishDate: "2024-02-15",
        discipline: "Neuroscience",
        metrics: {
            evidenceLevel: "High", // High, Moderate, Preliminary
            citations: 12,
            studyType: "Longitudinal Cohort"
        },
        summary: "This study demonstrates that the adult brain retains significant plasticity for language acquisition, challenging previous 'critical period' assumptions. Functional MRI scans over 12 months showed robust integration of new vocabulary into existing cortical networks, particularly in the left inferior frontal gyrus.",
        significance: "Suggests that adults can learn new languages with structural brain changes similar to children, offering hope for cognitive rehabilitation and lifelong learning strategies.",
        limitations: "Sample size was limited to 45 healthy adults; findings may not generalize to individuals with cognitive impairments. Only visual learning methods were tested.",
        funding: "National Institute of Neurological Disorders and Stroke (NINDS)",
        doi: "https://doi.org/10.1038/s41586-024-xxxx",
        tags: ["Learning", "Brain Mapping", "fMRI"]
    },
    {
        id: "doi-10-1126-science-adk",
        title: "Algorithmic Market Making and Systemic Risk in High-Frequency Trading",
        reviewStatus: "peerReviewed",
        authors: ["David Kim", "Amanda L. Wright"],
        journal: "Science",
        publishDate: "2024-01-22",
        discipline: "Economics",
        metrics: {
            evidenceLevel: "Moderate",
            citations: 34,
            studyType: "Computational Modeling"
        },
        summary: "Analyzing tick-level data across three major equities exchanges, researchers found that algorithmic market makers increase liquidity during stable periods but exacerbate price drops during high volatility by simultaneously withdrawing bids.",
        significance: "Highlights a structural vulnerability in modern financial markets, providing empirical backing for proposing mandatory 'cooling off' periods for automated trading systems.",
        limitations: "Model assumes rational actor behavior up to the point of volatility stress. Excludes cryptocurrency markets where different dynamics may apply.",
        funding: "Independent Research Grant",
        doi: "https://doi.org/10.1126/science.adkxxxx",
        tags: ["Finance", "Algorithms", "Policy"]
    },
    {
        id: "doi-10-1016-j-cell",
        title: "Microbial Signatures of Longevity in Centenarian Gut Microbiomes",
        reviewStatus: "peerReviewed",
        authors: ["Yuki Takahashi", "Luigi Moretti", "et al."],
        journal: "Cell",
        publishDate: "2024-02-05",
        discipline: "Biology",
        metrics: {
            evidenceLevel: "Preliminary",
            citations: 8,
            studyType: "Cross-sectional Observational"
        },
        summary: "By sequencing the gut microbiomes of 150 centenarians and comparing them to average-aged adults, this research identifies a unique consortium of bacteria that produces secondary bile acids, specifically isoalloLCA, which exhibits strong antimicrobial effects against gram-positive pathogens.",
        significance: "Provides a potential biological mechanism for extreme longevity and disease resistance, opening pathways for new probiotic therapies targeting age-related decline.",
        limitations: "Correlation does not equal causation. Dietary histories were self-reported and subject to recall bias. Animal models are needed to prove causality.",
        funding: "Global Health Initiative",
        doi: "https://doi.org/10.1016/j.cell.2024.xx",
        tags: ["Microbiome", "Aging", "Genomics"]
    }
];

export const disciplines = [
    "Neuroscience", "Economics", "Biology", "Artificial Intelligence", "Climate Science", "Psychology"
];
