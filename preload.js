const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /** Extract real file path from a drag-dropped File object (contextIsolation-safe). */
  getPathForFile: (file) => webUtils.getPathForFile(file),

  /** Open native file dialog — returns string[] | null */
  selectFiles: () => ipcRenderer.invoke("select-files"),

  /** Start conversion for a given file configuration */
  startConversion: (config) =>
    ipcRenderer.send("start-conversion", config),

  /** Open save dialog and write markdown to disk — returns boolean */
  saveMarkdown: (content, defaultName) =>
    ipcRenderer.invoke("save-markdown", content, defaultName),

  /** Copy text to system clipboard */
  copyText: (text) => ipcRenderer.invoke("copy-text", text),

  // ── event subscriptions (cleanup function returned) ──────────────────────

  onConversionStart: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("conversion-start", handler);
    return () => ipcRenderer.removeListener("conversion-start", handler);
  },

  onConversionLog: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("conversion-log", handler);
    return () => ipcRenderer.removeListener("conversion-log", handler);
  },

  onConversionError: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("conversion-error", handler);
    return () => ipcRenderer.removeListener("conversion-error", handler);
  },

  onConversionComplete: (cb) => {
    const handler = (_e, d) => cb(d);
    ipcRenderer.on("conversion-complete", handler);
    return () => ipcRenderer.removeListener("conversion-complete", handler);
  },
});
