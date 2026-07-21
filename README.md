# Juris CoPilot — Philippine legal research , grounded in sources

This repository contains a web app that uses GPT-5.6 and Gemini toolset to implement a **Legal research Agent**. It allows users to ask questions about Philippine jurisprudence and Republic Acts.



## What the Agent Does

allows users to ask questions about Philippine jurisprudence and Republic Acts.


## Configuration

## Get Started
   In your terminal , navigate to the app folder. Run `npm start`

## Troubleshooting

- **Tool connection errors** — confirm the  server is running at port `3000`.

## Use of Codex and GPT-5.6
This project was built iteratively with an AI coding agent (Codex), moving through:


Initial MVP chat UI + direct API integration
Fix for a Failed to fetch error caused by the agent blocking browser-origin requests → added a same-origin proxy
Netlify deployment support via serverless functions

- **Step by step**
Initial build — The user gave a long, detailed spec: a chat UI with a fixed header, scrollable message area, fixed input bar, Markdown rendering, auto-scroll, a "Reset session" button, and precise integration instructions for calling a remote MCP-based legal agent (exact endpoints and JSON payload shape). Codex produced a static frontend (index.html, styles.css, app.js) implementing this.

Debugging a CORS/fetch error — When the live app failed with "Failed to fetch," the user reported the error back in plain language. Codex diagnosed it as the remote agent blocking direct browser requests (403, origin not allowed) and fixed it by adding a Node.js backend proxy (server.js, updated package.json, a Dockerfile) so the browser talks to your own server, which then talks to the agent.

Deployment guidance — The user asked about deploying to Netlify specifically. Since Netlify doesn't run a persistent Node server, Codex adapted the proxy into a Netlify serverless Function, and gave concrete deployment steps (file to add, netlify.toml, env var setup, GitHub-based deploy flow).

GPT-5.6 - used to generate titles in remote agent

## Disclaimer

i am an AI assistant and cannot provide legal advice. If you are involved in a property dispute or are planning an extrajudicial, it is highly recommended that you consult with a qualified attorney in your jurisdiction
