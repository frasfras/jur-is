# Legal expert CoPilot — Philippine legal research , grounded in sources

This repository contains a web app that uses GPT-5.6 and Gemini to implement a AI-powered  **Legal research Agent**. It allows users to ask questions about Philippine jurisprudence and Republic Acts, backed by a remote legal-research agent as its primary source.



## What the Agent Does

allows users to ask questions about Philippine jurisprudence and Republic Acts.

Primary users: law students, lawyers, paralegals, legal researchers, and anyone who needs to understand Philippine legal authorities

## Configuration

## Architecture

The frontend (index.html, styles.css, app.js) talks to a legal-research agent through a server-side proxy rather than calling it directly, because the agent's API rejects direct browser requests (CORS / origin not allowed).

Two deployment paths are supported:


Node server (server.js, package.json, Dockerfile) — run with npm start, or deploy via the included Dockerfile. The browser calls /api/session and /api/run, which server.js forwards to the agent. </br>
Netlify Functions — a serverless equivalent (netlify/functions/legal-agent.mjs) that proxies the same /api/* routes for static hosting on Netlify, since Netlify doesn't run a persistent Node server.

## Get Started
  Clone this repository In your terminal , navigate to the app folder. Run `npm start`

## Troubleshooting

- **Tool connection errors** — confirm the  server is running at port `3000`.

## Use of Codex and GPT-5.6
This project was built iteratively with an AI coding agent (Codex), moving through:


Initial MVP chat UI + direct API integration.
Fix for a Failed to fetch error caused by the agent blocking browser-origin requests → added a same-origin proxy
Netlify deployment support via serverless functions

- **Step by step** :

Initial build — The user gave a long, detailed spec: a chat UI with a fixed header, scrollable message area, fixed input bar, Markdown rendering, auto-scroll, a "Reset session" button, and precise integration instructions for calling a remote MCP-based legal agent (exact endpoints and JSON payload shape). Codex produced a frontend (index.html, styles.css, app.js,server.js) implementing this.

Debugging a CORS/fetch error — When the live app failed with "Failed to fetch," the user reported the error back in plain language. Codex diagnosed it as the remote agent blocking direct browser requests (403, origin not allowed) and fixed it by adding a Node.js backend proxy (server.js, updated package.json, a Dockerfile) so the browser talks to your own server, which then talks to the agent.

Deployment guidance — The user asked about deploying to Netlify specifically. Since Netlify doesn't run a persistent Node server, Codex adapted the proxy into a Netlify serverless Function, and gave concrete deployment steps (file to add, netlify.toml, env var setup, GitHub-based deploy flow).

GPT-5.6 - used as legal research assistant. Uses the tools available from the legal MCP server to answer the user's legal question as accurately as possible in remote agent

## Disclaimer

i am an AI assistant and cannot provide legal advice. If you are involved in a property dispute or are planning an extrajudicial, it is highly recommended that you consult with a qualified attorney in your jurisdiction
