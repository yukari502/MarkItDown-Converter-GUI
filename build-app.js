const packager = require("@electron/packager");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const BIN_SRC = path.join(ROOT, "bin", "converter.exe");
const OUTPUT = path.join(ROOT, "release");

(async () => {
  console.log("Packaging MarkItDown Converter …");

  const appPaths = await packager.packager({
    dir: ROOT,
    out: OUTPUT,
    name: "MarkItDown Converter",
    platform: "win32",
    arch: "x64",
    electronVersion: "33.4.11",
    appCopyright: "MarkItDown Converter",
    appVersion: "1.0.0",
    executableName: "MarkItDown Converter",
    overwrite: true,
    prune: true,
    ignore: [
      /node_modules\/electron-builder/,
      /node_modules\/@electron\/packager/,
      /\.venv/,
      /\.gitignore/,
      /setup\.(bat|sh)/,
      /converter\.spec/,
      /build/,
      /release/,
      /markitdown/,
    ],
  });

  const appDir = appPaths[0];
  console.log("App created at:", appDir);

  // Copy converter.exe into resources
  const resourcesDir = path.join(appDir, "resources");
  if (fs.existsSync(BIN_SRC)) {
    fs.copyFileSync(BIN_SRC, path.join(resourcesDir, "converter.exe"));
    console.log("converter.exe copied to resources/");
  }

  // Also copy converter.py for fallback
  fs.copyFileSync(
    path.join(ROOT, "converter.py"),
    path.join(resourcesDir, "converter.py"),
  );

  console.log("\nDone! You can run:");
  console.log(`  "${appDir}\\MarkItDown Converter.exe"`);
  console.log("\nTo create a single-file portable, install Inno Setup or");
  console.log("use: npm run build:win  (requires Windows SDK / Admin shell)");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
