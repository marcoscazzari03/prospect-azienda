// Test locali dei Code node della raccolta annunci, senza n8n.
// Uso: node n8n/annunci/test/run.mjs
import assert from 'node:assert/strict';
import { codice } from '../build.mjs';

const run = (code, { nodes = {}, input = [], eseguiti = [], json = {} }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) {
      if (eseguiti.includes(name)) return { isExecuted: true };
      throw new Error(`nodo mancante: ${name}`);
    }
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })), isExecuted: true };
  };
  const $input = { all: () => input.map((j, i) => ({ json: j, pairedItem: { item: i } })), first: () => (input.length ? { json: input[0] } : undefined) };
  return new Function('$', '$input', '$execution', '$json', code)($, $input, { id: 'test', mode: 'test' }, json).map(i => i.json);
};

// 1. Richieste: una per titolo del catalogo, ogni mattina 2 giorni, a mano 30.
const giorno = run(codice('01-prepara-richieste.js'), { eseguiti: ['Ogni mattina'] });
const termini = giorno.map(r => r.term);
assert.ok(termini.includes('sistemista') && termini.includes('developer') && termini.includes('graphic designer'));
assert.ok(!termini.includes('web developer') && !termini.includes('software developer'), 'titoli già coperti saltati');
assert.ok(giorno.length < 75, `al massimo ~70 chiamate al giorno per regione (${giorno.length})`);
assert.ok(giorno.every(r => r.max_days_old === 2 && r.region === 'Emilia-Romagna'));
const mano = run(codice('01-prepara-richieste.js'), {});
assert.ok(mano.every(r => r.max_days_old === 30));

// 2. Normalizzazione
const richieste = [{ family: 'it_systems', region: 'Emilia-Romagna', page: 1 }, { family: 'sales', region: 'Emilia-Romagna', page: 1 }, { family: 'hr', region: 'Emilia-Romagna', page: 1 }];
const ad = (id, title, company, extra = {}) => ({
  id, title, company: { display_name: company }, created: '2026-10-12T08:00:00Z',
  redirect_url: `https://www.adzuna.it/land/ad/${id}`, description: 'Descrizione', location: { area: ['Italia', 'Emilia-Romagna', 'Provincia di Modena', 'Carpi'] },
  contract_time: 'full_time', ...extra
});
const [out] = run(codice('02-normalizza-annunci.js'), {
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
assert.deepEqual(out.ads.map(a => a.external_id), ['1', '5']);
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
  'archimede.it': pagina('Archimede', 'Archimede S.p.A. - P.IVA 01234567890'),
  'joinrs.it': { html: '', error: { code: 'ENOTFOUND' } }
};
const [scelta] = run(codice('04-scegli-sito.js'), {
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
assert.ok(scelta.stats.unconfirmed >= 2);
assert.equal(scelta.stats.errors.ENOTFOUND, 1, 'errori contati per tipo');
assert.equal(sito('gruppo'), '', 'azienda senza domini registrata come non trovata');
assert.equal(scelta.stats.companies, 8);
assert.equal(scelta.stats.found, 4);
assert.ok(scelta.stats.parked >= 1);
const parcheggio = run(codice('04-scegli-sito.js'), {
  nodes: { 'Domini candidati': [{ company_key: 'k', company_name: 'Possedono Srl', city: '', nucleo: 'possedono', nome: 'possedono', domain: 'possedono.it', ordine: 0 }], 'Aziende senza sito': [{ companies: [] }] },
  input: [pagina('Possedono', 'Le aziende che possedono un sito. Partita IVA 01234567890')]
})[0];
assert.equal(parcheggio.results[0].domain, 'possedono.it', '«possedono» non è «sedo»');

console.log('Test siti aziende superati.');
