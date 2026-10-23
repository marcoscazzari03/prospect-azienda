// Test del worker del controllo siti, senza rete esterna. Uso: node worker/test.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codice } from '../n8n/annunci/build.mjs';
import { caricaRegole, valuta, controlloHttps, apriSito, inParallelo, segnaliVps } from './site-checks.mjs';
import { richiesta, privato } from './http.mjs';
import { pagineDaAprire, haModulo, trovaContatti } from './contacts.mjs';
import { caricaRegoleSiti, luogoSullaPagina, cercaSito, daProvare, dominioDaScartare } from './siti-osm.mjs';
import { pivaDaPagina, testoDi } from './piva.mjs';
import { dominioDaRiga, pivaValida, trovaPiva, trovaLuogo, trovaNome, analizzaPagina, schedaDi, senzaDoppioni, daProvare as daProvareCc, classifica, apriHomepage } from './cc.mjs';
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
  JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [quadrato(7, 45.5, 7.5, 46)] }, properties: { 'ISO3166-2': 'IT-23' } }),
  JSON.stringify({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [quadrato(0, 0, 1, 1)] }, properties: { 'ISO3166-2': 'FR-NI' } }),
  'non json',
];
const province = await caricaProvince(confini);
assert.deepEqual(province.map(p => p.sigla), ['MO', 'BO', 'AO'], 'solo le province italiane note, Aosta dalla regione');
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
  // Ufficio senza nome e poi l'area con il nome, stesso sito: l'azienda resta (QA).
  attivita(16, punto(10.85, 44.45), { office: 'company', website: 'https://acme.it' }),
  attivita(17, punto(10.851, 44.451), { industrial: 'factory', name: 'Acme Srl', website: 'https://acme.it' }),
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
  ['acme.it', 'Modena', 'Emilia-Romagna', 'Produzione industriale'],
  ['ceramichesole.it', 'Modena', 'Emilia-Romagna', 'Produzione industriale'],
  ['falegname.it', 'Parma', 'Emilia-Romagna', 'Falegnameria'],
  ['fonderia.it', 'Modena', 'Emilia-Romagna', 'Produzione industriale'],
  ['latorre.it', 'Modena', 'Emilia-Romagna', 'Ristorante'],
  ['modabologna.it', 'Bologna', 'Emilia-Romagna', 'Abbigliamento'],
  ['studiobianchi.it', 'Modena', 'Emilia-Romagna', 'Studio legale'],
], 'regole del nodo n8n: catene escluse, settori, province');
console.log('ok  popolamento OSM: filtri, confini, province, regole del nodo n8n');

