// Test locali dei Code node della raccolta annunci, senza n8n.
// Uso: node n8n/annunci/test/run.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codice, scegliSito } from '../build.mjs';

const run = (code, { nodes = {}, input = [], eseguiti = [], json = {}, statico = {} }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) {
      if (eseguiti.includes(name)) return { isExecuted: true };
      throw new Error(`nodo mancante: ${name}`);
    }
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })), isExecuted: true };
  };
  const $input = { all: () => input.map((j, i) => ({ json: j, pairedItem: { item: i } })), first: () => (input.length ? { json: input[0] } : undefined) };
  return new Function('$', '$input', '$execution', '$json', '$getWorkflowStaticData', code)($, $input, { id: 'test', mode: 'test' }, json, () => statico).map(i => i.json);
};

// 1. Richieste: una per titolo del catalogo, ogni 2 giorni gli ultimi 3, a mano 30.
const giorno = run(codice('01-prepara-richieste.js'), { eseguiti: ['Ogni mattina'] });
const termini = giorno.map(r => r.term);
assert.ok(termini.includes('sistemista') && termini.includes('developer') && termini.includes('graphic designer'));
assert.ok(!termini.includes('web developer') && !termini.includes('software developer'), 'titoli già coperti saltati');
assert.ok(giorno.length < 75, `al massimo ~70 ricerche al giorno (${giorno.length})`);
assert.ok(giorno.every(r => r.max_days_old === 3 && r.region === ''), 'tutta Italia');
const mano = run(codice('01-prepara-richieste.js'), {});
assert.ok(mano.every(r => r.max_days_old === 30));

// 2. Normalizzazione
const richieste = [{ family: 'it_systems', region: 'Emilia-Romagna', page: 1 }, { family: 'sales', region: 'Emilia-Romagna', page: 1 }, { family: 'hr', region: 'Emilia-Romagna', page: 1 }];
const ad = (id, title, company, extra = {}) => ({
  id, title, company: { display_name: company }, created: '2026-10-12T08:00:00Z',
  redirect_url: `https://www.adzuna.it/land/ad/${id}`, description: 'Descrizione', location: { area: ['Italia', 'Emilia-Romagna', 'Provincia di Modena', 'Carpi'] },
  contract_time: 'full_time', ...extra
});
const [out, ...altriBlocchi] = run(codice('02-normalizza-annunci.js'), {
  nodes: { 'Prepara richieste': richieste },
  input: [
    { count: 4, results: [
      ad('1', '<strong>Sistemista</strong> Windows Server', 'Meccanica Emiliana Srl'),
      ad('2', 'Sistemista', 'Randstad Italia'),
      ad('3', 'Tecnico IT', 'Studio Rossi', { description: 'Per importante azienda cliente cerchiamo tecnico' }),
      ad('4', 'Magazziniere', 'Logistica Spa')
    ] },
    { count: 2, results: [
      ad('5', 'Business Developer', 'Alfa Srl'),
      ad('1', 'Sistemista Windows Server', 'Meccanica Emiliana Srl'),
      ad('6', 'Commerciale estero', 'Azienda riservata')
    ] },
    { exception: 'AUTH_FAIL' }
  ]
});
const agenzia = (company, description) => run(codice('02-normalizza-annunci.js'), {
  nodes: { 'Prepara richieste': richieste },
  input: [{ results: [ad('9', 'Graphic Designer', company, { description })] }]
})[0].stats.agencies === 1;
assert.ok(agenzia('Oasi Lavoro S.p.A.', 'Grafico'), 'nome con «lavoro»');
assert.ok(agenzia('Risorse SpA', 'Graphic designer') && agenzia('ADHR GROUP', '') && agenzia('KNET Human Resources S.r.l.', ''));
const [cnc] = run(codice('02-normalizza-annunci.js'), { nodes: { 'Prepara richieste': richieste },
  input: [{ results: [ad('10', 'Programmatore CNC', 'Archimede S.p.A.'), ad('11', 'Programmatore CAD CAM', 'Beta Srl'), ad('12', 'Programmatore PLC', 'Gamma Srl')] }] });
assert.equal(cnc.stats.off_topic, 3, 'mestieri di officina fuori tema');
// Emoji spezzata dal taglio della descrizione (600 caratteri): niente mezzo carattere nel JSON verso il database.
for (const k of [599, 598]) {
  const [e] = run(codice('02-normalizza-annunci.js'), { nodes: { 'Prepara richieste': richieste },
    input: [{ results: [ad('13', 'Sistemista', 'Delta Srl', { description: 'x'.repeat(k) + '🚀 fine' })] }] });
  const d = JSON.stringify(e).match(/"description":"[^"]*"/g) || [];
  assert.ok(d.length && d.every(x => !/\\ud83d(?!\\ude80)/i.test(x)), `taglio a ${k}: nessun surrogato orfano`);
}
assert.ok(agenzia('WinTime SpA', 'ricerca per importante gruppo ceramico cliente'));
assert.ok(agenzia('Rl Italia S. R. L.', 'azienda di servizi IT ricerca per notevole cliente un Full Stack'));
assert.ok(agenzia('Next spa filiale di bologna', 'seleziona per società di trasporti'), 'filiale: seleziona per società');
assert.ok(agenzia('NTWK', 'azienda italiana operante nella ricerca e selezione del personale'));
assert.ok(agenzia('NEXT S.P.A.', 'NEXT SPA, Filiale di Bologna, seleziona un/una JUNIOR ACCOUNTANT per società di trasporti'));
assert.ok(!agenzia('Pinalli', 'Pinalli ricerca un SEO specialist per importante progetto di crescita'), '«per importante progetto» resta');
assert.ok(agenzia('Reverse SpA', 'Our client is an innovative company'));
assert.ok(agenzia('Samsic HR Italia', 'Per nostra importante azienda cliente'));
assert.ok(!agenzia('Keyweb srl', 'azienda attenta al cliente, cerchiamo per la nostra sede di Modena'), 'chi assume direttamente resta');
assert.ok(!agenzia('Pinalli', 'garantire un servizio di qualità per il cliente'), '«per il cliente» resta');
assert.ok(!agenzia('Centro Premi', 'Contratto di lavoro: Tempo pieno'), '«contratto di lavoro» nel testo resta');
assert.equal(altriBlocchi.length, 0, 'pochi annunci: un solo blocco');
assert.deepEqual(out.ads.map(a => a.external_id), ['1', '5']);
const tanti = run(codice('02-normalizza-annunci.js'), { nodes: { 'Prepara richieste': richieste },
  input: [{ results: Array.from({ length: 2500 }, (_, i) => ad(`t${i}`, 'Sistemista', `Officina Rossi ${i}`)) }] });
