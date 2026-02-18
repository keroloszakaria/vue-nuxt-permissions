# vue-nuxt-permission Documentation

Complete documentation for the vue-nuxt-permission package, built with VitePress.

## Building the Documentation

### Prerequisites

- Node.js 16.0.0 or higher
- npm, pnpm, or yarn

### Installation

Install dependencies:

```bash
npm install
# or
pnpm install
# or
yarn install
```

### Development Server

Start the VitePress development server:

```bash
npm run docs:dev
# or
pnpm docs:dev
# or
yarn docs:dev
```

The documentation will be available at `http://localhost:5173`

### Build for Production

Build the documentation site:

```bash
npm run docs:build
# or
pnpm docs:build
# or
yarn docs:build
```

The built site will be in the `dist` directory.

## Documentation Structure

```
docs/
├── index.md                    # Landing page & introduction
├── getting-started.md          # Installation & setup
├── configuration.md            # Configuration options
├── directive.md                # v-permission directive API
├── composable.md               # usePermission composable API
├── guards.md                   # Route guards & middleware
├── advanced.md                 # Advanced usage patterns
├── faq.md                      # Common questions & answers
├── migration.md                # Migration guide for v1 to v2
└── .vitepress/
    └── config.ts               # VitePress configuration
```

## Adding New Documentation

### Create a New Page

1. Create a new `.md` file in the `docs` directory
2. Add the file to the sidebar in `.vitepress/config.ts`
3. Use markdown with proper heading hierarchy (start with `#`)

### Markdown Features

The documentation supports:

- Standard markdown
- Code highlighting with language specification
- Tables
- Callouts (via HTML)
- Links to other pages
- Inline code and code blocks

### Example Page Structure

```markdown
# Page Title

## Section 1

Content here

### Subsection 1.1

More content

## Section 2

Content here
```

## Documentation Guidelines

### Code Examples

Provide copy-paste friendly examples with proper language specification:

```vue
<template>
  <div>Example</div>
</template>

<script setup lang="ts">
// TypeScript code
</script>
```

### Cross-Links

Link between pages for better navigation:

```markdown
See [Configuration](/configuration) for more details.
```

### Tables

Use markdown tables for comparisons:

```markdown
| Feature | Status |
| ------- | ------ |
| Vue 3   | ✓      |
| Nuxt 3  | ✓      |
```

## Publishing Documentation

### To GitHub Pages

The documentation can be deployed to GitHub Pages:

```bash
npm run docs:build
# Deploy the dist folder to GitHub Pages
```

### To Other Hosts

The built documentation is a static site that can be deployed anywhere:

- Vercel
- Netlify
- AWS S3
- Any static hosting service

## Maintaining Documentation

### Keep Examples Updated

When package features change, update all relevant examples.

### Check Links

Ensure all internal links are valid and point to correct files.

### Update Sidebar

When adding new pages, always update `.vitepress/config.ts` sidebar configuration.

### Proofread

Review documentation for:

- Grammar and spelling
- Technical accuracy
- Code syntax
- Link validity

## Local Development Workflow

1. Create a new branch: `git checkout -b docs/my-feature`
2. Make documentation changes
3. Run `npm run docs:dev` to preview changes
4. Commit and push changes
5. Create a pull request

## Configuration

VitePress configuration is in `.vitepress/config.ts`:

- **title**: Site title and nav label
- **description**: Meta description for SEO
- **logo**: Site logo
- **nav**: Navigation bar items
- **sidebar**: Sidebar navigation structure
- **socialLinks**: External links
- **footer**: Footer configuration
- **search**: Search configuration

## Search

The documentation includes local search powered by VitePress. Search is automatically generated from page content.

## Troubleshooting

### Dev Server Won't Start

```bash
# Clear cache
rm -rf node_modules/.vitepress

# Reinstall dependencies
npm install

# Try again
npm run docs:dev
```

### Build Fails

```bash
# Check Node version
node --version  # Should be 16.0.0+

# Clear cache
rm -rf .vitepress/cache

# Try building again
npm run docs:build
```

## Resources

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
