#!/usr/bin/env bash
set -e

echo "============================================"
echo "  MarkItDown Converter - Environment Setup"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Python
echo "[1/5] Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}[ERROR] Python 3.10+ is not installed.${NC}"
    echo "       Please install from https://www.python.org/"
    exit 1
fi
$PYTHON --version
echo ""

# Check Node.js
echo "[2/5] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js 18+ is not installed.${NC}"
    echo "       Please install from https://nodejs.org/"
    exit 1
fi
node --version
echo ""

# Create virtual environment
echo "[3/5] Creating Python virtual environment..."
if [ -d ".venv" ]; then
    echo "  Virtual environment already exists, skipping..."
else
    $PYTHON -m venv .venv
    echo -e "${GREEN}  Virtual environment created.${NC}"
fi
echo ""

# Activate virtual environment
source .venv/bin/activate

# Install Python dependencies
echo "[4/5] Installing Python dependencies..."
echo "  Installing markitdown..."
pip install "markitdown[all]" || echo -e "${YELLOW}  [WARNING] markitdown install failed.${NC}"

echo "  Installing openai (optional, for LLM features)..."
pip install openai || echo -e "${YELLOW}  [WARNING] openai install failed. LLM unavailable.${NC}"

echo -e "${GREEN}  Python dependencies installed.${NC}"
echo ""

# Install Node.js dependencies
echo "[5/5] Installing Node.js dependencies..."
npm install || { echo -e "${RED}[ERROR] npm install failed.${NC}"; exit 1; }
echo -e "${GREEN}  Node.js dependencies installed.${NC}"
echo ""

deactivate

echo "============================================"
echo -e "${GREEN}  Setup Complete!${NC}"
echo "============================================"
echo ""
echo "  Run the application with:"
echo "    npm start"
echo ""
