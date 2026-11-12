#!/bin/sh
set -eu
DB_PATH="${DB_PATH:-/app/data/checklist.db}"
export DB_PATH
mkdir -p "$(dirname "$DB_PATH")"

# Popula o banco somente na primeira inicialização do volume persistente.
if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
  echo "Primeira inicialização: baixando o catálogo Pokémon e as cartas..."
  node scripts/sync.mjs
else
  COUNT=$(node --input-type=module -e "import { db } from './db.mjs'; console.log(db.prepare('SELECT COUNT(*) n FROM pokemon').get().n)")
  if [ "$COUNT" = "0" ]; then
    echo "Banco sem catálogo: sincronizando dados..."
    node scripts/sync.mjs
  fi
fi
exec node server.mjs
