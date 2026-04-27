#!/usr/bin/env python3
"""
MarkItDown Converter — Python wrapper for Microsoft MarkItDown library.

Receives file path and optional LLM configuration via CLI arguments.
Outputs JSON lines to stdout for consumption by the Electron main process.

Protocol (JSON lines on stdout):
  {"type": "log",   "message": "..."}          — progress / status info
  {"type": "result", "success": true,  "markdown": "..."}  — success
  {"type": "result", "success": false, "error": "..."}     — failure
"""

import argparse
import json
import os
import sys
import traceback


def emit_log(message: str) -> None:
    print(json.dumps({"type": "log", "message": message}, ensure_ascii=False), flush=True)


def emit_result(*, success: bool, markdown: str = "", error: str = "") -> None:
    payload: dict = {"type": "result", "success": success}
    if markdown:
        payload["markdown"] = markdown
    if error:
        payload["error"] = error
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="MarkItDown Converter")
    parser.add_argument("--file-path", required=True, help="Path to the input file")
    parser.add_argument("--api-key", default="", help="OpenAI API key (optional)")
    parser.add_argument("--use-llm", action="store_true", help="Enable LLM-assisted parsing")
    parser.add_argument("--base-url", default="", help="OpenAI-compatible base URL (optional)")
    parser.add_argument("--model", default="", help="LLM model name (default: gpt-4o)")
    args = parser.parse_args()

    file_path = args.file_path

    # --- validate file existence ------------------------------------------------
    if not os.path.isfile(file_path):
        emit_result(success=False, error=f"File not found: {file_path}")
        return

    emit_log(f"Converting: {os.path.basename(file_path)}")

    # --- import markitdown ------------------------------------------------------
    try:
        from markitdown import MarkItDown
    except ImportError:
        emit_result(
            success=False,
            error="markitdown library not found. Run: pip install markitdown",
        )
        return

    # --- optional LLM setup -----------------------------------------------------
    llm_client = None
    llm_model = None

    if args.use_llm and args.api_key:
        model_name = args.model or "gpt-4o"
        emit_log(f"Initialising LLM client ({model_name}) …")
        try:
            from openai import OpenAI

            client_kwargs = {"api_key": args.api_key}
            if args.base_url:
                client_kwargs["base_url"] = args.base_url
            llm_client = OpenAI(**client_kwargs)
            llm_model = model_name
            emit_log("LLM client ready.")
        except ImportError:
            emit_log("Warning: openai package not installed — LLM features disabled.")
    elif args.use_llm and not args.api_key:
        emit_log("Warning: LLM mode enabled but no API key provided. Running without LLM.")

    # --- convert ----------------------------------------------------------------
    try:
        emit_log("Creating MarkItDown instance …")
        md = MarkItDown(llm_client=llm_client, llm_model=llm_model)

        emit_log("Running conversion …")
        result = md.convert(file_path)

        # Handle different versions of the markitdown API
        markdown_content = result.text_content if hasattr(result, "text_content") else str(result)

        n = len(markdown_content)
        emit_log(f"Done — generated {n} character{'s' if n != 1 else ''}.")
        emit_result(success=True, markdown=markdown_content)

    except Exception as exc:
        from markitdown._exceptions import MissingDependencyException

        # Detect missing optional dependency and give a precise fix hint
        if isinstance(exc, MissingDependencyException):
            deps_hint = str(exc).split("install MarkItDown")[-1].strip() if "install MarkItDown" in str(exc) else ""
            emit_log(f"Missing dependency: {deps_hint or str(exc)}")
            emit_result(
                success=False,
                error=(
                    f"A required dependency for this file type is missing. "
                    f"See the log above for details, or re-run:\n"
                    f"  pip install \"markitdown[all]\""
                ),
            )
            return
        err_msg = traceback.format_exc()
        emit_log(f"Conversion failed: {err_msg}")
        emit_result(success=False, error=f"Conversion error: {err_msg}")


if __name__ == "__main__":
    main()