assert.deepEqual(tanti.map(b => b.ads.length), [1000, 1000, 500], 'blocchi da 1.000 per il backend');
assert.equal(tanti[0].stats.kept, 2500);
assert.equal(out.ads[0].title, 'Sistemista Windows Server', 'titolo senza HTML');
assert.equal(out.ads[0].family, 'it_systems');
assert.equal(out.ads[0].city, 'Carpi');
assert.equal(out.ads[0].region, 'Emilia-Romagna');
assert.equal(out.ads[1].family, 'sales', 'business developer è commerciale, non programmatore');
assert.deepEqual(out.stats, { requests: 3, errors: 1, results: 7, off_topic: 1, agencies: 2, anonymous: 1, duplicates: 1, kept: 2 });

console.log('Test raccolta annunci superati.');

// 3. Siti delle aziende: domini candidati
const aziende = [
  { company_key: 'var', company_name: 'Var Group S.p.A.', city: 'Bologna' },
  { company_key: 'maggioli', company_name: 'Gruppo Maggioli', city: 'Santarcangelo' },
  { company_key: 'max mara fashion', company_name: 'Max Mara Fashion Group', city: 'Reggio Emilia' },
  { company_key: 'eng', company_name: 'ENG', city: 'Bologna' },
  { company_key: 'joinrs', company_name: 'Joinrs Italia', city: 'Bologna' },
  { company_key: 'canonical', company_name: 'Canonical', city: 'Bologna' },
  { company_key: 'hybris company', company_name: 'Hybris Company srls', city: 'Bologna' },
  { company_key: 'facile it', company_name: 'Facile.it', city: 'Forlì' },
  { company_key: 'archimede', company_name: 'Archimede S.p.A.', city: 'Provincia di Ferrara' },
  { company_key: 'gruppo', company_name: 'Gruppo Italia S.r.l.', city: '' }
];
const cand = run(codice('03-domini-candidati.js'), { input: [{ companies: aziende }] });
const di = (k) => cand.filter(c => c.company_key === k).map(c => c.domain);
assert.deepEqual(di('var').slice(0, 4), ['var.it', 'var.com', 'vargroup.it', 'vargroup.com']);
assert.ok(di('maggioli').includes('maggioli.it') && di('maggioli').includes('gruppomaggioli.it'));
assert.ok(di('max mara fashion').includes('maxmara.it'), 'prime due parole');
assert.ok(cand.every(c => c.url === `https://${c.domain}`));
assert.equal(di('gruppo').length, 0, 'solo parole generiche: nessun dominio');
assert.equal(di('eng').length, 0, 'nome troppo corto: alla ricerca web');
assert.ok(cand.filter(c => c.company_key === 'max mara fashion').length <= 6);

// 4. Siti delle aziende: scelta
const pagina = (title, body) => ({ html: `<html><head><title>${title}</title></head><body>${body}${' testo'.repeat(120)}</body></html>` });
const paginaDi = {
  'var.it': pagina('Var Sport - abbigliamento', 'Negozio'),
  'vargroup.it': pagina('Var Group | Digital Integrator', 'Var Group spa, Empoli'),
  'maggioli.it': pagina('Maggioli Editore', 'Gruppo Maggioli'),
  'maxmara.it': pagina('Max Mara Official Site', 'Max Mara fashion house'),
  'joinrs.com': pagina('Joinrs - lavoro per giovani', 'Joinrs, Milano'),
  'canonical.it': pagina('Canonical - studio legale', 'Studio a Roma'),
  'hybris.com': pagina('SAP Commerce Cloud', 'SAP Hybris: the company platform'),
  'facile.it': pagina('Facile.it', 'Confronta assicurazioni'),
  'archimede.it': pagina('Archimede', 'Archimede S.p.A. - P.IVA 01234567890'),
  'joinrs.it': { html: '', error: { code: 'ENOTFOUND' } }
};
const [scelta] = run(scegliSito(2), {
  nodes: { 'Domini candidati': cand, 'Aziende senza sito': [{ companies: aziende }] },
  input: cand.map(c => paginaDi[c.domain] || { html: c.domain === 'var.com'
    ? '<html data-adblockkey=x><head><title>var.com - Diese Website steht zum Verkauf!</title></head><body>' + ' x'.repeat(400) + '</body></html>' : '' })
});
const sito = (k) => scelta.results.find(r => r.company_key === k)?.domain;
assert.equal(sito('var'), 'vargroup.it', '«var» da solo nel testo non basta');
assert.equal(sito('maggioli'), 'maggioli.it');
assert.equal(sito('max mara fashion'), 'maxmara.it', 'tutte le parole nella pagina');
assert.equal(sito('eng'), '', 'nome breve: non provato');
assert.equal(sito('joinrs'), '', 'una parola: nome nel titolo ma senza città né partita IVA');
assert.equal(sito('canonical'), '', 'canonical.it di Roma non è Canonical di Bologna');
assert.equal(sito('archimede'), 'archimede.it', 'confermata dalla partita IVA');
assert.equal(sito('hybris company'), '', 'parole sparse non bastano');
assert.equal(sito('facile it'), 'facile.it', 'nome che è già un dominio');
assert.deepEqual(di('facile it'), ['facile.it']);
assert.ok(scelta.stats.unconfirmed >= 2);
assert.equal(scelta.stats.errors.ENOTFOUND, 1, 'errori contati per tipo');
assert.equal(sito('gruppo'), '', 'azienda senza domini registrata come non trovata');
assert.equal(scelta.stats.companies, 10);
assert.equal(scelta.stats.found, 5);
assert.ok(scelta.stats.parked >= 1);
const parcheggio = run(scegliSito(2), {
  nodes: { 'Domini candidati': [{ company_key: 'k', company_name: 'Possedono Srl', city: '', nucleo: 'possedono', nome: 'possedono', domain: 'possedono.it', ordine: 0 }], 'Aziende senza sito': [{ companies: [] }] },
  input: [pagina('Possedono', 'Le aziende che possedono un sito. Partita IVA 01234567890')]
})[0];
assert.equal(parcheggio.results[0].domain, 'possedono.it', '«possedono» non è «sedo»');

