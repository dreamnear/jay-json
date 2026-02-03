#!/bin/bash
# Script to run wails3 dev and keep wails internal bindings restored

# Backup original files
BACKUP_DIR="/tmp/wails-bindings-backup-$$"
mkdir -p "$BACKUP_DIR"

if [ -f "frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js" ]; then
    cp frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js "$BACKUP_DIR/"
    cp frontend/bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts "$BACKUP_DIR/"
else
    # Try to get from git
    mkdir -p frontend/bindings/github.com/wailsapp/wails/v3/internal
    git show HEAD:frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js > frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js 2>/dev/null
    git show HEAD:frontend/bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts > frontend/bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts 2>/dev/null
    cp frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js "$BACKUP_DIR/"
    cp frontend/bindings/github.com/wailsapp/wails/v3/internal/eventdata.d.ts "$BACKUP_DIR/"
fi

# Function to restore bindings
restore_bindings() {
    mkdir -p frontend/bindings/github.com/wailsapp/wails/v3/internal
    cp "$BACKUP_DIR/eventcreate.js" frontend/bindings/github.com/wailsapp/wails/v3/internal/
    cp "$BACKUP_DIR/eventdata.d.ts" frontend/bindings/github.com/wailsapp/wails/v3/internal/
}

# Monitor and restore in background
(
    while true; do
        if [ ! -f "frontend/bindings/github.com/wailsapp/wails/v3/internal/eventcreate.js" ]; then
            restore_bindings
        fi
        sleep 0.5
    done
) &
MONITOR_PID=$!

# Cleanup on exit
trap "kill $MONITOR_PID 2>/dev/null; rm -rf '$BACKUP_DIR'" EXIT

# Run wails3 dev
wails3 dev
