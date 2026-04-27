# MarkItDown Converter-GUI

[简体中文](./README_zh.md)

This project is a desktop GUI frontend based on Microsoft's [MarkItDown](https://github.com/microsoft/markitdown). Effortlessly convert files like PDF, Word, Excel, PowerPoint, images, audio/video, and more into high-quality Markdown using a simple drag-and-drop interface.

### Quick Start

#### Pre-compiled Version (Recommended)
Download `MarkItDown Converter 1.0.0.exe` from [Releases](../../releases) and double-click to run it. Ready to use, no environment configuration is required.
Note: As per MarkItDown, image recognition requires a vision-capable LLM. It is not configured by default. You can manually configure the OpenAI API Key, Base URL, and Model Name (these settings are collapsed by default and can be customized upon expansion).

#### Development Mode
```bash
# Windows
setup.bat

# macOS / Linux
chmod +x setup.sh && ./setup.sh

# Run
npm start
```

### Features
- **File Input**: Drag-and-drop or click to select. Supports PDF, DOCX, XLSX, PPTX, Images, Audio, HTML, CSV, JSON, ZIP, etc.
- **LLM Enhancement**: Optional OpenAI API integration (API Key, Base URL, Model Name) for smarter conversions (e.g., OCR, image description).
- **Live Preview**: Real-time log output and Markdown syntax-highlighted preview.
- **Export**: Save as `.md` files or copy directly to the clipboard.

![Preview](image.png)

### Build
```bash
# Portable Single-file Version (Ready to use)
npm run build:win

# Packaged Directory (using @electron/packager)
npm run pack
```

### Project Structure
```text
├── main.js           # Electron Main Process
├── preload.js        # IPC Bridge
├── index.html        # Frontend UI (Vanilla CSS / Tailwind)
├── renderer.js       # Frontend Logic
├── converter.py      # Python conversion wrapper
├── build-app.js      # Packager build script
├── setup.bat         # Windows setup script
├── setup.sh          # macOS / Linux setup script
```

### Tech Stack
- **Frontend**: Electron 33 + Tailwind CSS
- **Conversion Engine**: Python 3.11 + [markitdown](https://github.com/microsoft/markitdown)