// 8. Siti delle attività OSM senza sito (punto 88).
const senza = [];
await leggiAttivita(comeFile(righe), osm, province, { senzaSito: senza });
assert.deepEqual(senza.map(a => [a.chiave, a.nome, a.sigla, a.tipo]), [['node/5', 'Falegname senza sito', 'MO', 'craft']], 'attività senza sito con nome e provincia');
const regoleSiti = caricaRegoleSiti();
const pagina = (titolo, corpo) => `<html><head><title>${titolo}</title></head><body>${corpo}${' '.repeat(600)}</body></html>`;
const web = {
  'https://falegnameriarossi.it': pagina('Falegnameria Rossi', 'Mobili su misura. Via Emilia 3, Carpi (MO). P.IVA 01234567890'),
  'https://barcentrale.it': pagina('Bar Centrale', 'Il bar in piazza a Torino'),
  'https://sonnosereno.it': pagina('Domain for sale', 'buy this domain'),
};
web['https://hotel.com'] = pagina('Hotel Bellavista Milano - prenota', 'Hotel Bellavista, Milano: le migliori offerte');
web['https://scheda.it'] = pagina('Officine Gialli', 'Officine Gialli, Modena');
const rimandi = { 'https://officinegialli.it': 'https://www.paginegialle.it/officine-gialli' };
const reqWeb = async (url) => {
  if (rimandi[url]) return { status: 200, url: rimandi[url], body: web['https://scheda.it'] };
  if (!(url in web)) throw Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' });
  return { status: 200, url, body: web[url] };
};
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/1', nome: 'Falegnameria Rossi', citta: 'Carpi' }, 'Modena', reqWeb), 'falegnameriarossi.it', 'nome e città sulla pagina');
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/2', nome: 'Falegnameria Rossi', citta: '' }, 'Modena', reqWeb), '', 'senza città: serve la provincia sulla pagina (qui solo «MO»)');
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/3', nome: 'Bar Centrale', citta: 'Bologna' }, 'Bologna', reqWeb), '', 'omonimo in un\'altra città');
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/4', nome: 'Sonno Sereno', citta: 'Modena' }, 'Modena', reqWeb), '', 'dominio in vendita');
assert.ok(luogoSullaPagina('<p>Sede a Forlì</p>', '', 'Forlì-Cesena') && luogoSullaPagina('<p>Monza</p>', '', 'Monza e Brianza') && !luogoSullaPagina('<p>MO</p>', '', 'Modena'));
// Revisione: niente domini-categoria, niente rimandi a portali, niente vie con il nome della città, province-parole.
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/5', nome: 'Hotel Bellavista', citta: 'Milano' }, 'Milano', reqWeb), '', 'hotel.com non è il sito di Hotel Bellavista');
assert.ok(dominioDaScartare('farmacia.it', 'Farmacia Rossi') && !dominioDaScartare('farmaciarossi.it', 'Farmacia Rossi') && !dominioDaScartare('bellavista.it', 'Bellavista'));
assert.equal(await cercaSito(regoleSiti, { chiave: 'node/6', nome: 'Officine Gialli', citta: 'Modena' }, 'Modena', reqWeb), '', 'rimando a un portale');
assert.ok(!luogoSullaPagina('<p>Via Roma 12, Lodi</p>', 'Casalpusterlengo', 'Roma'), 'via Roma non è Roma, e con la città la provincia non conta');
assert.ok(!luogoSullaPagina('<p>Un prato fiorito</p>', '', 'Prato') && luogoSullaPagina('<p>Sede: Roma, via Milano 3</p>', 'Roma', 'Roma'));
const elencoSiti = [
  ...['Bar Sport', 'Bar Sport', 'Bar Sport', 'Bar Sport'].map((nome, i) => ({ chiave: `n/${i}`, nome, tipo: 'amenity' })),
  { chiave: 'n/10', nome: 'Hotel Uno', tipo: 'tourism' }, { chiave: 'n/11', nome: 'Officine Bianchi', tipo: 'industrial' },
  { chiave: 'n/12', nome: 'Studio Verdi', tipo: 'office' }, { chiave: 'n/13', nome: 'Studio Neri', tipo: 'office' },
];
const provateSiti = new Map([['n/13', Date.parse('2026-10-01')], ['n/10', Date.parse('2026-01-01')]]);
assert.deepEqual(daProvare(elencoSiti, provateSiti, 10, Date.parse('2026-10-22')).map(a => a.chiave), ['n/12', 'n/11', 'n/10'],
  'uffici e manifattura prima, nomi comuni esclusi, riprova dopo 180 giorni');
console.log('ok  siti delle attività OSM: domini dal nome, verifica, luogo, priorità');