// 5. Livello 3: ricerca web del sito per le non trovate, poi verifica come il livello 2.
const nonTrovate = Array.from({ length: 45 }, (_, i) => ({ company_key: `k${i}`, company_name: `Officina ${i} Srl`, city: 'Modena', domain: i === 0 ? 'trovata.it' : '' }));
const reqWeb = run(codice('05-prepara-ricerca-web.js'), { nodes: { 'Scegli sito': [{ results: nonTrovate }] } });
assert.equal(reqWeb.length, 3, 'tetto di 3 per giro (circa 36 al giorno), solo le non trovate');
assert.ok(!reqWeb.some(r => r.company_key === 'k0'));
assert.equal(reqWeb[0]._claude.model, 'claude-haiku-5-5');
assert.equal(reqWeb[0]._claude.tools[0].max_uses, 1);
const risposta = (website) => ({ content: [{ type: 'text', text: JSON.stringify({ website }) }] });
const esitiWeb = run(codice('06-esito-ricerca-web.js'), {
  nodes: { 'Prepara ricerca web': [
    { company_key: 'a', company_name: 'Alfa Meccanica Srl', city: 'Modena' },
    { company_key: 'b', company_name: 'Beta Srl', city: 'Parma' },
    { company_key: 'c', company_name: 'Gamma Srl', city: 'Rimini' },
    { company_key: 'd', company_name: 'Delta Srl', city: 'Forlì' }
  ] },
  input: [risposta('https://www.alfameccanica.it/chi-siamo'), risposta('https://www.linkedin.com/company/beta'), risposta(''), { error: { message: 'x' } }]
});
assert.deepEqual(esitiWeb.map(e => e.domain), ['alfameccanica.it'], 'social, risposte vuote ed errori scartati');
assert.equal(esitiWeb[0].nucleo, 'alfa meccanica');
const [verificaWeb] = run(scegliSito(3), {
  nodes: { 'Esito ricerca web': esitiWeb },
  input: [pagina('Alfa Meccanica - Modena', 'Alfa Meccanica Srl, lavorazioni meccaniche')]
});
assert.deepEqual(verificaWeb.results, [{ company_key: 'a', company_name: 'Alfa Meccanica Srl', city: 'Modena', domain: 'alfameccanica.it', method: 'web' }]);
const [yeppon] = run(scegliSito(3), {
  nodes: { 'Esito ricerca web': [{ company_key: 'yeppon', company_name: 'Yeppon', city: 'Paderno Dugnano', nucleo: 'yeppon', nome: 'yeppon', domain: 'yeppon.it', ordine: 0, url: 'https://yeppon.it' }] },
  input: [pagina('Elettronica e informatica online', 'Negozio online')]
});
assert.equal(yeppon.results[0].domain, 'yeppon.it', 'livello 3: nome nel dominio basta');
const [yepponLiv2] = run(scegliSito(2), {
  nodes: { 'Domini candidati': [{ company_key: 'yeppon', company_name: 'Yeppon', city: 'Paderno Dugnano', nucleo: 'yeppon', nome: 'yeppon', domain: 'yeppon.it', ordine: 0 }], 'Aziende senza sito': [{ companies: [] }] },
  input: [pagina('Elettronica e informatica online', 'Negozio online')]
});
assert.equal(yepponLiv2.results[0].domain, '', 'livello 2 (domini indovinati): resta severo');
console.log('Test siti aziende superati.');

// 7. Settore: homepage -> lotti per Claude Haiku -> esiti.
const homepage = (titolo, descrizione, corpo) => ({ html: `<html><head><title>${titolo}</title><meta name="description" content="${descrizione}"></head>`
  + `<body><nav>Home Chi siamo Contatti</nav><h1>${titolo}</h1><p>${corpo}</p>${' '.repeat(500)}</body></html>` });
const daLeggere = Array.from({ length: 23 }, (_, i) => ({ company_id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, company_name: `Azienda ${i}`, url: `https://a${i}.it` }));
const pagineSettore = daLeggere.map((_, i) => i === 5 ? { error: { code: 'ECONNREFUSED' } }
  : homepage(`Azienda ${i} - Macchine per il packaging`, 'Progettiamo e costruiamo macchine automatiche &amp; linee di confezionamento', 'Dal 1975 al servizio dell\'industria alimentare.'));
const lottiSettore = run(codice('07-prepara-settore.js'), { nodes: { 'Homepage da leggere': daLeggere }, input: pagineSettore });
assert.equal(lottiSettore.length, 2, 'lotti da 20');
assert.equal(lottiSettore[0].aziende.length, 20);
assert.deepEqual(lottiSettore[0].senza_testo, [daLeggere[5].company_id], 'homepage illeggibile');
assert.deepEqual(lottiSettore[1].senza_testo, []);
const promptSettore = lottiSettore[0]._claude.messages[0].content;
assert.ok(lottiSettore[0]._claude.model.includes('haiku') && !lottiSettore[0]._claude.tools, 'Haiku senza ricerca web');
assert.ok(promptSettore.includes('### 1. Azienda 0') && promptSettore.includes('macchine automatiche & linee') && !promptSettore.includes('Chi siamo'));
const rispostaSettore = (elenco) => ({ content: [{ type: 'text', text: JSON.stringify({ aziende: elenco }) }], usage: { input_tokens: 5000, output_tokens: 900 } });
const [esitoSettore] = run(codice('08-esito-settore.js'), {
  nodes: { 'Prepara settore': lottiSettore },
  input: [
    rispostaSettore([{ n: 1, industry: ' Produzione di macchine per il packaging ', keywords: ['Manifattura', 'packaging', 'packaging', ''] },
      { n: 2, industry: '', keywords: ['x'] }]),
    { error: { message: 'overloaded' } }
  ]
});
assert.deepEqual(esitoSettore.results.slice(0, 3), [
  { company_id: daLeggere[5].company_id, industry: '', keywords: [] },
  { company_id: daLeggere[0].company_id, industry: 'Produzione di macchine per il packaging', keywords: ['manifattura', 'packaging'] },
  { company_id: daLeggere[1].company_id, industry: '', keywords: [] }
]);
assert.equal(esitoSettore.results.length, 3, 'risposte mancanti: nessun salvataggio, si riprova');
assert.deepEqual([esitoSettore.stats.classified, esitoSettore.stats.unknown, esitoSettore.stats.failed], [1, 2, 20]);
console.log('Test settore aziende superati.');

