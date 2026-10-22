// Test del worker del controllo siti, senza rete esterna. Uso: node worker/test.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codice } from '../n8n/annunci/build.mjs';
import { caricaRegole, valuta, controlloHttps, apriSito, inParallelo } from './site-checks.mjs';
import { richiesta, privato } from './http.mjs';
import { pagineDaAprire, haModulo, trovaContatti } from './contacts.mjs';
import { caricaOsm, filtri, caricaProvince, dentro, puntoDi, leggiAttivita, normalizza, semplifica } from './osm.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fx = join(root, 'n8n', 'engine', 'test', 'fixtures', 'signals');

// 1. Stessi esiti del nodo n8n «Valuta siti» (09-valuta-siti.js) sulle stesse pagine e sugli stessi esiti HTTPS.
const n8n = (aziende, https, pagine) => {
  const $ = (name) => ({ all: () => (name === 'Siti da controllare' ? aziende : https).map(j => ({ json: j })) });
  const $input = { all: () => pagine.map(j => ({ json: j })) };
  return new Function('$', '$input', codice('09-valuta-siti.js'))($, $input)[0].json.items;
};
const regole = caricaRegole();
const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const ssl = (m) => ({ error: { message: "SSL Issue: consider using the 'Ignore SSL issues' option", cause: { message: m } }, details: { description: m } });
const casiHttps = [{}, ssl('certificate has expired'), ssl("Hostname/IP does not match certificate's altnames: Host: www.prova.it. is not in the cert's altnames: DNS:webx.aruba.it"),
  { error: { message: 'connect ECONNREFUSED 1.2.3.4:443', code: 'ECONNREFUSED' } }];
let confronti = 0;
for (const f of readdirSync(fx).filter(n => n.endsWith('.html'))) {
  const html = readFileSync(join(fx, f), 'utf8');
  for (const website of ['https://www.prova.it/', 'http://prova.it']) {
    for (const h of casiHttps) {
      const a = { company_id: 'x', domain: 'prova.it', name: 'Prova', website };
      const atteso = n8n([a], [h], [{ html }]);
      const mio = valuta(regole, a, html, { eseguito: true, ...h }, oggi);
      delete mio.letto;
      assert.deepEqual(JSON.parse(JSON.stringify(mio)), JSON.parse(JSON.stringify(atteso[0])), `${f} ${website} ${JSON.stringify(h).slice(0, 60)}`);
      confronti++;
    }
  }
}
console.log(`ok  stessi esiti di «Valuta siti» su ${confronti} casi`);

// 2. Indirizzi interni rifiutati.
for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '64:ff9b::a00:1', '2002:a00:1::', '2001:0:4136::1', '192.0.2.1'])
  assert.ok(privato(ip), `privato: ${ip}`);
for (const ip of ['8.8.8.8', '2.31.7.149', '172.32.0.1', '2a01:4f8::1', '192.0.100.1', '2001:4860::8888']) assert.ok(!privato(ip), `pubblico: ${ip}`);
await assert.rejects(richiesta('http://127.0.0.1/'), { code: 'EPRIVATE' });
await assert.rejects(richiesta('http://localhost/'), { code: 'EPRIVATE' });
await assert.rejects(richiesta('http://example.com:8080/'), { code: 'EPORT' });
await assert.rejects(richiesta('file:///etc/passwd'), { code: 'EPROTOCOL' });
console.log('ok  indirizzi interni, porte e protocolli strani rifiutati');

