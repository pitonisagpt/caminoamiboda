#!/bin/bash
# Full backup of the local "production" deployment: Postgres data +
# uploaded vehicle photos + generated PDFs (quotes/settlements).
# Everything is written to docs/backups/ (gitignored — never committed).
set -euo pipefail

cd "$(dirname "$0")/../.."  # repo root

TS=$(date +%Y%m%d_%H%M%S)
OUT_DIR="docs/backups/${TS}"
mkdir -p "$OUT_DIR"

echo "→ Backing up database..."
docker exec caminoamiboda-db-1 pg_dump -U postgres -d caminoamiboda --no-owner --no-privileges \
  | gzip > "${OUT_DIR}/database.sql.gz"

echo "→ Backing up vehicle photos..."
docker run --rm \
  -v caminoamiboda_vehicle_uploads:/data:ro \
  -v "$(pwd)/${OUT_DIR}:/backup" \
  alpine sh -c "cd /data && tar czf /backup/vehicle_uploads.tar.gz ."

echo "→ Backing up generated PDFs..."
docker run --rm \
  -v caminoamiboda_pdf_storage:/data:ro \
  -v "$(pwd)/${OUT_DIR}:/backup" \
  alpine sh -c "cd /data && tar czf /backup/pdf_storage.tar.gz ."

echo ""
echo "Backup complete: ${OUT_DIR}"
du -sh "${OUT_DIR}"/*
