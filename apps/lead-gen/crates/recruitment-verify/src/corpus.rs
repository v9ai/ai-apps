/// UK recruitment reference corpus for kNN classification.
///
/// Each entry is `(text, is_recruitment)`. The embedding model maps these into
/// 384-dim space; at query time the top-7 nearest neighbours vote on whether a
/// company's website text looks like a UK recruitment agency.

pub struct CorpusEntry {
    pub text: &'static str,
    pub is_recruitment: bool,
}

pub fn corpus() -> Vec<CorpusEntry> {
    vec![
        // ── UK Recruitment (label = true) ────────────────────────────────
        CorpusEntry {
            text: "REC-accredited recruitment agency placing candidates across the UK in technology, finance, and engineering roles",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "AWR-compliant staffing solutions for temporary and contract workers throughout England, Scotland, and Wales",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Specialist IT recruitment consultancy based in London and Manchester helping companies hire software developers",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Executive search and headhunting firm placing C-suite and board-level candidates for FTSE 250 companies",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "We place permanent and contract software engineers across the UK with a focus on fintech and healthtech",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "IR35 compliant contractor staffing and umbrella company solutions for the UK contracting market",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "NHS and healthcare recruitment agency providing locum doctors, nurses, and permanent clinical staff UK-wide",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Construction and engineering recruitment specialists operating across the UK, placing site managers and quantity surveyors",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Our recruitment consultants match top talent with leading UK employers across multiple sectors",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Graduate recruitment and early careers programme specialists helping UK employers attract new talent",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Managed service provider for contingent workforce and recruitment process outsourcing across the UK",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Temporary staffing agency providing warehouse, logistics, and industrial workers throughout the Midlands",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "Specialist technology recruiter covering fintech, AI, data science, and cybersecurity roles in London and the South East",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "UK's leading recruitment agency for accountancy, finance, and banking professionals",
            is_recruitment: true,
        },
        CorpusEntry {
            text: "We are an employment agency matching job seekers with employers, offering CV advice, interview coaching, and career guidance",
            is_recruitment: true,
        },

        // ── Non-recruitment (label = false) ──────────────────────────────
        CorpusEntry {
            text: "We build enterprise software products for supply chain management and logistics optimisation",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "SaaS platform for customer relationship management and sales automation used by thousands of businesses",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Cloud infrastructure and DevOps consulting services helping companies migrate to AWS and Azure",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "AI research lab focused on natural language processing, computer vision, and reinforcement learning",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Digital marketing agency specializing in SEO, PPC, content strategy, and social media management",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Cybersecurity consultancy providing penetration testing, security audits, and compliance assessments",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Managed IT services and helpdesk support for small and medium enterprises across the UK",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Data analytics platform for business intelligence, reporting, and real-time dashboard visualisation",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "We design and develop mobile applications for iOS and Android platforms for startups and enterprises",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "E-commerce marketplace connecting buyers and sellers worldwide with integrated payment processing",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "FinTech company building payment processing infrastructure and open banking APIs",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "EdTech platform providing online learning, certification, and virtual classroom solutions",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Property management software for UK letting agents, landlords, and estate agencies",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Legal tech startup automating contract review, due diligence, and regulatory compliance",
            is_recruitment: false,
        },
        CorpusEntry {
            text: "Healthcare SaaS for patient records, clinic management, and GP appointment scheduling",
            is_recruitment: false,
        },
    ]
}
