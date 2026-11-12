// Lê o repositório tcgdex/cards-database e a PokéAPI e grava tudo em data/checklist.db
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
import { db } from '../db.mjs';
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const repo = arg('--repo') || 'vendor/cards-database';
if (!fs.existsSync(repo)) execSync(`git clone --depth 1 https://github.com/tcgdex/cards-database.git "${repo}"`, { stdio: 'inherit' });
else if (!arg('--repo')) execSync(`git -C "${repo}" pull --ff-only`, { stdio: 'inherit' });

const S = '"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`';
const un = s => s.slice(1, -1).replace(/\\(.)/g, '$1');
const field = (src, k) => { const m = src.match(new RegExp(`^\\t${k}:\\s*(${S}|[\\w.]+)`, 'm')); return m ? (/^["'`]/.test(m[1]) ? un(m[1]) : m[1]) : null };
const block = (src, k) => (src.match(new RegExp(`^\\t${k}:\\s*\\{([\\s\\S]*?)^\\t\\}`, 'm')) || [])[1] || '';
const langs = b => { const o = {}; for (const m of b.matchAll(new RegExp(`['"]?([a-z]{2}(?:-[a-z]{2})?)['"]?\\s*:\\s*(${S})`, 'g'))) o[m[1]] = un(m[2]); return o };
const best = o => o.en || o.pt || o.ja || Object.values(o)[0] || '';
const read = f => fs.readFileSync(f, 'utf8');
const dirs = d => fs.readdirSync(d, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);

db.exec('DELETE FROM card_pokemon; DELETE FROM cards; DELETE FROM sets;');
const iSet = db.prepare('INSERT OR REPLACE INTO sets VALUES(?,?,?,?,?,?)');
const iCard = db.prepare('INSERT OR REPLACE INTO cards VALUES(?,?,?,?,?,?,?,?)');
const iCp = db.prepare('INSERT OR IGNORE INTO card_pokemon VALUES(?,?)');
let nCards = 0;
db.exec('BEGIN');
for (const [root, region] of [['data', 'w'], ['data-asia', 'a']]) {
  const R = path.join(repo, root);
  for (const serie of dirs(R)) {
    const sSrc = read(path.join(R, serie + '.ts')); const serieId = field(sSrc, 'id');
    for (const set of dirs(path.join(R, serie))) {
      const setFile = path.join(R, serie, set + '.ts'); if (!fs.existsSync(setFile)) continue;
      const src = read(setFile); const setId = field(src, 'id'); const key = region + ':' + setId;
      const total = +((src.match(/official:\s*(\d+)/) || [])[1] || 0);
      iSet.run(key, best(langs(block(sSrc, 'name'))), best(langs(block(src, 'name'))), field(src, 'releaseDate') || '', total, region);
      const sd = path.join(R, serie, set);
      for (const f of fs.readdirSync(sd).filter(f => f.endsWith('.ts'))) {
        const c = read(path.join(sd, f)); const local = f.slice(0, -3);
        const names = langs(block(c, 'name')); const lang = names.en ? 'en' : (['ja', 'zh-tw', 'ko', 'th', 'id', 'zh-cn', 'fr'].find(l => names[l]) || 'en');
        const id = `${key}:${local}`;
        iCard.run(id, key, local, best(names), field(c, 'rarity'), field(c, 'illustrator'), field(c, 'category'), `https://assets.tcgdex.net/${lang}/${serieId}/${setId}/${local}`);
        const dex = (c.match(/^\tdexId:\s*\[([^\]]*)\]/m) || [])[1];
        if (dex) for (const d of dex.match(/\d+/g) || []) iCp.run(id, +d);
        nCards++;
      }
    }
  }
}
db.exec('COMMIT');
console.log(`Cartas gravadas: ${nCards}`);

// ---- PokéAPI ----
const iPk = db.prepare('INSERT OR REPLACE INTO pokemon VALUES(?,?,?,?)');
const art = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
fs.mkdirSync('.cache', { recursive: true });
const J = async u => { for (let t = 0; t < 3; t++) try { const r = await fetch(u); if (r.ok) return await r.json() } catch { } return null };
const head = await J('https://pokeapi.co/api/v2/pokemon-species?limit=1');
if (head) {
  const ids = Array.from({ length: head.count }, (_, i) => i + 1); let i = 0, done = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (i < ids.length) {
      const id = ids[i++]; const f = `.cache/${id}.json`; let r;
      if (fs.existsSync(f)) r = JSON.parse(read(f));
      else {
        const [p, s] = await Promise.all([J(`https://pokeapi.co/api/v2/pokemon/${id}/`), J(`https://pokeapi.co/api/v2/pokemon-species/${id}/`)]);
        if (!p) continue;
        r = { name: s?.names?.find(n => n.language.name === 'en')?.name || p.name, sprite: p.sprites?.other?.['official-artwork']?.front_default || art(id), types: p.types.map(t => t.type.name).join(',') };
        fs.writeFileSync(f, JSON.stringify(r));
      }
      iPk.run(id, r.name, r.sprite, r.types);
      if (++done % 100 === 0) console.log(`Pokémon: ${done}/${ids.length}`);
    }
  }));
  console.log(`Pokémon catalogados via PokéAPI: ${done}`);
} else {
  console.warn('PokéAPI indisponível: usando nomes das próprias cartas (rode "npm run setup" de novo depois).');
  const rows = db.prepare(`SELECT cp.dex_id id, c.name, MIN(LENGTH(c.name)) FROM card_pokemon cp JOIN cards c ON c.id=cp.card_id JOIN sets s ON s.id=c.set_key WHERE s.region='w' AND c.category='Pokemon' AND (SELECT COUNT(*) FROM card_pokemon x WHERE x.card_id=c.id)=1 GROUP BY cp.dex_id`).all();
  for (const r of rows) iPk.run(r.id, r.name, art(r.id), '');
}
