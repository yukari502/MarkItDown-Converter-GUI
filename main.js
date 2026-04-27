const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
} = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// ── helpers ──────────────────────────────────────────────────────────────────

const isWin = process.platform === "win32";

/** Resolve the converter executable path.
 *  Priority: 1) packaged exe in resourcesPath, 2) dev-mode PyInstaller dist/exe,
 *            3) fallback Python + script via venv. */
function resolveConverter() {
  // 1) Packaged Electron app — extraResources path
  const packaged = path.join(process.resourcesPath, "converter.exe");
  if (fs.existsSync(packaged)) return { cmd: packaged, scriptMode: false };

  // 2) Dev-mode — PyInstaller output in bin/
  const devExe = path.join(__dirname, "bin", "converter.exe");
  if (fs.existsSync(devExe)) return { cmd: devExe, scriptMode: false };

  // 3) Fallback — run converter.py via .venv Python
  const venvPython = path.join(
    __dirname, ".venv",
    isWin ? "Scripts" : "bin",
    isWin ? "python.exe" : "python3",
  );
  const python = fs.existsSync(venvPython) ? venvPython : (isWin ? "python" : "python3");
  return { cmd: python, scriptMode: true };
}

/** File-filter object covering every format markitdown can handle. */
const ALL_FORMATS_FILTER = {
  name: "All Supported Formats",
  extensions: [
    // documents
    "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt",
    // images
    "jpg", "jpeg", "png", "gif", "bmp", "tiff", "tif", "svg", "webp",
    // audio
    "mp3", "wav", "ogg", "flac", "m4a", "wma",
    // web / data / archive
    "html", "htm", "csv", "json", "xml", "zip", "txt", "md",
  ],
};

// ── window management ─────────────────────────────────────────────────────────

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** Track active child process for cleanup on quit. */
/** @type {import("child_process").ChildProcess | null} */
let activeProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    title: "MarkItDown Converter",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile("index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/** Kill any running converter process before the app quits. */
app.on("before-quit", () => {
  if (activeProcess) {
    activeProcess.kill();
    activeProcess = null;
  }
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

/** Open a native file-picker dialog. */
ipcMain.handle("select-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [ALL_FORMATS_FILTER],
  });
  return result.canceled ? null : result.filePaths;
});

/** Write markdown content to a user-chosen location. */
ipcMain.handle("save-markdown", async (_event, content, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || "output.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (result.canceled || !result.filePath) return false;
  fs.writeFileSync(result.filePath, content, "utf-8");
  return true;
});

/** Copy arbitrary text to the system clipboard. */
ipcMain.handle("copy-text", async (_event, text) => {
  clipboard.writeText(text);
  return true;
});

/**
 * Start a file conversion by spawning the Python converter script.
 *
 * Expects `config` object: { filePath, apiKey, useLlm }
 * Sends back `conversion-log`, `conversion-error`, `conversion-complete` events.
 */
ipcMain.on("start-conversion", (_event, config) => {
  const { filePath, apiKey, useLlm, baseUrl, model } = config;

  const { cmd, scriptMode } = resolveConverter();
  const scriptPath = path.join(__dirname, "converter.py");

  const args = [];
  if (scriptMode) {
    args.push(scriptPath);
  }
  args.push("--file-path", filePath);
  if (apiKey) args.push("--api-key", apiKey);
  if (useLlm) args.push("--use-llm");
  if (baseUrl) args.push("--base-url", baseUrl);
  if (model) args.push("--model", model);

  const fileName = path.basename(filePath);
  mainWindow.webContents.send("conversion-start", {
    filePath: fileName,
  });

  /* Give the renderer a chance to paint before we spawn a heavy process */
  setImmediate(() => {
    mainWindow.webContents.send("conversion-log", {
      message: "Loading conversion engine…",
    });
  });

  // Kill any previously running process before starting a new one
  if (activeProcess) activeProcess.kill();

  const proc = spawn(cmd, args, { windowsHide: true });
  activeProcess = proc;

  let resultSent = false;
  let stdoutBuf = "";

  /* Parse each line of stdout — yield after every chunk so the event
     loop stays responsive. */
  proc.stdout.on("data", (data) => {
    stdoutBuf += data.toString();
    const lines = stdoutBuf.split("\n");
    stdoutBuf = lines.pop() || "";

    setImmediate(() => {
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        try {
          const msg = JSON.parse(line);

          if (msg.type === "log") {
            mainWindow.webContents.send("conversion-log", {
              message: msg.message,
            });
          } else if (msg.type === "result") {
            resultSent = true;
            if (msg.success) {
              mainWindow.webContents.send("conversion-complete", {
                markdown: msg.markdown,
              });
            } else {
              mainWindow.webContents.send("conversion-error", {
                error: msg.error,
              });
            }
          }
      } catch {
        // not JSON — still useful as a log line
        mainWindow.webContents.send("conversion-log", { message: line });
      }
    }
  });
});

  /* stderr is treated as diagnostic info */
  proc.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (text) {
      mainWindow.webContents.send("conversion-log", {
        message: `[stderr] ${text}`,
      });
    }
  });

  proc.on("error", (err) => {
    if (!resultSent) {
      mainWindow.webContents.send("conversion-error", {
        error: `Failed to start Python: ${err.message}`,
      });
    }
  });

  proc.on("close", (code) => {
    if (activeProcess === proc) activeProcess = null;
    if (!resultSent) {
      mainWindow.webContents.send("conversion-error", {
        error: `Python process exited with code ${code}`,
      });
    }
  });
});