// 9. Segnali misurati solo dal VPS (punto 91): certificato in scadenza e sito lento.
const adesso = Date.parse('2026-10-23T12:00:00Z');
const cert = (giorni) => ({ eseguito: true, cert: { scade: new Date(adesso + giorni * 86_400_000).toISOString(), emittente: "Let's Encrypt" } });
const stato = (h, ms, letto = true, extra = {}) => segnaliVps({ dominio: 'a.it', https: h, ms, url: 'https://www.a.it/', status: 200, letto, adesso, ...extra }).map(c => c.status);
assert.deepEqual(stato(cert(10), 5000), ['pass', 'pass'], 'scade fra 10 giorni, homepage in 5 s');
assert.deepEqual(stato(cert(14.5), 4000), ['pass', 'pass'], 'soglie comprese: 14 giorni e 4 s');
assert.deepEqual(stato(cert(45), 800), ['fail', 'fail'], 'certificato lontano, homepage veloce');
assert.deepEqual(stato(cert(25), 2500), ['fail', 'undetermined'], 'Let\'s Encrypt nella finestra di rinnovo: niente segnale; 2,5 s: dubbio');
assert.deepEqual(stato(cert(-2), 5000, false), ['undetermined', 'undetermined'], 'già scaduto (è «senza HTTPS») e pagina non letta');
assert.deepEqual(stato({ eseguito: true, error: { message: 'x' }, cert: cert(5).cert }, undefined), ['undetermined', 'undetermined'], 'HTTPS in errore, tempo mancante');
// Redirect verso un altro dominio: certificato e tempo non sono dell'azienda. Pagina d'errore lenta: non è «sito lento».
assert.deepEqual(stato({ ...cert(5), url: 'https://www.gruppo.com/' }, 6000, true, { url: 'https://gruppo.com/home' }), ['undetermined', 'undetermined'], 'redirect verso un altro dominio');
assert.deepEqual(stato({ ...cert(5), url: 'https://a.it/' }, 6000, true, { status: 503 }), ['pass', 'undetermined'], 'pagina 503 lenta: solo il certificato');
const [cScad, cLento] = segnaliVps({ dominio: 'a.it', https: cert(6), ms: 6200, url: 'https://a.it/', status: 200, letto: true, adesso });
assert.match(cScad.evidence.detail, /scade il .* \(fra 6 giorni\)/);
assert.equal(cScad.evidence.issuer, "Let's Encrypt");
assert.equal(cLento.evidence.detail, 'La homepage ha risposto in 6,2 secondi');
const misura = {};
await apriSito({ domain: 'a.it', website: 'https://a.it' }, async () => ({ status: 200, body: '<html/>', ms: 1234, url: 'https://a.it/' }), misura);
assert.deepEqual(misura, { ms: 1234, url: 'https://a.it/', status: 200 }, 'tempo, indirizzo finale e stato passati al segnale');
assert.deepEqual(await controlloHttps({ domain: 'a.it', website: 'https://a.it' }, async () => ({ status: 200, body: '', cert: { scade: '2026-11-01T00:00:00.000Z', emittente: 'R11' } })),
  { eseguito: true, cert: { scade: '2026-11-01T00:00:00.000Z', emittente: 'R11' }, url: undefined }, 'certificato dal controllo HTTPS');
console.log('ok  segnali del VPS: certificato in scadenza (14 giorni), sito lento (4 s), casi dubbi non determinabili');

