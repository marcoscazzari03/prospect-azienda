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

// Indirizzi che un sito pubblico non può avere: si rifiutano prima di connettersi. IPv6 che incapsulano un IPv4 (NAT64,
// 6to4, Teredo) bloccati per intero (Code Reviewer, 22/10).
export function privato(ip) {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2))
      || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)
      || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privato(x.slice(7));
  return x === '::' || x === '::1' || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith('ff')
    || x.startsWith('64:ff9b:') || x.startsWith('2002:') || /^2001:0?:/.test(x) || x.startsWith('2001:db8:');
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
// `timeout` vale per tutta la richiesta, redirect e lettura compresi: un sito che manda un byte al secondo non tiene
// occupata una corsia (Code Reviewer, 22/10). Ogni errore, anche un redirect verso un indirizzo malformato, diventa un
// rifiuto e mai un'eccezione che ferma il giro.
const errore = (message, code) => Object.assign(new Error(message), { code });

export function richiesta(url, { method = 'GET', insicuro = false, redirect = 5, timeout = 10_000, maxBytes = MAX_BYTES, privatiAmmessi = false } = {}) {
  return new Promise((resolve, reject) => {
    let chiuso = false;
    let attuale = null; // richiesta in corso, da distruggere allo scadere
    const fine = (fn, valore) => {
      if (chiuso) return;
      chiuso = true;
      clearTimeout(orologio);
      if (attuale) attuale.destroy();
      fn(valore);
    };
    const orologio = setTimeout(() => fine(reject, errore('timeout', 'ETIMEDOUT')), timeout);
    const partenza = Date.now();
    const vai = (indirizzo, rimasti) => {
      if (chiuso) return;
      let u;
      try { u = new URL(indirizzo); } catch { return fine(reject, errore(`indirizzo non valido: ${indirizzo}`, 'EBADURL')); }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return fine(reject, errore('protocollo non ammesso', 'EPROTOCOL'));
      if (u.port && !['80', '443'].includes(u.port)) return fine(reject, errore('porta non ammessa', 'EPORT'));
      if (!privatiAmmessi && net.isIP(u.hostname.replace(/^\[|\]$/g, ''))) return fine(reject, errore('indirizzo IP non ammesso', 'EPRIVATE'));
      const mod = u.protocol === 'https:' ? https : http;
      let req;
      try {
        req = mod.request(u, {
          method,
          lookup: lookupPubblico(privatiAmmessi),
          rejectUnauthorized: !insicuro,
          servername: net.isIP(u.hostname) ? undefined : u.hostname,
          headers: {
            'User-Agent': UA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'it,en;q=0.8',
            // Senza deflate: alcuni server lo mandano «grezzo» e la pagina risulterebbe vuota (Code Reviewer, 22/10).
            'Accept-Encoding': 'gzip, br',
          },
        }, (res) => {
          try {
            const dove = res.headers.location;
            if (res.statusCode >= 300 && res.statusCode < 400 && dove) {
              res.resume();
              if (rimasti <= 0) return fine(reject, errore('troppi redirect', 'EREDIRECT'));
              let prossimo;
              try { prossimo = new URL(dove, u).toString(); } catch { return fine(reject, errore('redirect non valido', 'EBADURL')); }
              return vai(prossimo, rimasti - 1);
            }
            // Tempo fino alle intestazioni della risposta finale (redirect compresi) e certificato del sito, per i segnali
            // misurati solo dal VPS (punto 91): sito lento e certificato in scadenza.
            const ms = Date.now() - partenza;
            let cert;
            try {
              const c = u.protocol === 'https:' && typeof res.socket?.getPeerCertificate === 'function' ? res.socket.getPeerCertificate() : null;
              if (c?.valid_to) cert = { scade: new Date(c.valid_to).toISOString(), emittente: String(c.issuer?.O || c.issuer?.CN || '').slice(0, 80) };
            } catch { cert = undefined; }
            if (method === 'HEAD') { res.resume(); return fine(resolve, { status: res.statusCode, body: '', url: u.toString(), ms, cert }); }
            const pezzi = [];
            let letti = 0;
            const flusso = decomprimi(res);
            const leggi = () => fine(resolve, { status: res.statusCode, body: Buffer.concat(pezzi).toString('utf8'), url: u.toString(), ms, cert });
            flusso.on('data', (c) => {
              if (chiuso) return;
              const spazio = maxBytes - letti;
              pezzi.push(c.length > spazio ? c.subarray(0, spazio) : c);
              letti += Math.min(c.length, spazio);
              if (letti >= maxBytes) leggi();
            });
            flusso.on('end', leggi);
            flusso.on('error', (e) => fine(reject, e));
            res.on('error', (e) => fine(reject, e));
          } catch (e) {
            fine(reject, e);
          }
        });
      } catch (e) {
        return fine(reject, e);
      }
      attuale = req;
      req.on('error', (e) => fine(reject, e));
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
