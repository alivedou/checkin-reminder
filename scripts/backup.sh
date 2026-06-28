#!/bin/bash
set -e
DB_PATH="${DB_PATH:-/home/workspace/Projects/checkin-reminder/data/tasks.db}"
BACKUP_DIR="${BACKUP_DIR:-/home/workspace/Projects/checkin-reminder/backups}"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
cp "$DB_PATH" "$BACKUP_DIR/tasks_${DATE}.db"
find "$BACKUP_DIR" -name "tasks_*.db" -mtime +7 -delete 2>/dev/null
echo "✅ Backup: tasks_${DATE}.db"
ls -la "$BACKUP_DIR"/tasks_*.db