// 10. Aziende da Common Crawl (punto 92): elenco dei domini, partita IVA, luogo, nome, doppioni, settore.
{
assert.equal(dominioDaRiga('94367200\tit.rossimobili\t2'), 'rossimobili.it');
assert.deepEqual(['1\tit.comune.modena\t1', '2\tit.abruzzo.alberghi\t1', '3\tfr.rossi\t1', '4\tit.xn--forl-cesena-fcb\t1', '5\tit.-ab\t1'].map(dominioDaRiga), ['', '', '', '', ''],
  'solo .it di secondo livello, niente domini geografici, IDN o non validi');
assert.ok(pivaValida('02023170042') && pivaValida('04304320619'), 'partite IVA vere del campione');
assert.ok(!pivaValida('02023170043') && !pivaValida('00000000000') && !pivaValida('0202317004'), 'cifra di controllo, zeri, lunghezza');
assert.ok(!pivaValida('94000410178') && !pivaValida('92078070601'), 'codici fiscali di associazioni ed enti (8 e 9): fuori');
assert.equal(trovaPiva('© 2026 Rossi Srl · P.IVA 02023170042 · Privacy')?.piva, '02023170042');
assert.equal(trovaPiva('Partita Iva: IT04304320619')?.piva, '04304320619', 'prefisso IT');
assert.equal(trovaPiva('Ordine n. 02023170042 spedito'), null, 'undici cifre senza etichetta: non è una partita IVA');
assert.equal(trovaPiva('Sito realizzato da Agenzia Web Srl P.IVA 02023170042'), null, 'partita IVA della web agency nei crediti');
assert.equal(trovaPiva('Rossi Srl P.IVA 02023170043 - Realizzato da Web Srl P.IVA 04304320619'), null, 'prima non valida, poi solo quella dei crediti');
const luogoCc = (t, v = 0) => { const l = trovaLuogo(t, v); return l ? `${l.citta} ${l.sigla}` : null; };
assert.equal(luogoCc('Via Emilia 1, 41121 Modena (MO)'), 'Modena MO');
assert.equal(luogoCc('VIA ROMA 2 · 20121 MILANO MI · Tel 02'), 'Milano MI', 'maiuscole e sigla staccata: non «Mila NO»');
assert.equal(luogoCc('28053 CASTELLETTO SOPRA TICINO ( NO )'), 'Castelletto sopra Ticino NO');
assert.equal(luogoCc('via Variopinto 6, 80077 Ischia (Na) Partita Iva'), 'Ischia NA', 'sigla minuscola tra parentesi');
assert.equal(luogoCc('Via Campidoglio 129, Ceprano ( Fr ) 03012'), 'Ceprano FR', 'città prima del CAP');
assert.equal(luogoCc('Acireale 95024 (CT)'), 'Acireale CT');
assert.equal(luogoCc('Sede: 00187 Roma'), 'Roma RM', 'capoluogo senza sigla');
assert.equal(luogoCc('00187 Pippo'), null, 'senza sigla e non capoluogo: niente');
assert.equal(luogoCc('Filiale 40121 Bologna (BO) ........................ Sede 41121 Modena (MO) P.IVA', 70), 'Modena MO', 'il più vicino alla partita IVA');
assert.equal(luogoCc('31029 P. IVA 02023170042'), null, '«P. IVA» non è una città');
const nomeCc = (h, d, t = '', dove = -1) => trovaNome(h, t, d, dove);
assert.equal(nomeCc('<meta property="og:site_name" content="Rossi Mobili">', 'rossimobili.it'), 'Rossi Mobili');
assert.equal(nomeCc('<title>Home | Hotel Pierre Riccione</title>', 'hotelpierrericcione.it'), 'Hotel Pierre Riccione');
assert.equal(nomeCc('<title>CTA Kennedy: Home</title>', 'ctakennedy.it'), 'CTA Kennedy');
assert.equal(nomeCc('<title>Benvenuti su lachorus!</title>', 'lachorus.it'), 'lachorus');
assert.equal(nomeCc('<title>Caldaie e impianti</title>', 'xyz.it', 'Copyright 2026 Termo Bianchi S.r.l. P.IVA 02023170042', 45), 'Termo Bianchi S.r.l.', 'ragione sociale vicino alla partita IVA');
assert.equal(nomeCc('', 'rossi-mobili.it'), 'Rossi Mobili', 'infine il dominio');
const paginaCc = (corpo, testa = '<title>Rossi Mobili | Arredi su misura</title><meta name="description" content="Mobili su misura per negozi e uffici">') =>
  `<html><head>${testa}</head><body><nav>Menu</nav><h1>Arredi su misura</h1><p>${'Testo della pagina. '.repeat(30)}</p><footer>${corpo}</footer></body></html>`;
const az = analizzaPagina(paginaCc('Rossi Mobili Srl - Via Emilia 1, 41121 Modena (MO) - P.IVA 02023170042'), 'rossimobili.it');
assert.deepEqual({ piva: az.piva, nome: az.nome, citta: az.citta, provincia: az.provincia, regione: az.regione }, { piva: '02023170042', nome: 'Rossi Mobili', citta: 'Modena', provincia: 'Modena', regione: 'Emilia-Romagna' });
assert.match(az.scheda, /^Titolo: Rossi Mobili \| Arredi su misura\nDescrizione: Mobili su misura per negozi e uffici\nIntestazioni: Arredi su misura\nTesto: /);
assert.ok(!az.scheda.includes('Menu'), 'scheda senza menu, come il nodo 07');
assert.equal(analizzaPagina(paginaCc('P.IVA 02023170042', '<title>Questo dominio è in vendita</title>').replace('Testo della pagina', 'Questo dominio è in vendita'), 'x.it'), null, 'dominio in vendita');
assert.equal(analizzaPagina(paginaCc('Nessun dato fiscale'), 'x.it'), null, 'senza partita IVA');
assert.equal(analizzaPagina('<p>P.IVA 02023170042</p>', 'x.it'), null, 'pagina troppo corta');
assert.ok(!/[\uD800-\uDFFF]/.test(schedaDi(`<title>Ciao ${'x'.repeat(149)}😀</title>`).replace(/😀/g, '')), 'nessun mezzo emoji nella scheda');
assert.deepEqual(senzaDoppioni([{ dominio: 'b.it', piva: '1' }, { dominio: 'c.it', piva: '1' }, { dominio: 'd.it', piva: '2' }, { dominio: 'e.it', piva: '3' }], new Map([['3', 'z.it']])).map(t => t.dominio),
  ['b.it', 'd.it'], 'stessa partita IVA: il primo dominio, anche dai giri precedenti');
async function* gen(v) { yield* v; }
assert.deepEqual(await daProvareCc(gen(['a.it', 'b.it', '', 'c.it', 'd.it']), new Map([['a.it', Date.parse('2026-10-01')], ['c.it', Date.parse('2025-01-01')]]), 2, Date.parse('2026-10-23')),
  ['b.it', 'c.it'], 'salta i provati nell\'ultimo anno');
// Il sito su un altro dominio (rimando a un portale) non vale; senza https si prova www e poi http.
const vistiCc = [];
const reqFinta = (mappa) => async (url) => { vistiCc.push(url); const r = mappa[url]; if (!r) throw new Error('ENOTFOUND'); return r; };
assert.equal(await apriHomepage('a.it', reqFinta({ 'https://a.it/': { status: 200, url: 'https://www.portale.it/a', body: 'x' } })), null, 'rimando a un altro dominio');
assert.equal((await apriHomepage('b.it', reqFinta({ 'http://b.it/': { status: 200, url: 'http://www.b.it/', body: 'ok' } })))?.html, 'ok', 'solo http');
assert.deepEqual(vistiCc.slice(1), ['https://b.it/', 'https://www.b.it/', 'http://b.it/']);
const chiamate = [];
const postFinta = async (url, o) => {
  const corpo = JSON.parse(o.body);
  chiamate.push({ url, n: corpo.companies.length, segreto: o.headers['x-engine-secret'] });
  if (corpo.companies[0].name === 'Errore') return { ok: false, json: async () => ({}) };
  return { ok: true, json: async () => ({ results: corpo.companies.map((c, i) => ({ industry: i === 1 ? '' : `Settore ${c.name}`, keywords: Array(12).fill('p') })) }) };
};
const trov = [...Array(21).keys()].map(i => ({ nome: `A${i}`, scheda: 'Titolo: x' })).concat([{ nome: 'Errore' }]);
trov.splice(20, 0, trov.pop());
assert.equal(await classifica(trov, 'https://app', 's'.repeat(32), postFinta), 19, '20 + 2 in due lotti; il secondo fallisce; un\'azienda senza settore');
assert.deepEqual(chiamate.map(c => [c.url, c.n]), [['https://app/api/engine/companies-classify', 20], ['https://app/api/engine/companies-classify', 2]]);
assert.equal(trov[0].settore, 'Settore A0');
assert.equal(trov[0].parole.length, 10, 'al massimo 10 parole chiave, come l\'import');
assert.equal(trov[1].settore, undefined);
assert.equal(trovaPiva('Contatto privato 02023170042'), null, '«vat» dentro «privato» non è un\'etichetta');
assert.equal(pivaDaPagina(paginaCc('Rossi Srl P.IVA 02023170042')), '02023170042', 'partita IVA per il controllo siti');
assert.equal(pivaDaPagina('<p>P.IVA 02023170042</p>'), '', 'pagina troppo corta');
assert.equal(testoDi('<p>a</p><script>x</script>b<style>y</style>c<script>z').trim(), 'a · b c', 'script e stili tolti, anche senza chiusura');
// Pagine costruite apposta (1,5 MB): ogni funzione deve restare lineare (il 23/10 una regex impiegava minuti).
const N = 1_500_000;
const riempi = (t) => t.repeat(Math.ceil(N / t.length)).slice(0, N);
for (const [caso, html] of Object.entries({
  maiuscole: 'P.IVA 02023170042 ' + riempi('Parola Grande '), script: riempi('<script '), header: '<p>P.IVA 02023170042</p>' + riempi('<header '),
  meta: riempi('<meta property="og:site_name" content="x" '), minore: riempi('< a '), cifre: riempi('P.IVA 12345678901 '),
  cap: riempi('41121 Modena Modena Modena (MO) P.IVA 02023170042 '), titoli: riempi('<h1 '),
})) {
  const t = performance.now();
  analizzaPagina(html, 'x.it');
  pivaDaPagina(html);
  assert.ok(performance.now() - t < 2_000, `pagina enorme «${caso}»: ${Math.round(performance.now() - t)} ms`);
}
console.log('ok  Common Crawl: domini, partita IVA, luogo, nome, scheda, doppioni, settore');
}

console.log('\nTest del worker superati.');