// 8. Controllo siti del database: stesse regole del motore.
const siti = [
  { company_id: 'c1', domain: 'vecchio.it', name: 'Vecchio Srl', website: 'http://vecchio.it' },
  { company_id: 'c2', domain: 'moderno.it', name: 'Moderno Srl', website: 'https://moderno.it' },
  { company_id: 'c3', domain: 'spento.it', name: 'Spento Srl', website: 'https://spento.it' }
];
const corpo = 'Siamo una azienda storica che produce componenti meccanici di precisione per il settore automotive e per l\'industria. '.repeat(5);
const paginaVecchia = `<html lang="it"><head><meta name="generator" content="WordPress 5.2.4"></head><body><p>${corpo}</p><footer>© 2019 Vecchio Srl</footer></body></html>`;
const paginaModerna = `<html lang="it"><head><meta name="viewport" content="width=device-width"><link rel="alternate" hreflang="en" href="/en/"></head><body><p>${corpo}</p><footer>© ${new Date().getFullYear()} Moderno</footer></body></html>`;
const [controllo] = run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': siti, 'Controllo HTTPS': [{ error: { message: 'connect ECONNREFUSED 1.2.3.4:443' } }, { https_body: paginaModerna }, { error: { message: 'timeout' } }] },
  input: [{ html: paginaVecchia }, { html: paginaModerna }, { error: { code: 'ENOTFOUND' } }]
});
const esitoDi = (dom, code) => controllo.items.find(x => x.company.domain === dom).checks.find(c => c.code === code)?.status;
assert.equal(controllo.items.length, 3, 'tutte salvate, anche il sito spento');
assert.deepEqual(['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright'].map(c => esitoDi('vecchio.it', c)), ['pass', 'pass', 'pass', 'pass', 'pass']);
assert.deepEqual(['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright'].map(c => esitoDi('moderno.it', c)), ['fail', 'fail', 'undetermined', 'fail', 'fail']);
assert.ok(controllo.items.find(x => x.company.domain === 'spento.it').checks.every(c => c.status === 'undetermined'), 'sito spento: niente prove');
assert.equal(esitoDi('vecchio.it', 'no_privacy'), 'pass', 'nessuna informativa privacy nella homepage');
assert.deepEqual(controllo.items[0].company.technologies, ['wordpress']);
assert.ok(controllo.items[0].checks.find(c => c.code === 'outdated_cms').evidence.detail.startsWith('WordPress 5.2.4'));
assert.equal(controllo.stats.unreachable, 1);
// «Senza HTTPS» (Data Quality, 21/10): la HEAD riuscita dà {} e vale «no»; dominio in vendita su Nidoma e sito vero su un
// altro dominio (canonical) non danno il segnale, e sulla pagina in vendita la vecchia prova va tolta.
const nome = (h) => ({ error: { message: 'SSL Issue', cause: { message: `Hostname/IP does not match certificate's altnames: Host: ${h}. is not in the cert's altnames: DNS:webx.aruba.it` } } });
const sitiH = [
  { company_id: 'h1', domain: 'ok.it', name: 'Ok', website: 'https://www.ok.it' },
  { company_id: 'h2', domain: 'invendita.it', name: 'In vendita', website: 'http://www.invendita.it' },
  { company_id: 'h3', domain: 'vecchiodominio.it', name: 'Trasferita', website: 'http://www.vecchiodominio.it' },
  { company_id: 'h4', domain: 'hosting.it', name: 'Hosting', website: 'https://www.hosting.it' }
];
const nidoma = `<html><head><title>Domain information invendita.it - Nidoma</title></head><body><p>${'Welcome to the Nidoma Marketplace invendita.it It is for sale on our platform. '.repeat(30)}</p></body></html>`;
const senzaCert = '<html><head><title>Error</title></head><body><p>There is no SSL certificate configured for this domain.</p></body></html>';
const canonical = `<html lang="it"><head><link rel="canonical" href="https://www.nuovodominio.com/"></head><body><p>${corpo}</p></body></html>`;
const [ctrlH] = run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': sitiH, 'Controllo HTTPS': [{}, nome('www.invendita.it'), nome('www.vecchiodominio.it'), nome('www.hosting.it')] },
  input: [{ html: paginaModerna }, { html: nidoma }, { html: canonical }, { html: senzaCert }]
});
const httpsDi = (dom) => ctrlH.items.find(x => x.company.domain === dom).checks.find(c => c.code === 'no_https');
assert.equal(httpsDi('ok.it').status, 'fail', 'HEAD riuscita: HTTPS presente');
assert.equal(httpsDi('invendita.it').status, 'undetermined', 'dominio in vendita');
assert.equal(httpsDi('invendita.it').evidence.invalid_page, true, 'la vecchia prova va tolta');
assert.equal(httpsDi('vecchiodominio.it').status, 'undetermined', 'sito vero su un altro dominio');
assert.equal(httpsDi('hosting.it').status, 'pass', 'pagina d\'errore dell\'hosting: l\'errore del certificato resta vero (Code Reviewer)');
// Email aziendale dalla homepage (20/10): solo caselle d'ufficio del dominio o di un dominio fratello.
assert.equal(controllo.stats.emails, 0, 'pagine senza email');
const conEmail = (html, website = 'https://www.ditta.it') => run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': [{ company_id: 'c9', domain: 'ditta.it', name: 'Ditta Srl', website }], 'Controllo HTTPS': [{ https_body: '' }] },
  input: [{ html: `<html><body><p>${corpo}</p>${html}</body></html>` }]
})[0].items[0].company.email;
assert.equal(conEmail('<a href="mailto:info@ditta.it">Scrivici</a>'), 'info@ditta.it', 'info@ del dominio');
assert.equal(conEmail('commerciale [at] ditta [dot] it'), 'commerciale@ditta.it', 'indirizzo protetto');
assert.equal(conEmail('<a href="mailto:privacy@ditta.it">x</a> pec: ditta@pec.it, mario.rossi@ditta.it, info@gmail.com, info@altro.it'), undefined, 'privacy, PEC, nominativa, gratuita, altro dominio: nessuna');
assert.equal(conEmail('info@ditta.com, amministrazione@ditta.it'), 'amministrazione@ditta.it', 'prima il dominio esatto');
assert.equal(conEmail('ditta@ditta.it'), 'ditta@ditta.it', 'casella col nome del sito');
// Pagine che non sono il sito vero (Data Quality, 21/10): blocco anti-bot, trasloco, pagina provvisoria.
const esitiPagina = (html, website = 'https://www.ditta.it') => Object.fromEntries(run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': [{ company_id: 'p1', domain: 'ditta.it', name: 'Ditta Srl', website }], 'Controllo HTTPS': [{ https_body: '' }] },
  input: [{ html }]
})[0].items[0].checks.map(c => [c.code, c.status]));
const HOME = ['no_mobile', 'single_language', 'stale_copyright', 'no_booking_engine', 'no_privacy'];
const blocco = esitiPagina('<html><head><title>ERROR: The request could not be satisfied</title></head><body><h1>403 ERROR</h1><p>Request blocked. We can\'t connect to the server for this app or website at this time. There might be too much traffic or a configuration error. Generated by cloudfront (CloudFront) Request ID: abc123</p></body></html>');
assert.ok([...HOME, 'outdated_cms', 'under_construction'].every(c => blocco[c] === 'undetermined'), 'pagina anti-bot: nessun segnale');
const trasloco = esitiPagina(`<html><head><title>Ditta diventa Nuova Ditta</title></head><body><p>${'Dal 2025 Ditta Srl diventa Nuova Ditta Engineering, con lo stesso team e gli stessi servizi per i nostri clienti. '.repeat(3)}</p><a href="https://www.nuovaditta.it">Vai al nuovo sito</a><p>© 2019</p></body></html>`);
assert.ok(HOME.every(c => trasloco[c] === 'undetermined'), 'pagina di trasloco verso un altro dominio: nessun segnale');
const cantiere = esitiPagina(`<html><head><title>Ditta</title></head><body><p>Sito in manutenzione. Torneremo presto online con il nuovo sito di Ditta Srl, la vostra officina di fiducia da trent'anni a Bologna e provincia. Per informazioni chiamate in orario d'ufficio.</p><p>© 2018 Ditta Srl</p></body></html>`);
assert.equal(cantiere.under_construction, 'pass', 'pagina provvisoria: resta il suo segnale');
assert.ok(HOME.every(c => cantiere[c] === 'undetermined'), 'pagina provvisoria: gli altri segnali della homepage non contano');
const vera = esitiPagina(`<html lang="it"><head><title>Ditta Srl</title></head><body><p>${corpo}</p><a href="https://www.facebook.com/ditta">Facebook</a><p>© 2018 Ditta Srl</p></body></html>`);
assert.deepEqual(HOME.map(c => vera[c]), ['pass', 'pass', 'pass', 'pass', 'pass'], 'una homepage vera con un link esterno resta valutata');
// Falsi negativi trovati dal Code Reviewer (21/10): homepage vere e corte non sono traslochi né pagine provvisorie.
const corta = (frase, extra = '') => esitiPagina(`<html lang="it"><head><title>Rossi Srl</title><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"></head><body><a href="/">Home</a><a href="/chi-siamo">Chi siamo</a><a href="/prodotti">Prodotti</a><p>${frase} Rossi Srl produce componenti meccanici di precisione dal 1975 per l'industria automobilistica, agricola e navale, con un reparto di collaudo interno.</p>${extra}<p>© 2018 Rossi Srl</p></body></html>`);
assert.equal(corta('Benvenuti nel nostro nuovo sito!').no_mobile, 'pass', '«nuovo sito» con Google Fonts e menu: homepage vera');
assert.equal(corta('Inaugurato il nuovo sito produttivo di Modena.', '<a href="https://www.facebook.com/rossi">Facebook</a>').no_mobile, 'pass', '«nuovo sito produttivo»: homepage vera');
assert.equal(corta('Ora ci trovi su Instagram!', '<a href="https://www.instagram.com/rossi">Instagram</a>').no_mobile, 'pass', '«ci trovi su Instagram»: homepage vera');
assert.equal(corta('Vendita appartamenti in costruzione a Bologna.').no_mobile, 'pass', '«appartamenti in costruzione»: homepage vera');
// Casi trovati dal QA (21/10): altre pagine di blocco, pagina provvisoria con testo più lungo, «It works!» solo nel titolo.
for (const [titolo, testoPagina] of [['', ''], ['Security Checkpoint', 'Vercel Security Checkpoint. We are verifying your browser.'],
  ['Pardon Our Interruption', 'As you were browsing something about your browser made us think you were a bot.'],
  ['ditta.it', 'ditta.it is for sale! Make an offer.'], ['Dominio registrato', 'Questo dominio è registrato con Aruba.it'],
  ['Manutenzione', 'Briefly unavailable for scheduled maintenance. Check back in a minute.'],
  ['Access to this site has been limited', 'Your access to this site has been limited by the site owner. Wordfence.']]) {
  const r = esitiPagina(`<html><head><title>${titolo}</title></head><body><p>${testoPagina}</p></body></html>`);
  assert.ok(['no_mobile', 'single_language', 'no_privacy'].every(c => r[c] === 'undetermined'), `blocco o pagina vuota: «${titolo || 'vuota'}»`);
}
const manutenzione = esitiPagina(`<html><head><title>Ditta</title></head><body><p>Sito in manutenzione, torneremo presto online. ${'Ditta Srl è la vostra officina di fiducia da trent\'anni a Bologna e provincia, con assistenza su auto e moto di ogni marca. '.repeat(3)}</p></body></html>`);
assert.equal(manutenzione.under_construction, 'pass', 'manutenzione con testo oltre 400 caratteri e senza menu: provvisoria');
assert.equal(manutenzione.no_mobile, 'undetermined');
assert.equal(corta('It works! La nostra nuova linea di prodotti è pronta.').no_mobile, 'pass', '«It works!» nel testo: homepage vera');
assert.equal(esitiPagina('<html><head><title>It works!</title></head><body><p>It works! This is the default web page for this server.</p></body></html>').no_mobile, 'undetermined', '«It works!» nel titolo: pagina del server');
// Casi trovati da Data Quality su 281 siti reali (21/10).
const borgo = esitiPagina(`<html lang="it"><head><title>Borgo Verde</title><meta name="generator" content="WordPress 5.5.23"></head><body><a href="/">Home</a><a href="/camere">Camere</a><h2>News</h2><p>Online il nuovo Sito Web 22 Mar 14. ${corpo}</p><a href="https://www.almacom.eu">Sito creato da Al.ma.com</a><p>© 2014 Borgo Verde</p></body></html>`);
assert.deepEqual([borgo.no_privacy, borgo.single_language, borgo.outdated_cms], ['pass', 'pass', 'pass'], '«nuovo Sito Web» con il link all\'agenzia: homepage vera');
const coming = esitiPagina('<html><head><title>Coming soon | WordPress</title></head><body><h1>Coming soon</h1><p>Stiamo sviluppando il nuovo sito internet.</p><a href="https://www.facebook.com/ditta">Facebook</a><a href="https://www.instagram.com/ditta">Instagram</a></body></html>');
assert.equal(coming.under_construction, 'pass', '«nuovo sito» su una pagina coming soon: provvisoria, non trasloco');
const lunga = (t) => `${t} `.repeat(Math.ceil(1800 / t.length));
for (const [titolo, testoPagina] of [['Test Page for the Apache HTTP Server on the Amazon Linux AMI', lunga('This page is used to test the proper operation of the Apache HTTP server after it has been installed.')],
  ['Visitor anti-robot validation', lunga('Please wait while we check your connection. Visitor anti-robot validation.')],
  ['SSL Error', 'There is no SSL certificate configured for this domain.'],
  ['ditta.it', 'Please enable JS and disable any ad blocker']]) {
  const r = esitiPagina(`<html><head><title>${titolo}</title><meta name="generator" content="Joomla! 1.5"></head><body><p>${testoPagina}</p></body></html>`);
  assert.ok(['no_mobile', 'single_language', 'no_privacy', 'outdated_cms'].every(c => r[c] === 'undetermined'), `pagina del server o anti-robot: «${titolo}»`);
}
// Casi del Code Reviewer (21/10): «in vendita» e «Plesk» in homepage vere; errore 503 momentaneo senza segno.
for (const frase of ['Appartamenti in vendita a Bologna.', 'Auto usate in vendita, tutte garantite.', 'Hosting e server Plesk gestiti. Access denied? Ti aiutiamo noi.', 'Il nostro dominio agricolo con vini in vendita.']) {
  assert.equal(corta(frase).no_mobile, 'pass', `homepage vera: «${frase}»`);
  if (frase.includes('in vendita')) assert.equal(esitiPagina(`<html lang="it"><head><title>Rossi</title></head><body><p>${frase} ${corpo}</p></body></html>`).no_mobile, 'pass', `sito di una pagina: «${frase}»`);
}
const guasto = run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': [{ company_id: 'p1', domain: 'ditta.it', name: 'Ditta Srl', website: 'https://www.ditta.it' }], 'Controllo HTTPS': [{ https_body: '' }] },
  input: [{ html: '<html><head><title>503 Service Unavailable</title></head><body><h1>Service Unavailable</h1><p>503 Service Unavailable</p></body></html>' }]
})[0].items[0].checks.find(c => c.code === 'no_mobile');
assert.equal(guasto.status, 'undetermined', 'errore 503: non determinabile');
assert.notEqual(guasto.evidence?.invalid_page, true, 'errore 503: le vecchie prove restano');
const segno = run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': [{ company_id: 'p1', domain: 'ditta.it', name: 'Ditta Srl', website: 'https://www.ditta.it' }], 'Controllo HTTPS': [{ https_body: '' }] },
  input: [{ html: '<html><head><title>Just a moment...</title></head><body>Checking your browser before accessing ditta.it.</body></html>' }]
})[0].items[0].checks.find(c => c.code === 'no_mobile').evidence;
assert.equal(segno.invalid_page, true, 'pagina di blocco: segno per togliere le vecchie prove');
// Pagine patologiche (22/10): lunghe sequenze di spazi e di base64 non devono bloccare il nodo; l'email si trova lo stesso.
const pesante = `<html lang="it"><body><div data-state="${'A'.repeat(200000)}"></div>${' '.repeat(200000)}<p>${corpo}</p>` +
  `<a href="mailto:info@lento.it">info@lento.it</a> scrivi a commerciale [at] lento.it</body></html>`;
