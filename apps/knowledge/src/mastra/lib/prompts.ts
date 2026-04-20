export const RESEARCH_PROMPT = (v: {
  topic: string;
  slug: string;
  related_topics: string;
}) => `You are a technical researcher preparing material for an AI engineering knowledge base article.

Topic: ${v.topic}
Slug: ${v.slug}

Research this topic thoroughly. Provide:
1. Core concepts and definitions
2. How it works technically (internals, data flow, architecture)
3. Key patterns and best practices used in production
4. Common pitfalls and how to avoid them
5. How this topic relates to: ${v.related_topics}
6. Recent developments and current state of the art

Be specific and technical. Include concrete details that would be useful for an AI engineer.
Output your research as structured notes.
`;

export const OUTLINE_PROMPT = (v: {
  topic: string;
  slug: string;
  category: string;
  research: string;
  existing_articles: string;
}) => `You are an expert technical writer creating an outline for an AI engineering knowledge base article.

Topic: ${v.topic}
Slug: ${v.slug}
Category: ${v.category}

Research notes:
${v.research}

Existing articles in this knowledge base for cross-referencing:
${v.existing_articles}

Create a detailed outline for this article. Follow this structure pattern:
1. Start with a \`# Title\` (concise, descriptive)
2. An opening paragraph (no heading) that explains what this is, why it matters, and sets context
3. \`## Core Concepts\` or similar foundational section
4. \`## How It Works\` / technical deep-dive sections with code examples
5. \`## Patterns\` / practical production patterns
6. \`## Common Pitfalls\` / what goes wrong
7. \`## Comparison\` with alternatives (if applicable)
8. Cross-references to related articles using markdown links like [Article Title](/slug)

For each section, note:
- Key points to cover
- Code examples needed (specify language: Python preferred, TypeScript where relevant)
- Diagrams or tables to include

Output the outline as markdown with section headers and bullet points under each.
`;

export const DRAFT_PROMPT = (v: {
  topic: string;
  slug: string;
  outline: string;
  research: string;
  style_sample: string;
}) => `You are an expert AI engineer and technical writer. Write a comprehensive knowledge base article.

Topic: ${v.topic}
Slug: ${v.slug}

Outline:
${v.outline}

Research notes:
${v.research}

Style reference (match this tone, depth, and format):
---
${v.style_sample}
---

Requirements:
- Start with \`# Title\` — a clear, descriptive title
- Opening paragraph: explain what this is, why it matters, cross-reference related articles
- Use \`##\` for major sections, \`###\` for subsections
- Include at least 3 real, working code examples (Python preferred, TypeScript where relevant)
- Use \`\`\`python or \`\`\`typescript code fences with proper syntax
- Include tables for comparisons using markdown pipe syntax
- Cross-reference at least 2 related articles as [Title](/slug) links
- Write for an intermediate-to-senior AI engineer audience
- Be specific and technical — no hand-waving or filler
- Target 2000-4000 words
- No frontmatter, no YAML headers — just pure markdown starting with \`# Title\`

Write the complete article now.
`;

export const REVIEW_PROMPT = (v: {
  topic: string;
  draft: string;
}) => `You are a senior technical editor reviewing an AI engineering knowledge base article.

Topic: ${v.topic}
Draft:
${v.draft}

Review this article and produce an improved final version. Check for:
1. Technical accuracy — are claims correct? Are code examples valid?
2. Completeness — are important aspects of the topic missing?
3. Code quality — do examples use best practices? Are they runnable?
4. Structure — does the flow make sense? Are sections well-organized?
5. Cross-references — are links to related articles using correct /slug format?
6. Conciseness — remove filler, tighten prose, keep it dense with information
7. Tables and comparisons — are they clear and accurate?

Output the final, improved version of the full article (complete markdown, starting with \`# Title\`).
Do NOT output review notes — output the final article directly.
`;

export const REVISE_PROMPT = (v: {
  topic: string;
  draft: string;
  issues: string;
}) => `You are an expert AI engineer and technical writer. An article you wrote failed quality checks.

Topic: ${v.topic}

Current article:
${v.draft}

Issues to fix:
${v.issues}

Revise the article to address ALL listed issues. Maintain the existing structure and content but expand, add code examples, add cross-references, or restructure as needed.

Output the complete revised article (full markdown, starting with \`# Title\`).
`;
