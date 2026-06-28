#!/bin/bash
set -e
BACKUP_FILE="$1"
DB_PATH="${DB_PATH:-/home/workspace/Projects/checkin-reminder/data/tasks.db}"
if [ -z "$BACKUP_FILE" ]; then echo "Usage: $0 <backup-file>"; exit 1; fi
if [ ! -f "$BACKUP_FILE" ]; then echo "File not found: $BACKUP_FILE"; exit 1; fi
cp "$BACKUP_FILE" "$DB_PATH"
echo "✅ Restored from $BACKUP_FILE"