// 3. Client HTTP su un server locale (ammesso solo con privatiAmmessi, che usano i test).
const server = http.createServer((req, res) => {
  if (req.url === '/r1') { res.writeHead(301, { Location: '/r2' }); return res.end(); }
  if (req.url === '/r2') { res.writeHead(302, { Location: '/pagina' }); return res.end(); }
  if (req.url === '/loop') { res.writeHead(302, { Location: '/loop' }); return res.end(); }
  if (req.url === '/interno') { res.writeHead(302, { Location: 'http://127.0.0.1/' }); return res.end(); }
  if (req.url === '/gz') { res.writeHead(200, { 'Content-Encoding': 'gzip' }); return res.end(zlib.gzipSync('<html>compressa</html>')); }
  if (req.url === '/grande') { res.writeHead(200); return res.end('x'.repeat(5_000_000)); }
  if (req.url === '/404') { res.writeHead(404); return res.end('<html>non trovata</html>'); }
  if (req.url === '/lento') { res.writeHead(200); const t = setInterval(() => res.write('x'), 300); res.on('close', () => clearInterval(t)); return; }
  if (req.url === '/storto') { res.writeHead(302, { Location: 'http://[zz/' }); return res.end(); }
  res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : '<html>ok</html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const op = { privatiAmmessi: true };
// La porta del server di prova non è 80/443: rifiutata anche con privatiAmmessi.
try {
  await assert.rejects(richiesta(base + '/', op), { code: 'EPORT' });
} finally { server.close(); }
console.log('ok  porta non standard rifiutata anche in locale');

// Il resto del client si prova su un server sulla porta 80 solo se disponibile (root); altrimenti si salta.
const s80 = http.createServer(server.listeners('request')[0]);
const libera = await new Promise(r => { s80.once('error', () => r(false)); s80.listen(80, '127.0.0.1', () => r(true)); });
if (libera) {
  const b = 'http://127.0.0.1';
  assert.equal((await richiesta(b + '/r1', op)).body, '<html>ok</html>', 'redirect seguiti');
  await assert.rejects(richiesta(b + '/loop', op), { code: 'EREDIRECT' }, 'redirect infiniti fermati');
  await assert.rejects(richiesta(b + '/interno', { privatiAmmessi: false }), { code: 'EPRIVATE' });
  assert.equal((await richiesta(b + '/gz', op)).body, '<html>compressa</html>', 'gzip');
  assert.equal((await richiesta(b + '/grande', op)).body.length, 3_000_000, 'al massimo 3 MB');
  const nf = await richiesta(b + '/404', op);
  assert.equal(nf.status, 404); assert.equal(nf.body, '<html>non trovata</html>', 'pagina letta anche con 404');
  assert.equal((await richiesta(b + '/', { ...op, method: 'HEAD' })).status, 200, 'HEAD');
  const t0 = Date.now();
  await assert.rejects(richiesta(b + '/lento', { ...op, timeout: 1500 }), { code: 'ETIMEDOUT' }, 'sito lentissimo fermato');
  assert.ok(Date.now() - t0 < 2500, 'entro il tempo massimo');
  await assert.rejects(richiesta(b + '/storto', op), { code: 'EBADURL' }, 'redirect malformato: rifiuto, non eccezione');
  s80.close();
  console.log('ok  redirect, gzip, limite di 3 MB, 404, HEAD, sito lentissimo, redirect malformato');
} else console.log('--  porta 80 occupata o senza permessi: test del client saltati');

// 4. Controllo HTTPS e apertura del sito: indirizzi e opzioni come i nodi n8n.
const chiamate = [];
const finta = (esito) => async (url, o) => { chiamate.push([url, o]); if (esito instanceof Error) throw esito; return { status: 200, body: esito }; };
const scaduto = Object.assign(new Error('certificate has expired'), { code: 'CERT_HAS_EXPIRED' });
assert.deepEqual(await controlloHttps({ domain: 'a.it', website: 'https://www.a.it/' }, finta('')), { eseguito: true });
const h = await controlloHttps({ domain: 'a.it', website: 'http://a.it' }, finta(scaduto));
assert.equal(h.error.cause.message, 'certificate has expired');
assert.equal(await apriSito({ domain: 'a.it', website: 'http://www.a.it' }, finta('<html/>')), '<html/>');
assert.equal(await apriSito({ domain: 'a.it', website: 'https://a.it' }, finta(scaduto)), '');
assert.deepEqual(chiamate.map(([u, o]) => [u, o.method || 'GET', Boolean(o.insicuro), o.redirect]), [
  ['https://www.a.it/', 'HEAD', false, 3], ['https://a.it/', 'HEAD', false, 3], ['http://www.a.it/', 'GET', true, 5], ['https://a.it/', 'GET', true, 5]]);
const r = regole.controlliSito({ html: '', website: 'http://a.it', oggi, richiesti: ['no_https'], https: h });
assert.equal(r.esiti.no_https.status, 'pass'); assert.equal(r.esiti.no_https.evidence.detail, 'Certificato HTTPS scaduto');
console.log('ok  controllo HTTPS e apertura del sito come in n8n');

// 5. Parallelo: tutti gli elementi, nell'ordine, al massimo n insieme.
let insieme = 0, massimo = 0;
const esiti = await inParallelo([1, 2, 3, 4, 5, 6, 7], 3, async (x) => { insieme++; massimo = Math.max(massimo, insieme); await new Promise(r => setTimeout(r, 5)); insieme--; return x * 2; });
assert.deepEqual(esiti, [2, 4, 6, 8, 10, 12, 14]); assert.ok(massimo <= 3);
console.log('ok  parallelo');
// 6. Contatti: pagine scelte come il motore, modulo, email del dominio, pagine lette.
const casa = `<html><body>${'<p>Testo della homepage di prova con un po di contenuto. </p>'.repeat(20)}
  <a href="/contatti">Contatti</a><a href="https://www.ditta.it/privacy-policy">Privacy</a><a href="/chi-siamo">Chi siamo</a>
  <a href="/blog/contatti-vecchi">Blog</a><a href="https://altro.it/contatti">Altro</a><a href="/catalogo.pdf">Catalogo</a>
  <a href="http://ditta.it:8080/contatti">Porta</a><a href="mailto:info@ditta.it">Scrivici</a></body></html>`;
assert.deepEqual(pagineDaAprire(casa, 'https://www.ditta.it/', 'ditta.it'),
  ['https://www.ditta.it/contatti', 'https://www.ditta.it/privacy-policy', 'https://www.ditta.it/chi-siamo'], 'contatti, legale, chi siamo; niente blog, altri siti, pdf, porte');
assert.deepEqual(pagineDaAprire('<html><body><div id="app"></div></body></html>'.padEnd(600, ' '), 'https://ditta.it/', 'ditta.it'),
  ['https://ditta.it/contatti', 'https://ditta.it/chi-siamo', 'https://ditta.it/privacy-policy'], 'senza link: percorsi tipici');
assert.ok(haModulo('<form><input type="email" name="email"><textarea name="msg"></textarea></form>'), 'modulo');
assert.ok(!haModulo('<form role="search"><input type="email"><textarea></textarea></form>'), 'ricerca: non è un modulo');
assert.ok(!haModulo('<form><input type="text" name="q"></form>'), 'senza messaggio: non è un modulo');
const lungo = (x) => `<html><body>${'<p>contenuto della pagina di prova abbastanza lungo. </p>'.repeat(12)}${x}</body></html>`;
const sito = {
  'https://www.ditta.it/': casa,
  'https://www.ditta.it/contatti': lungo('<form><input type="email" name="email"><textarea name="m"></textarea></form><p>Scrivi a mario.rossi@gmail.com</p>'),
  'https://www.ditta.it/privacy-policy': lungo('<p>Titolare: Ditta srl, info@ditta.it</p>'),
  'https://www.ditta.it/chi-siamo': lungo('<p>Chi siamo</p>'),
};
const reqFinta = async (url) => { if (!(url in sito)) throw new Error('404'); return { status: 200, body: sito[url] }; };
const trovati = await trovaContatti(regole, { domain: 'ditta.it', website: 'https://www.ditta.it/' }, reqFinta);
assert.deepEqual(trovati, { domain: 'ditta.it', email: 'info@ditta.it', contact_form: 'https://www.ditta.it/contatti', pages_read: 4 },
  'email del dominio dalla privacy (non la gmail), modulo dalla pagina contatti');
const spento = await trovaContatti(regole, { domain: 'spento.it', website: 'https://spento.it' }, async () => { throw new Error('ECONNREFUSED'); });
assert.deepEqual(spento, { domain: 'spento.it', pages_read: 0 }, 'sito spento: nessuna pagina letta');
// Pagine 404 o anti-bot: non contano come lette e il modulo del piè di pagina non diventa un indirizzo (Code Reviewer).
const conErrore = await trovaContatti(regole, { domain: 'ditta.it', website: 'https://www.ditta.it/' },
  async (url) => ({ status: url === 'https://www.ditta.it/' ? 200 : 404, body: url === 'https://www.ditta.it/' ? casa : sito['https://www.ditta.it/contatti'] }));
assert.deepEqual(conErrore, { domain: 'ditta.it', email: 'info@ditta.it', pages_read: 1 }, '404: solo la homepage letta, niente modulo');
// Pagine ostili: niente regex quadratiche (prima minuti con 3 MB).
let t0 = Date.now();
haModulo('<form <textarea '.repeat(200_000));
pagineDaAprire('<meta http-equiv=refresh content="0; '.repeat(80_000), 'https://ditta.it/', 'ditta.it');
assert.ok(Date.now() - t0 < 2000, `pagine ostili lette in ${Date.now() - t0} ms`);
// Pagina contatti che rimanda a un altro sito: si salva l'indirizzo finale (poi scartato dal database), non /contatti (QA).
const altrove = await trovaContatti(regole, { domain: 'ditta.it', website: 'https://www.ditta.it/' },
  async (url) => url === 'https://www.ditta.it/contatti'
    ? { status: 200, url: 'https://moduli.esempio.com/ditta', body: sito[url] }
    : { status: 200, url, body: sito[url] || casa });
assert.equal(altrove.contact_form, 'https://moduli.esempio.com/ditta', 'modulo su un altro sito: indirizzo finale');
// Homepage corta (sito in JavaScript): si provano i percorsi tipici (QA).
const corta = await trovaContatti(regole, { domain: 'ditta.it', website: 'https://ditta.it/' },
  async (url) => ({ status: 200, url, body: url === 'https://ditta.it/' ? '<div id="app"></div>' : url === 'https://ditta.it/contatti' ? sito['https://www.ditta.it/privacy-policy'] : '' }));
assert.equal(corta.email, 'info@ditta.it', 'homepage corta: percorsi tipici provati');
console.log('ok  contatti: pagine, modulo, email del dominio, sito spento, 404, pagine ostili, redirect, homepage corta');

// 7. Popolamento OSM (punto 87): righe come le scrive «osmium export -f geojsonseq -a type,id».
const osm = caricaOsm();
const f = filtri(osm);
assert.ok(f.includes('nwr/office') && f.includes('nwr/man_made=works') && f.some(x => x.startsWith('nwr/amenity=') && x.includes('restaurant') && !x.includes('bench')), 'filtri di osmium');
const quadrato = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const confini = [
  JSON.stringify({ type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: [[quadrato(10.8, 44.4, 11.2, 44.8), quadrato(11.0, 44.7, 11.1, 44.75)]] }, properties: { 'ISO3166-2': 'IT-MO', name: 'Modena' } }),
  '\x1e' + JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [quadrato(11.2, 44.4, 11.6, 44.8)] }, properties: { 'ISO3166-2': 'IT-BO' } }),
  JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [quadrato(0, 0, 1, 1)] }, properties: { 'ISO3166-2': 'IT-45' } }),
  JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [quadrato(0, 0, 1, 1)] }, properties: { 'ISO3166-2': 'FR-NI' } }),
  'non json',
];
const province = await caricaProvince(confini);
assert.deepEqual(province.map(p => p.sigla), ['MO', 'BO'], 'solo le province italiane note');
assert.ok(dentro(province[0], [10.9, 44.6]) && !dentro(province[0], [11.05, 44.72]) && !dentro(province[0], [11.3, 44.6]), 'dentro, nel buco, fuori');
assert.deepEqual(puntoDi({ type: 'MultiPolygon', coordinates: [[quadrato(11, 44.5, 11.02, 44.52)]] }).map(v => +v.toFixed(6)), [11.01, 44.51]);
assert.equal(semplifica([[0, 0], [1, 0.00001], [2, 0], [3, 0.00001], [4, 0], [4, 4], [0, 0]]).length, 4, 'confini semplificati');
const attivita = (id, geometry, props) => JSON.stringify({ type: 'Feature', geometry, properties: { '@type': 'node', '@id': id, ...props } });
const punto = (x, y) => ({ type: 'Point', coordinates: [x, y] });
const righe = [
  attivita(1, punto(10.9, 44.6), { office: 'lawyer', name: 'Studio Bianchi', website: 'https://studiobianchi.it' }),
  attivita(2, punto(11.3, 44.5), { shop: 'clothes', name: 'Moda Bologna', 'contact:website': 'modabologna.it' }),
  attivita(3, punto(10.0, 46.0), { shop: 'clothes', name: 'Fuori dai confini', website: 'https://fuori.it' }),
  attivita(4, punto(10.0, 46.0), { craft: 'carpenter', name: 'Falegname', website: 'https://falegname.it', 'addr:province': 'PR' }),
  attivita(5, punto(10.9, 44.6), { craft: 'carpenter', name: 'Falegname senza sito' }),
  attivita(6, punto(10.9, 44.6), { entrance: 'main', website: 'https://ingresso.it' }),
  attivita(7, { type: 'MultiPolygon', coordinates: [[quadrato(11, 44.5, 11.02, 44.52)]] }, { '@type': 'way', man_made: 'works', name: 'Fonderia', website: 'fonderia.it' }),
  ...[8, 9, 10].map(i => attivita(i, punto(11.3 + (i - 8) / 10, 44.5), { shop: 'clothes', name: `Catena ${i}`, website: 'https://catena.it' })),
  attivita(11, punto(11.05, 44.72), { office: 'it', name: 'Nel buco', website: 'https://buco.it' }),
  // La stessa fabbrica tre volte (area, edificio, ufficio): un punto solo, non una catena (Code Reviewer).
  attivita(12, punto(10.95, 44.55), { industrial: 'factory', name: 'Ceramiche Sole', website: 'https://ceramichesole.it' }),
  attivita(13, punto(10.951, 44.551), { man_made: 'works', name: 'Ceramiche Sole', website: 'http://www.ceramichesole.it/' }),
  attivita(14, punto(10.952, 44.5505), { office: 'company', name: 'Ceramiche Sole spa', website: 'ceramichesole.it' }),
  // Ristorante in una torre: resta un ristorante.
  attivita(15, punto(10.9, 44.6), { man_made: 'tower', amenity: 'restaurant', name: 'Ristorante La Torre', website: 'https://latorre.it' }),
  '{rotta',
];
async function* comeFile(r) { for (const x of r) yield x; }
const letto = await leggiAttivita(comeFile(righe), osm, province);
assert.deepEqual([...letto.gruppi.keys()].sort(), ['BO', 'MO', 'PR'], 'provincia dai confini o dall\'indirizzo');
assert.deepEqual([letto.stats.fuori, letto.stats.senza_sito_con_nome, letto.stats.illeggibili, letto.stats.stesso_posto], [2, 1, 1, 2], 'fuori (anche nel buco), senza sito, riga rotta, stesso posto');
const [blocco] = normalizza(osm, letto.gruppi);
assert.deepEqual(blocco.companies.map(c => [c.domain, c.province, c.region, c.industry]).sort(), [
  ['ceramichesole.it', 'Modena', 'Emilia-Romagna', 'Produzione industriale'],
  ['falegname.it', 'Parma', 'Emilia-Romagna', 'Falegnameria'],
  ['fonderia.it', 'Modena', 'Emilia-Romagna', 'Produzione industriale'],
  ['latorre.it', 'Modena', 'Emilia-Romagna', 'Ristorante'],
  ['modabologna.it', 'Bologna', 'Emilia-Romagna', 'Abbigliamento'],
  ['studiobianchi.it', 'Modena', 'Emilia-Romagna', 'Studio legale'],
], 'regole del nodo n8n: catene escluse, settori, province');
console.log('ok  popolamento OSM: filtri, confini, province, regole del nodo n8n');

console.log('\nTest del worker superati.');