const inizio = Date.now();
const [lento] = run(codice('09-valuta-siti.js'), {
  nodes: { 'Siti da controllare': [{ company_id: 'l1', domain: 'lento.it', name: 'Lento', website: 'https://lento.it' }], 'Controllo HTTPS': [{}] },
  input: [{ html: pesante }]
});
assert.ok(Date.now() - inizio < 2000, `pagina patologica troppo lenta: ${Date.now() - inizio} ms`);
assert.equal(lento.items[0].company.email, 'info@lento.it', 'email trovata anche nella pagina pesante');
console.log('Test controllo siti superati.');

// 9. Popolamento OpenStreetMap, per riquadro di provincia.
const richiesteOsm = run(codice('10-prepara-osm.js'), {});
assert.equal(richiesteOsm.length, 1, 'a mano: Modena');
assert.deepEqual([richiesteOsm[0].sigla, richiesteOsm[0].regione], ['MO', 'Emilia-Romagna']);
assert.ok(richiesteOsm[0].data.includes('area["ISO3166-2"="IT-MO"]') && richiesteOsm[0].data.includes('nwr(area.a)["website"]["office"]') && richiesteOsm[0].data.includes('out tags;'));
const giornoOsm = run(codice('10-prepara-osm.js'), { eseguiti: ['Ogni giorno'], statico: { osm_tentativi: [] } });
// Almeno 8: nelle notti del recupero (22–24/10) se ne aggiungono altre.
assert.ok(giornoOsm.length >= 8 && new Set(giornoOsm.map(r => r.sigla)).size >= 8 && giornoOsm.every(r => r.url.startsWith('https://')), 'almeno 8 province diverse al giorno');
// Dal 20/10 prima il Nord: tutte le province di Lombardia, Veneto, Emilia-Romagna e Piemonte nei primi 5 giorni.
const provinceOsm = JSON.parse(readFileSync(new URL('../province.json', import.meta.url), 'utf8'));
const nordOsm = provinceOsm.filter(p => ['Lombardia', 'Veneto', 'Emilia-Romagna', 'Piemonte'].includes(p[2])).map(p => p[0]);
const primiGiorni = new Set();
const VeraData = globalThis.Date;
for (let g = 0; g < 5; g++) {
  const finta = new VeraData(2026, 9, 20 + g, 5);
  globalThis.Date = class extends VeraData { constructor(...a) { super(...(a.length ? a : [finta])); } };
  try {
    run(codice('10-prepara-osm.js'), { eseguiti: ['Ogni giorno'], statico: { osm_tentativi: [] } }).forEach(r => primiGiorni.add(r.sigla));
  } finally { globalThis.Date = VeraData; }
}
assert.ok(nordOsm.every(s => primiGiorni.has(s)), 'il Nord nei primi 5 giorni');
const el = (tags) => ({ type: 'node', id: Math.random(), tags });
// Recupero una tantum delle province perse il 21/10 (anche Varese, uscita dalle riprove), su tre notti.
const notteOsm = (giorno, statico = { osm_tentativi: [] }) => {
  const finta = new VeraData(2026, 9, giorno, 4, 20);
  globalThis.Date = class extends VeraData { constructor(...a) { super(...(a.length ? a : [finta])); } };
  try { return run(codice('10-prepara-osm.js'), { eseguiti: ['Ogni giorno'], statico }).map(r => r.sigla); } finally { globalThis.Date = VeraData; }
};
const PERSE = ['SO', 'BL', 'RO', 'CO', 'TV', 'VA', 'PD', 'MB', 'PV'];
const recuperate = (g, statico) => PERSE.filter(s => new Set(notteOsm(g, statico)).has(s));
assert.deepEqual(recuperate(22), ['SO', 'BL'], 'notte del 22/10: due piccole');
assert.deepEqual(recuperate(23), ['RO', 'CO', 'TV', 'VA'], 'notte del 23/10: Varese compresa');
assert.deepEqual(recuperate(24), ['PD', 'MB', 'PV'], 'notte del 24/10');
assert.equal(new Set(notteOsm(25)).size, 8, 'dal 25/10 di nuovo solo la rotazione');
const conRiprove = { osm_tentativi: [['BS', 1], ['MI', 1], ['MB', 1], ['PV', 1], ['VA', 1]], osm_riprova: ['BS', 'MI', 'MB', 'PV', 'VA'] };
const notte22 = notteOsm(22, conRiprove);
assert.deepEqual([...new Set(notte22)].slice(0, 6), ['BS', 'MI', 'MB', 'PV', 'SO', 'BL'], 'prima le riprove (al massimo 4), poi il recupero');
const lista20 = { osm_tentativi: [['BS', 1], ['CO', 1], ['MI', 1]], osm_riprova: ['BS', 'CO', 'MI'] };
assert.deepEqual([...new Set(notteOsm(22, lista20))].slice(0, 5), ['BS', 'CO', 'MI', 'SO', 'BL'], 'lista del 20/10 non sostituita: riprove e recupero');
for (const [g, statico] of [22, 23, 24].flatMap(g => [[g, conRiprove], [g, lista20]])) {
  const sigle = notteOsm(g, statico);
  const prov = [];
  for (const s of sigle) if (prov.at(-1) !== s) prov.push(s);
  assert.equal(prov.length, new Set(prov).size, `notte del ${g}/10: nessuna provincia due volte`);
}
assert.deepEqual(recuperate(24, { osm_tentativi: [['MB', 1]], osm_riprova: ['MB'] }), ['PD', 'MB', 'PV'], 'se è tra le riprove passa una volta sola');

