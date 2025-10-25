#!/bin/bash
# Backup script for AI Novel Assistant
# Backs up database and uploaded files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="${DB_PATH:-./server/prisma/novels.db}"
UPLOADS_PATH="${UPLOADS_PATH:-./server/uploads}"
KEEP_DAYS="${KEEP_DAYS:-7}"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📦 AI Novel Assistant Backup Script"
echo "===================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/backup-$DATE.tar.gz"

echo "Creating backup..."
echo "Date: $(date)"
echo "Backup file: $BACKUP_FILE"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}⚠ Warning: Database file not found at $DB_PATH${NC}"
    echo "Skipping database backup..."
    DB_INCLUDED=false
else
    echo "✓ Database found: $DB_PATH"
    DB_INCLUDED=true
fi

# Check if uploads directory exists
if [ ! -d "$UPLOADS_PATH" ]; then
    echo -e "${YELLOW}⚠ Warning: Uploads directory not found at $UPLOADS_PATH${NC}"
    echo "Skipping uploads backup..."
    UPLOADS_INCLUDED=false
else
    UPLOAD_COUNT=$(find "$UPLOADS_PATH" -type f | wc -l)
    echo "✓ Uploads directory found: $UPLOADS_PATH ($UPLOAD_COUNT files)"
    UPLOADS_INCLUDED=true
fi

# Create backup archive
echo ""
echo "Creating archive..."

BACKUP_CONTENTS=""
if [ "$DB_INCLUDED" = true ]; then
    BACKUP_CONTENTS="$BACKUP_CONTENTS $DB_PATH"
fi
if [ "$UPLOADS_INCLUDED" = true ]; then
    BACKUP_CONTENTS="$BACKUP_CONTENTS $UPLOADS_PATH"
fi

if [ -z "$BACKUP_CONTENTS" ]; then
    echo -e "${YELLOW}❌ Nothing to backup!${NC}"
    exit 1
fi

tar -czf "$BACKUP_FILE" $BACKUP_CONTENTS

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✓ Backup created: $BACKUP_FILE ($BACKUP_SIZE)${NC}"

# Create backup manifest
MANIFEST_FILE="$BACKUP_DIR/backup-$DATE.txt"
cat > "$MANIFEST_FILE" <<EOF
AI Novel Assistant Backup Manifest
===================================
Date: $(date)
Backup File: $BACKUP_FILE
Size: $BACKUP_SIZE

Contents:
- Database: $DB_INCLUDED ($DB_PATH)
- Uploads: $UPLOADS_INCLUDED ($UPLOADS_PATH)

System Info:
- Hostname: $(hostname)
- User: $(whoami)
- Node Version: $(node --version 2>/dev/null || echo "N/A")

To restore:
tar -xzf $BACKUP_FILE -C /
EOF

echo "✓ Manifest created: $MANIFEST_FILE"

# Clean up old backups
echo ""
echo "Cleaning up old backups (keeping last $KEEP_DAYS days)..."

OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$KEEP_DAYS)
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
        rm -f "$old_backup"
        rm -f "${old_backup%.tar.gz}.txt"
        echo "  Deleted: $(basename "$old_backup")"
    done
else
    echo "  No old backups to delete"
fi

# Show backup directory summary
echo ""
echo "Backup Summary:"
echo "---------------"
echo "Total backups: $(find "$BACKUP_DIR" -name "backup-*.tar.gz" | wc -l)"
echo "Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
