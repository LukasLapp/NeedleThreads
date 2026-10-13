#!/usr/bin/env bash
#
# Start the NeedleThreads application on your local machine.
#
# Ensures a smooth developer setup by verifying prerequisites, installing dependencies,
# setting up the normalized SQLite database with seed data, and booting the server.
#
# Usage:
#   ./start.sh            Start the app on http://localhost:3000
#   ./start.sh --dev      Start in watch mode (auto-restarts on file save)
#   ./start.sh --port 4000 Listen on port 4000 instead of 3000
#   ./start.sh --help     Show this help message
#
# Works on Linux and macOS.

# Bash strict mode: stop immediately on errors, unset variables, or pipe failures.
set -euo pipefail

# Node.js major version requirement
REQUIRED_NODE_MAJOR=20

DEV_MODE="false"
PORT_OVERRIDE=""

# --- Helpers ----------------------------------------------------------------

say() {
    printf '==> %s\n' "$1"
}

die() {
    printf 'ERROR: %s\n' "$1" >&2
    exit 1
}

usage() {
    awk 'NR>1 { if (/^#/) { sub(/^# ?/, ""); print } else { exit } }' "$0"
    exit 0
}

# --- Option Parsing ---------------------------------------------------------

while [ $# -gt 0 ]; do
    case "$1" in
        -d|--dev)
            DEV_MODE="true"
            shift
            ;;
        -p|--port)
            [ $# -ge 2 ] || die "--port requires a port number (e.g., --port 4000)"
            case "$2" in
                ''|*[!0-9]*) die "--port must be a numeric value, got '$2'" ;;
            esac
            PORT_OVERRIDE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            die "Unknown option '$1' (try --help)"
            ;;
    esac
done

# Ensure script executes from project root regardless of invocation path
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ============================================================================
# STEP 1: Tool Verification
# ============================================================================
say "Step 1/4: Checking system dependencies..."

command -v node >/dev/null 2>&1 \
    || die "Node.js is not installed. Please install Node.js (version ${REQUIRED_NODE_MAJOR} or newer) from https://nodejs.org."

if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= ${REQUIRED_NODE_MAJOR} ? 0 : 1)"; then
    die "Node $(node --version) is installed, but version ${REQUIRED_NODE_MAJOR} or newer is required."
fi

command -v npm >/dev/null 2>&1 \
    || die "npm is missing. Please reinstall Node.js from https://nodejs.org to include npm."

[ -f package.json ] \
    || die "package.json not found. Make sure you are running start.sh from the project root."

# ============================================================================
# STEP 2: Install Project Dependencies
# ============================================================================
say "Step 2/4: Verifying and installing dependencies..."

INSTALL_MARKER="node_modules/.package-lock.json"

if [ ! -d node_modules ]; then
    say "Installing npm dependencies for the first time..."
    npm install
elif [ ! -f "$INSTALL_MARKER" ] || [ package-lock.json -nt "$INSTALL_MARKER" ]; then
    say "package-lock.json has changed since last run. Updating dependencies..."
    npm install
else
    say "Dependencies are up to date."
fi

# ============================================================================
# STEP 3: First-Run Initialization (Database & Sample Data)
# ============================================================================
say "Step 3/4: Setting up database and assets..."

DB_FILE="needlethreads.db"
INIT_SCRIPT="db/init.js"

if [ ! -f "$DB_FILE" ]; then
    if [ -f "$INIT_SCRIPT" ]; then
        say "Database file ($DB_FILE) not found. Creating SQLite schema and seeding sample data..."
        node "$INIT_SCRIPT"
    else
        die "Database setup script ($INIT_SCRIPT) is missing. Cannot create $DB_FILE."
    fi
else
    say "Database file ($DB_FILE) already exists. Skipping initialization."
fi

# ============================================================================
# STEP 4: Start Application
# ============================================================================
say "Step 4/4: Launching NeedleThreads..."

if [ -n "$PORT_OVERRIDE" ]; then
    export PORT="$PORT_OVERRIDE"
fi

PORT_IN_USE="${PORT_OVERRIDE:-3000}"

say "Application successfully initialized!"
say "Open http://localhost:${PORT_IN_USE} in your browser to access NeedleThreads."
say "Press Ctrl+C to stop the server."

if [ "$DEV_MODE" = "true" ]; then
    say "Dev Mode Active: Server will automatically restart when source files change."
    exec node --watch server/server.js
fi

exec node server/server.js