const [osm] = run(codice('11-normalizza-osm.js'), {
  nodes: { 'Prepara richieste OSM': [{ sigla: 'MO', provincia: 'Modena', regione: 'Emilia-Romagna' }, { sigla: 'XX', provincia: 'Altrove', regione: 'Altrove' }] },
  input: [
    { elements: [
      el({ office: 'lawyer', name: 'Studio Legale Bianchi', website: 'https://www.studiobianchi.it/contatti', 'addr:city': 'Modena' }),
      el({ office: 'government', name: 'Agenzia delle Entrate', website: 'https://www.agenziaentrate.gov.it' }),
      el({ office: 'company', name: 'Meccanica Rossi', 'contact:website': 'meccanicarossi.it', 'addr:province': 'MO' }),
      el({ office: 'it', name: 'Comune di Carpi informatica', website: 'https://www.comune.carpi.mo.it' }),
      el({ office: 'accountant', website: 'https://senzanome.it' }),
      el({ amenity: 'dentist', name: 'Studio Dentistico Verdi', website: 'http://dentistaverdi.it' }),
      el({ amenity: 'parking', name: 'Parcheggio', website: 'https://parcheggio.it' }),
      el({ amenity: 'restaurant', name: 'Trattoria', website: 'https://www.facebook.com/trattoria' }),
      el({ shop: 'supermarket', name: 'Conad Carpi', brand: 'Conad', website: 'https://www.conad.it' }),
      el({ shop: 'supermarket', name: 'Conad Modena', brand: 'Conad', website: 'https://www.conad.it/negozi' }),
      el({ shop: 'clothes', name: 'Boutique Anna', website: 'https://boutiqueanna.it' }),
      el({ shop: 'clothes', name: 'Boutique Anna 2', website: 'https://boutiqueanna.it/negozio2' }),
      el({ shop: 'clothes', name: 'Moda Svizzera', website: 'https://modasvizzera.ch' }),
      el({ shop: 'motorcycle', name: 'Piaggio', 'brand:wikidata': 'Q27360', website: 'https://www.piaggio.com/' }),
      el({ tourism: 'yes', leisure: 'marina', name: 'Porto Bolaro', website: 'https://portobolaro.it/' })
    ] },
    { error: { message: 'timeout' } }
  ]
});
assert.deepEqual(osm.companies.map(c => c.domain), ['studiobianchi.it', 'meccanicarossi.it', 'dentistaverdi.it', 'boutiqueanna.it']);
const bianchi = osm.companies[0];
assert.deepEqual([bianchi.industry, bianchi.city, bianchi.province, bianchi.region, bianchi.website], ['Studio legale', 'Modena', 'Modena', 'Emilia-Romagna', 'https://www.studiobianchi.it/contatti']);
assert.ok(bianchi.keywords.includes('avvocati'));
assert.equal(osm.companies[1].industry, '', 'categoria generica: settore da Haiku');
assert.equal(osm.companies[1].website, 'https://meccanicarossi.it');
assert.equal(osm.companies[3].industry, 'Abbigliamento');
// Marchio nazionale (scheda Wikidata) e porto turistico esclusi (18/10).
assert.deepEqual([osm.stats.excluded_category, osm.stats.no_name, osm.stats.not_company_site, osm.stats.foreign, osm.stats.chains, osm.stats.duplicates, osm.stats.errors], [3, 1, 2, 1, 3, 1, 1]);
assert.deepEqual(osm.stats.failed_provinces, ['Altrove']);
// Stessa attività in due richieste (forno-bar: shop e amenity, 22/10): contata una volta sola, non come catena.
const doppio = { type: 'node', id: 4242, tags: { shop: 'bakery', amenity: 'cafe', name: 'Forno Bar Sole', website: 'https://fornobarsole.it' } };
const [osmDoppio] = run(codice('11-normalizza-osm.js'), {
  nodes: { 'Prepara richieste OSM': [{ sigla: 'MO', provincia: 'Modena', regione: 'Emilia-Romagna', parte: '2/7' }, { sigla: 'MO', provincia: 'Modena', regione: 'Emilia-Romagna', parte: '4/7' }, { sigla: 'MO', provincia: 'Modena', regione: 'Emilia-Romagna', parte: '5/7' }] },
  input: [{ elements: [doppio] }, { elements: [doppio] }, { elements: [doppio] }]
});
assert.deepEqual([osmDoppio.companies.length, osmDoppio.stats.chains, osmDoppio.stats.elements], [1, 0, 1], 'attività ripetuta in più richieste: una sola azienda');
// Manifattura (punto 87): stabilimenti «man_made=works» e aree industriali di ogni tipo, non impianti e porti.
const [osmFabbriche] = run(codice('11-normalizza-osm.js'), {
  nodes: { 'Prepara richieste OSM': [{ sigla: 'BS', provincia: 'Brescia', regione: 'Lombardia' }] },
  input: [{ elements: [
    el({ man_made: 'works', name: 'Fonderia Bresciana', website: 'https://fonderiabresciana.it' }),
    el({ industrial: 'foundry', name: 'Fusioni Rossi', website: 'https://fusionirossi.it' }),
    el({ industrial: 'port', name: 'Porto industriale', website: 'https://portoindustriale.it' }),
    el({ man_made: 'tower', name: 'Torre', website: 'https://torre.it' })
  ] }]
});
assert.deepEqual(osmFabbriche.companies.map(c => [c.domain, c.industry]), [['fonderiabresciana.it', 'Produzione industriale'], ['fusionirossi.it', '']],
  'fabbriche e aree industriali (settore da Haiku), non porti né torri');
