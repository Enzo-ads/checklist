import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const dbPath = process.env.DB_PATH || path.resolve('data/checklist.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(`
CREATE TABLE IF NOT EXISTS pokemon(id INTEGER PRIMARY KEY,name TEXT,sprite TEXT,types TEXT);
CREATE TABLE IF NOT EXISTS sets(id TEXT PRIMARY KEY,serie_name TEXT,name TEXT,release_date TEXT,total INTEGER,region TEXT);
CREATE TABLE IF NOT EXISTS cards(id TEXT PRIMARY KEY,set_key TEXT,local_id TEXT,name TEXT,rarity TEXT,illustrator TEXT,category TEXT,img TEXT);
CREATE TABLE IF NOT EXISTS card_pokemon(card_id TEXT,dex_id INTEGER,PRIMARY KEY(card_id,dex_id));
CREATE INDEX IF NOT EXISTS cp_dex ON card_pokemon(dex_id);
CREATE TABLE IF NOT EXISTS selected(dex_id INTEGER PRIMARY KEY,added_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS owned(card_id TEXT PRIMARY KEY,added_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
