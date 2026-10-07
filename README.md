# Web2App Studio

An interactive website and Codex Skill for turning an HTTP or HTTPS website into a lightweight Tauri 2 desktop application project.

## Run the website

```bash
npm install
npm run dev
```

Open <http://localhost:4173>. The configuration assistant works locally without credentials. To use the OpenAI-powered structured configuration endpoint, copy `.env.example` to `.env` and set `OPENAI_API_KEY`.

## Verify

```bash
npm run lint
npm run build
npm run test:visual
```

The visual test expects Google Chrome at its standard Windows installation path and a development server running on port 4173.

## Skill

The reusable Skill is at `skills/web-to-app`. It includes a deterministic Tauri project generator:

```bash
node skills/web-to-app/scripts/scaffold.mjs --url https://example.com --name "Example" --platforms macos,windows --out ./output
```

Generated projects must be compiled on the target operating system, or with one native runner per platform in CI.
