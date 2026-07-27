# Dual-mode entrypoint for Teacher AI Explainer.
#
# Usage:
#   python teacher_ai.py                  # standalone mode (default)
#   python teacher_ai.py --mode standalone
#   python teacher_ai.py --mode mcp       # MCP mode (not yet implemented)
#
# Standalone mode: FastAPI + WebSocket + LiteLLM. The server calls the LLM directly.
# MCP mode: MCP server + WebSocket bridge. The user's LLM client drives the conversation.

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Teacher AI Explainer")
    parser.add_argument(
        "--mode",
        choices=["standalone", "mcp"],
        default="standalone",
        help="Run mode (default: standalone)",
    )
    args = parser.parse_args()

    if args.mode == "standalone":
        import uvicorn

        from teacher_ai.standalone import app

        port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else 8000
        uvicorn.run(app, host="0.0.0.0", port=port)
    elif args.mode == "mcp":
        print("MCP mode is not yet implemented. Use --mode standalone.")
        sys.exit(1)


if __name__ == "__main__":
    main()
