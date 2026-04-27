// ── DOM refs ──────────────────────────────────────────────────────────────────

const dropZone       = document.getElementById("drop-zone");
const dropPlaceholder= document.getElementById("drop-placeholder");
const dropFileinfo   = document.getElementById("drop-fileinfo");
const fileNameEl     = document.getElementById("file-name");
const fileSizeEl     = document.getElementById("file-size");

const apiKeyInput     = document.getElementById("api-key");
const llmToggle       = document.getElementById("llm-toggle");
const llmAdvancedToggl= document.getElementById("llm-advanced-toggle");
const llmAdvancedBody = document.getElementById("llm-advanced-body");
const llmChevron      = document.getElementById("llm-chevron");
const llmBaseUrlInput = document.getElementById("llm-base-url");
const llmModelInput   = document.getElementById("llm-model");
const btnConvert     = document.getElementById("btn-convert");
const btnText        = document.getElementById("btn-text");
const spinner        = document.getElementById("spinner");
const statusBadge    = document.getElementById("status-badge");

const logPanel       = document.getElementById("log-panel");
const preview        = document.getElementById("preview");
const previewCode    = document.getElementById("preview-code");
const previewStats   = document.getElementById("preview-stats");

const btnSave        = document.getElementById("btn-save");
const btnCopy        = document.getElementById("btn-copy");

// ── collapsible advanced LLM settings ────────────────────────

llmAdvancedToggl.addEventListener("click", () => {
  const isOpen = !llmAdvancedBody.classList.contains("hidden");
  llmAdvancedBody.classList.toggle("hidden");
  llmChevron.style.transform = isOpen ? "" : "rotate(180deg)";
});

/** Currently selected file path (absolute). */
let selectedFilePath = null;

/** Whether a conversion is in progress. */
let converting = false;

