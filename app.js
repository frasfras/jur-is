const APP_NAME = "app";
const USER_ID = "web-user-01";

const ui = {
  chat: document.querySelector("#chatArea"),
  conversation: document.querySelector("#conversation"),
  form: document.querySelector("#chatForm"),
  input: document.querySelector("#messageInput"),
  send: document.querySelector("#sendButton"),
  reset: document.querySelector("#resetButton"),
  status: document.querySelector("#sessionStatus"),
  welcome: document.querySelector("#welcomeCard"),
};

let sessionId = null;
let isWaiting = false;

function setStatus(message, state = "") {
  ui.status.className = `session-status ${state}`;
  ui.status.lastElementChild.textContent = message;
}

function setBusy(busy) {
  isWaiting = busy;
  ui.send.disabled = busy || !sessionId;
  ui.reset.disabled = busy;
  ui.input.disabled = busy;
}

function scrollToLatest() {
  requestAnimationFrame(() => { ui.chat.scrollTop = ui.chat.scrollHeight; });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

// A small, safe Markdown renderer tailored to research answers. User/API text is escaped first.
function markdownToHtml(markdown) {
  const codeBlocks = [];
  let html = escapeHtml(String(markdown || "").trim()).replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `@@CODE${codeBlocks.length}@@`;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return token;
  });
  html = html.replace(/^---+$/gm, "<hr>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^&gt;\s?(.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  const lines = html.split("\n");
  const result = [];
  let listType = null;
  const closeList = () => { if (listType) { result.push(`</${listType}>`); listType = null; } };
  for (const line of lines) {
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const type = unordered ? "ul" : "ol";
      if (type !== listType) { closeList(); result.push(`<${type}>`); listType = type; }
      result.push(`<li>${(unordered || ordered)[1]}</li>`);
    } else {
      closeList();
      if (!line.trim()) continue;
      if (/^<(h[1-3]|blockquote|hr|pre)/.test(line) || /^@@CODE\d+@@$/.test(line)) result.push(line);
      else result.push(`<p>${line}</p>`);
    }
  }
  closeList();
  html = result.join("");
  return html.replace(/@@CODE(\d+)@@/g, (_, index) => codeBlocks[Number(index)]);
}

function createMessage({ role, text, thinking = false, error = false }) {
  const article = document.createElement("article");
  article.className = `message ${role}${thinking ? " thinking" : ""}${error ? " error-message" : ""}`;
  article.innerHTML = `
    <div class="message-avatar" aria-hidden="true">${role === "user" ? "YOU" : "JC"}</div>
    <div class="message-body">
      <div class="message-meta"><strong>${role === "user" ? "You" : "Juris Copilot"}</strong><span>${thinking ? "researching" : "legal research"}</span></div>
      <div class="message-bubble">${thinking ? '<span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Thinking…</span>' : markdownToHtml(text)}</div>
    </div>`;
  ui.conversation.append(article);
  scrollToLatest();
  return article;
}

function extractSessionId(payload) {
  if (typeof payload === "string") return payload;
  return payload?.session_id || payload?.id || payload?.session?.id || payload?.data?.session_id || payload?.data?.id || null;
}

function getTextFromEvent(event) {
  if (typeof event === "string") return event;
  if (!event || typeof event !== "object") return null;
  const parts = event.content?.parts || event.message?.parts || event.new_message?.parts || event.parts;
  if (Array.isArray(parts)) {
    const text = parts.map(part => typeof part === "string" ? part : part?.text).filter(Boolean).join("\n");
    if (text) return text;
  }
  return event.text || event.content?.text || event.message?.text || null;
}

function extractLastText(payload) {
  const events = Array.isArray(payload) ? payload : payload?.events || payload?.data || [];
  const collection = Array.isArray(events) ? events : [events];
  for (let index = collection.length - 1; index >= 0; index -= 1) {
    const text = getTextFromEvent(collection[index]);
    if (text) return text;
  }
  return null;
}

async function createSession() {
  setBusy(true);
  setStatus("Preparing research session");
  try {
    // These same-origin endpoints are provided by server.js. The proxy calls the
    // legal agent server-to-server, avoiding its browser-origin restriction.
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error(`Session service returned ${response.status}`);
    const data = await response.json();
    sessionId = extractSessionId(data);
    if (!sessionId) throw new Error("The session service did not return a session ID.");
    setStatus("Secure research session ready", "ready");
  } catch (error) {
    sessionId = null;
    setStatus("Could not start research session", "error");
    createMessage({ role: "assistant", text: `**Unable to connect to Juris Copilot.** ${error.message}\n\nPlease check your connection and reset the session to try again.`, error: true });
  } finally {
    setBusy(false);
  }
}

async function sendMessage(text) {
  if (!text || isWaiting) return;
  if (!sessionId) { await createSession(); if (!sessionId) return; }
  ui.welcome?.remove();
  createMessage({ role: "user", text });
  ui.input.value = "";
  resizeInput();
  setBusy(true);
  const thinking = createMessage({ role: "assistant", thinking: true });
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: APP_NAME,
        user_id: USER_ID,
        session_id: sessionId,
        new_message: { parts: [{ text }] },
      }),
    });
    if (!response.ok) throw new Error(`Research service returned ${response.status}`);
    const events = await response.json();
    const answer = extractLastText(events);
    if (!answer) throw new Error("No text answer was found in the research response.");
    thinking.replaceWith(createMessage({ role: "assistant", text: answer }));
  } catch (error) {
    thinking.replaceWith(createMessage({ role: "assistant", text: `**Research request failed.** ${error.message}\n\nPlease reset the session and try your question again.`, error: true }));
  } finally {
    setBusy(false);
    ui.input.focus();
    scrollToLatest();
  }
}

function resizeInput() {
  ui.input.style.height = "auto";
  ui.input.style.height = `${Math.min(ui.input.scrollHeight, 150)}px`;
}

ui.form.addEventListener("submit", event => { event.preventDefault(); sendMessage(ui.input.value.trim()); });
ui.input.addEventListener("input", resizeInput);
ui.input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ui.form.requestSubmit(); } });
ui.reset.addEventListener("click", async () => {
  if (isWaiting) return;
  sessionId = null;
  ui.conversation.innerHTML = "";
  ui.conversation.append(ui.welcome);
  await createSession();
  ui.input.focus();
});
document.querySelectorAll(".suggestion").forEach(button => button.addEventListener("click", () => sendMessage(button.dataset.question)));
createSession();