// Province fallite: riprovate il giorno dopo, al massimo 3 volte.
const primo = run(codice('10-prepara-osm.js'), { eseguiti: ['Ogni giorno'], statico: {} });
assert.deepEqual(primo.slice(0, 10).map(r => r.sigla + ' ' + r.parte), ['NA 1/7', 'NA 2/7', 'NA 3/7', 'NA 4/7', 'NA 5/7', 'NA 6/7', 'NA 7/7', 'BA 1/3', 'BA 2/3', 'BA 3/3'],
  'primo giro: Napoli (una richiesta per tipo, 22/10) e Bari (divisa in 3)');
assert.ok(primo[7].data.includes('["office"]') && !primo[7].data.includes('["shop"]') && primo[8].data.includes('["shop"]') && primo[9].data.includes('["tourism"]'));
assert.ok(primo.slice(0, 7).every(r => (r.data.match(/nwr\(area\.a\)\["website"\]/g) || []).length === 1), 'Napoli: un solo tipo per richiesta');
const statico = {};
run(codice('11-normalizza-osm.js'), {
  statico,
  nodes: { 'Prepara richieste OSM': [{ sigla: 'NA', provincia: 'Napoli', regione: 'Campania' }, { sigla: 'SA', provincia: 'Salerno', regione: 'Campania' }, { sigla: 'BA', provincia: 'Bari', regione: 'Puglia' }] },
  input: [{ data: '<html>too busy</html>' }, { elements: [] }, { elements: [], remark: 'runtime error: Query timed out' }]
});
assert.deepEqual(statico.osm_riprova, ['NA', 'BA'], 'fallite e interrotte da riprovare');
const domani = run(codice('10-prepara-osm.js'), { eseguiti: ['Ogni giorno'], statico });
assert.deepEqual([...new Set(domani.slice(0, 10).map(r => r.sigla))], ['NA', 'BA'], 'prima le province da riprovare, divise');
assert.ok(domani.slice(0, 10).every(r => r.riprova) && new Set(domani.map(r => r.sigla + r.parte)).size === domani.length, 'più la rotazione, senza doppioni');
assert.deepEqual(run(codice('10-prepara-osm.js'), { statico }).map(r => r.sigla), ['MO'], 'a mano resta Modena');
for (let k = 0; k < 3; k++) run(codice('11-normalizza-osm.js'), { statico, nodes: { 'Prepara richieste OSM': [{ sigla: 'NA', provincia: 'Napoli', regione: 'Campania', riprova: true }] }, input: [{ data: 'busy' }] });
assert.deepEqual(statico.osm_riprova, [], 'dopo 3 tentativi si aspetta la rotazione');
console.log('Test popolamento OSM superati.');

