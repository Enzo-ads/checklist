import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
import { db } from './db.mjs';
const PORT = process.env.PORT || 3000;
const Q = s => db.prepare(s);
const run = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) };
const body = req => new Promise(r => { let b = ''; req.on('data', d => b += d); req.on('end', () => { try { r(JSON.parse(b || '{}')) } catch { r({}) } }) });
const LIST = `SELECT p.id,p.name,p.sprite,p.types,
 (SELECT COUNT(*) FROM card_pokemon cp WHERE cp.dex_id=p.id) total,
 (SELECT COUNT(*) FROM card_pokemon cp JOIN owned o ON o.card_id=cp.card_id WHERE cp.dex_id=p.id) have,
 EXISTS(SELECT 1 FROM selected s WHERE s.dex_id=p.id) sel FROM pokemon p`;
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const p = u.pathname; let m;
  try {
    if (p === '/health') return run(res, 200, { ok: true });
    if (p === '/' ) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(ROOT, 'public/index.html'))) }
    if (p === '/api/pokemon') {
      const q = (u.searchParams.get('q') || '').trim();
      const rows = u.searchParams.get('sel') ? Q(LIST + ' WHERE sel=1 ORDER BY (SELECT added_at FROM selected WHERE dex_id=p.id)').all()
        : Q(LIST + ' WHERE p.name LIKE ? OR p.id=? ORDER BY (p.name LIKE ? ) DESC, p.id LIMIT 30').all(`%${q}%`, +q || -1, `${q}%`);
      return run(res, 200, rows);
    }
    if (p === '/api/selected' && req.method === 'POST') { const { id } = await body(req); Q('INSERT OR IGNORE INTO selected(dex_id) VALUES(?)').run(id); return run(res, 200, { ok: 1 }) }
    if ((m = p.match(/^\/api\/selected\/(\d+)$/)) && req.method === 'DELETE') { Q('DELETE FROM selected WHERE dex_id=?').run(+m[1]); return run(res, 200, { ok: 1 }) }
    if ((m = p.match(/^\/api\/pokemon\/(\d+)\/cards$/))) {
      return run(res, 200, Q(`SELECT c.id,c.local_id,c.name,c.rarity,c.illustrator,c.img,s.name set_name,s.serie_name,s.release_date,s.region,s.total,
        EXISTS(SELECT 1 FROM owned o WHERE o.card_id=c.id) own FROM card_pokemon cp JOIN cards c ON c.id=cp.card_id JOIN sets s ON s.id=c.set_key
        WHERE cp.dex_id=? ORDER BY s.release_date,s.id,CAST(c.local_id AS INTEGER),c.local_id`).all(+m[1]));
    }
    if (p === '/api/owned' && req.method === 'POST') {
      const { ids = [], owned } = await body(req); const st = Q(owned ? 'INSERT OR IGNORE INTO owned(card_id) VALUES(?)' : 'DELETE FROM owned WHERE card_id=?');
      db.exec('BEGIN'); ids.forEach(i => st.run(i)); db.exec('COMMIT'); return run(res, 200, { ok: 1 });
    }
    run(res, 404, { error: 'não encontrado' });
  } catch (e) { run(res, 500, { error: String(e) }) }
}).listen(PORT, '0.0.0.0', () => console.log(`Fichário disponível na porta ${PORT}`));
