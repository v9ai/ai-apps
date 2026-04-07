# vadim.blog

Personal blog by Vadim Nicolai — https://vadim.blog

## Stack

- **Framework**: Docusaurus 3.9 (blog-only mode, served at `/`)
- **Language**: TypeScript, MDX
- **Styling**: Custom CSS (`src/css/custom.css`) — uses PandaCSS patterns, never Tailwind
- **Markdown plugins**: remark-math + rehype-katex (LaTeX), Mermaid diagrams
- **Hosting**: Vercel (`docusaurus-2` framework preset)
- **Analytics**: @vercel/analytics

## Commands

```bash
pnpm start          # Dev server on port 3009
pnpm build          # Production build
pnpm typecheck      # TypeScript check
pnpm clear          # Clear Docusaurus cache
```

## Project structure

```
blog/               # Blog posts organized by year (2024/, 2025/, 2026/)
  authors.yml       # Author definitions
  tags.yml          # Tag definitions
src/
  components/       # React components (AudioPlayer, Flow, HomepageFeatures)
  css/              # Custom styles
  pages/            # Static pages
  theme/            # Docusaurus theme overrides
static/             # Static assets (images, favicon)
docusaurus.config.ts  # Main site config
```

## Blog posts

- Posts live in `blog/<year>/<MM-DD-slug>/` directories
- Each post is an `index.mdx` (or `.md`) file with frontmatter
- Dark mode only (`colorMode.disableSwitch: true`)
- Docs plugin is disabled — this is a blog-only site
- Blog sidebar count is 0 (hidden)

## Deploy

Deployed via Vercel. Use `/deploy` or the monorepo deploy script.
