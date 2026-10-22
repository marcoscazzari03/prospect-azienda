// Richieste ai siti delle aziende per il worker del controllo siti (VPS, 22/10). Stesso comportamento dei nodi HTTP del
// workflow n8n «Aziende | Controllo siti»: redirect seguiti, risposta letta anche con 4xx/5xx, pagine compresse aperte.
// In più, perché gira su un server nostro: niente indirizzi interni (127.0.0.1, reti private, metadati del cloud), anche
// dopo un redirect, e al massimo MAX_BYTES letti per pagina.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';

export const MAX_BYTES = 3_000_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

// Indirizzi che un sito pubblico non può avere: si rifiutano prima di connettersi.
export function privato(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privato(x.slice(7));
  return x === '::' || x === '::1' || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff');
}

// dns.lookup con il controllo sugli indirizzi; regge sia la forma con un indirizzo sia quella con `all`.
// `privatiAmmessi` serve solo ai test locali (worker/test.mjs).
const lookupPubblico = (privatiAmmessi) => (host, options, callback) => {
  dns.lookup(host, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const buoni = addresses.filter(a => privatiAmmessi || !privato(a.address));
    if (!buoni.length) {
      const e = new Error(`indirizzo non pubblico per ${host}`);
      e.code = 'EPRIVATE';
      return callback(e);
    }
    if (options && options.all) return callback(null, buoni);
    return callback(null, buoni[0].address, buoni[0].family);
  });
};

function decomprimi(res) {
  const enc = String(res.headers['content-encoding'] || '').toLowerCase();
  if (enc.includes('br')) return res.pipe(zlib.createBrotliDecompress());
  if (enc.includes('gzip')) return res.pipe(zlib.createGunzip());
  if (enc.includes('deflate')) return res.pipe(zlib.createInflate());
  return res;
}

// Una richiesta con i redirect. Esito: { status, body, url } oppure un'eccezione con .code e .message di Node
// (gli stessi testi che vede n8n: «certificate has expired», «Hostname/IP does not match certificate's altnames: …»).
export function richiesta(url, { method = 'GET', insicuro = false, redirect = 5, timeout = 10_000, maxBytes = MAX_BYTES, privatiAmmessi = false } = {}) {
  return new Promise((resolve, reject) => {
    const scadenza = Date.now() + timeout;
    const vai = (indirizzo, rimasti) => {
      let u;
      try { u = new URL(indirizzo); } catch { return reject(Object.assign(new Error(`indirizzo non valido: ${indirizzo}`), { code: 'EBADURL' })); }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return reject(Object.assign(new Error('protocollo non ammesso'), { code: 'EPROTOCOL' }));
      if (u.port && !['80', '443'].includes(u.port)) return reject(Object.assign(new Error('porta non ammessa'), { code: 'EPORT' }));
      if (!privatiAmmessi && net.isIP(u.hostname.replace(/^\[|\]$/g, ''))) return reject(Object.assign(new Error('indirizzo IP non ammesso'), { code: 'EPRIVATE' }));
      const resto = scadenza - Date.now();
      if (resto <= 0) return reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.request(u, {
        method,
        lookup: lookupPubblico(privatiAmmessi),
        rejectUnauthorized: !insicuro,
        servername: u.hostname,
        timeout: resto,
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      }, (res) => {
        const dove = res.headers.location;
        if (res.statusCode >= 300 && res.statusCode < 400 && dove) {
          res.resume();
          if (rimasti <= 0) return reject(Object.assign(new Error('troppi redirect'), { code: 'EREDIRECT' }));
          return vai(new URL(dove, u).toString(), rimasti - 1);
        }
        if (method === 'HEAD') { res.resume(); return resolve({ status: res.statusCode, body: '', url: u.toString() }); }
        const pezzi = [];
        let letti = 0;
        let finito = false;
        const flusso = decomprimi(res);
        const chiudi = () => {
          if (finito) return;
          finito = true;
          resolve({ status: res.statusCode, body: Buffer.concat(pezzi).toString('utf8'), url: u.toString() });
        };
        flusso.on('data', (c) => {
          if (finito) return;
          const spazio = maxBytes - letti;
          pezzi.push(c.length > spazio ? c.subarray(0, spazio) : c);
          letti += Math.min(c.length, spazio);
          if (letti >= maxBytes) { chiudi(); res.destroy(); }
        });
        flusso.on('end', chiudi);
        flusso.on('error', (e) => { if (!finito) { finito = true; reject(e); } });
        res.on('error', (e) => { if (!finito) { finito = true; reject(e); } });
      });
      req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
      req.on('error', reject);
      req.end();
    };
    vai(url, redirect);
  });
}

// Errore nel formato che si aspetta controlliSito (lo stesso di n8n: messaggio vero in cause.message e description).
export const comeErroreN8n = (e) => ({
  error: { message: String(e?.message || e), code: e?.code, cause: { message: String(e?.message || e) } },
  details: { description: String(e?.message || e) },
});
