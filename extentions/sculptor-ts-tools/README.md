# Sculptor Toolkit

Sculptor Toolkit is a VS Code extension for SculptorTS projects.

It activates automatically when a workspace contains `sculptor.json` and provides:

- custom file icons
- JSON schema validation for `sculptor.json` and `props.json`
- schema-driven IntelliSense and hover text
- a documentation sidebar
- command palette actions for Sculptor docs
- a context-aware `Explain Current File` command

## Local Docs

The extension ships with local markdown docs in `docs/` and renders them in a webview.

## Support URLs

The support entries in the sidebar are wired to the current repository URL. Update the Discord link in `src/services/supportLinks.ts` before publishing if you want a custom invite.

## Build

```bash
npm install
npm run build
```

## Package

```bash
npm run prepack
```