/** Latest markdown result. */
let latestMarkdown = "";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function highlightMarkdown(text) {
  /* Lightweight syntax colouring — adds <span> classes around common
     Markdown patterns.  This runs on every set, so keep it fast. */
  return text
    .replace(/^(#{1,6}\s.+)/gm,        '<span class="hl-heading">$1</span>')
    .replace(/^(- \s*.+)/gm,           '<span class="hl-list">$1</span>')
    .replace(/^(\d+\.\s*.+)/gm,        '<span class="hl-list">$1</span>')
    .replace(/(`[^`]+`)/g,             '<span class="hl-code">$1</span>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<span class="hl-link">$1</span>')
    .replace(/(\*\*|__)(.*?)\1/g,      '<span class="hl-bold">$2</span>')
    .replace(/^([-*_]{3,})\s*$/gm,     '<span class="hl-hr">$1</span>');
}

function setConverting(state) {
  converting = state;
  btnConvert.disabled = state || !selectedFilePath;
  btnSave.disabled    = state || !latestMarkdown;
  btnCopy.disabled    = state || !latestMarkdown;
  spinner.classList.toggle("hidden", !state);
  btnText.textContent = state ? "Converting…" : "Start Conversion";
  statusBadge.classList.toggle("hidden", !state);
}

function appendLog(message, className = "") {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = message;
  logPanel.appendChild(div);
  logPanel.scrollTop = logPanel.scrollHeight;
}

function setPreview(markdown) {
  latestMarkdown = markdown;
  if (!markdown) {
    previewCode.innerHTML = "No output yet — select a file and click \"Start Conversion\".";
    previewCode.className = "text-gray-400";
    previewStats.textContent = "";
    btnSave.disabled = true;
    btnCopy.disabled = true;
    return;
  }
  previewCode.innerHTML = highlightMarkdown(markdown);
  previewCode.className = "";
  const lines = markdown.split("\n").length;
  previewStats.textContent = `${lines} lines · ${markdown.length} chars`;
  btnSave.disabled = false;
  btnCopy.disabled = false;
}

// ── file selection (IPC + drag-drop) ─────────────────────────────────────────

function selectFileViaDialog() {
  if (converting) return;
  window.electronAPI.selectFiles().then((files) => {
    if (files && files.length > 0) setSelectedFile(files[0]);
  });
}

function setSelectedFile(filePath) {
  selectedFilePath = filePath;
  const name = filePath.split(/[/\\]/).pop();
  fileNameEl.textContent = name;
  dropPlaceholder.classList.add("hidden");
  dropFileinfo.classList.remove("hidden");
  dropZone.classList.add("has-file");
  btnConvert.disabled = converting ? true : false;

  // try to get file size via a quick stat IPC (not exposed — use placeholder)
  fileSizeEl.textContent = "";
  appendLog(`Selected: ${name}`, "log-info");
}

// ── drag & drop ───────────────────────────────────────────────────────────────

/* Prevent Electron from navigating to the file (must be on document). */
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (converting) return;
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const filePath = window.electronAPI.getPathForFile(file);
  setSelectedFile(filePath);
});
dropZone.addEventListener("click", selectFileViaDialog);

// keyboard accessibility
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") selectFileViaDialog();
});

// ── LLM settings persistence ────────────────────────────────────────────────

const savedKey = localStorage.getItem("markitdown_api_key");
if (savedKey) apiKeyInput.value = savedKey;
apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("markitdown_api_key", apiKeyInput.value);
});

const savedBaseUrl = localStorage.getItem("markitdown_base_url");
if (savedBaseUrl) llmBaseUrlInput.value = savedBaseUrl;
llmBaseUrlInput.addEventListener("input", () => {
  localStorage.setItem("markitdown_base_url", llmBaseUrlInput.value);
});

const savedModel = localStorage.getItem("markitdown_model");
if (savedModel) llmModelInput.value = savedModel;
llmModelInput.addEventListener("input", () => {
  localStorage.setItem("markitdown_model", llmModelInput.value);
});

// ── conversion flow ───────────────────────────────────────────────────────────

btnConvert.addEventListener("click", () => {
  if (converting || !selectedFilePath) return;

  // reset UI
  logPanel.innerHTML = "";
  setPreview("");
  setConverting(true);
  appendLog("Starting conversion…", "log-info");

  window.electronAPI.startConversion({
    filePath: selectedFilePath,
    apiKey:   apiKeyInput.value.trim(),
    useLlm:   llmToggle.value === "enabled",
    baseUrl:  llmBaseUrlInput.value.trim() || "",
    model:    llmModelInput.value.trim() || "",
  });
});

// ── IPC listeners ─────────────────────────────────────────────────────────────

window.electronAPI.onConversionStart(({ filePath }) => {
  appendLog(`[${filePath}] Preparing…`, "log-info");
});

window.electronAPI.onConversionLog(({ message }) => {
  // simple level detection from message prefix
  let cls = "log-info";
  if (/^Done/i.test(message)) cls = "log-done";
  else if (/warn/i.test(message)) cls = "log-warn";
  else if (/error|fail/i.test(message)) cls = "log-error";
  else if (/stderr/i.test(message)) cls = "log-warn";
  appendLog(message, cls);
});

window.electronAPI.onConversionError(({ error }) => {
  appendLog(`ERROR: ${error}`, "log-error");
  setConverting(false);
});

window.electronAPI.onConversionComplete(({ markdown }) => {
  appendLog("Conversion complete.", "log-done");
  setPreview(markdown);
  setConverting(false);
  statusBadge.textContent = "✓ Done";
  statusBadge.classList.remove("hidden");
  setTimeout(() => statusBadge.classList.add("hidden"), 4000);
});

// ── export actions ────────────────────────────────────────────────────────────

btnSave.addEventListener("click", async () => {
  if (!latestMarkdown) return;
  const saved = await window.electronAPI.saveMarkdown(latestMarkdown, (fileNameEl.textContent || "output") + ".md");
  if (saved) appendLog("File saved successfully.", "log-done");
});

btnCopy.addEventListener("click", async () => {
  if (!latestMarkdown) return;
  await window.electronAPI.copyText(latestMarkdown);
  appendLog("Copied to clipboard.", "log-done");
});