// 10. Settore: risposta troncata dal limite di token, si salvano le aziende complete.
const [troncata] = run(codice('08-esito-settore.js'), {
  nodes: { 'Prepara settore': [{ aziende: ['a', 'b', 'c'], senza_testo: [] }] },
  input: [{ content: [{ type: 'text', text: '{"aziende":[{"n":1,"industry":"Crociere","keywords":["crociere","viaggi"]},{"n":2,"industry":"","keywords":[]},{"n":3,"industry":"Software","keywords":' }], stop_reason: 'max_tokens' }]
});
assert.deepEqual(troncata.results, [{ company_id: 'a', industry: 'Crociere', keywords: ['crociere', 'viaggi'] }, { company_id: 'b', industry: '', keywords: [] }]);
assert.equal(troncata.stats.failed, 1);
console.log('Test settore troncato superati.');

// 11. Settore: un'emoji spezzata dal taglio a 700 caratteri non deve rendere il JSON non valido per Claude (21/10).
const emoji = '\u{1F680}';
for (let k = 0; k < 2; k++) {
  const htmlEmoji = `<html><head><title>Officina ${emoji} Rossi</title></head><body><p>${'a'.repeat(k)}${emoji.repeat(500)}</p></body></html>`;
  const [lottoEmoji] = run(codice('07-prepara-settore.js'), {
    nodes: { 'Homepage da leggere': [{ company_id: 'e1', company_name: 'Officina Rossi' }] },
    input: [{ html: htmlEmoji }]
  });
  const corpoEmoji = JSON.stringify(lottoEmoji._claude);
  assert.ok(!/\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i.test(corpoEmoji) && !/(?<!\\ud[89ab][0-9a-f]{2})\\ud[c-f][0-9a-f]{2}/i.test(corpoEmoji),
    `nessun mezzo carattere orfano nel corpo della richiesta (spostamento ${k})`);
  assert.ok(lottoEmoji._claude.messages[0].content.includes(`Officina ${emoji} Rossi`), 'le emoji intere restano');
}
console.log('Test settore con emoji superati.');
