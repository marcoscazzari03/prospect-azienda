// Test locali dei Code node della raccolta annunci, senza n8n.
// Uso: node n8n/annunci/test/run.mjs
import assert from 'node:assert/strict';
import { codice } from '../build.mjs';

const run = (code, { nodes = {}, input = [], eseguiti = [] }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) {
      if (eseguiti.includes(name)) return { isExecuted: true };
      throw new Error(`nodo mancante: ${name}`);
    }
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })), isExecuted: true };
  };
  const $input = { all: () => input.map((j, i) => ({ json: j, pairedItem: { item: i } })) };
  return new Function('$', '$input', '$execution', code)($, $input, { id: 'test', mode: 'test' }).map(i => i.json);
};

// 1. Richieste: ogni mattina 2 giorni e fino a 6 pagine, a mano 30 giorni e fino a 10.
const giorno = run(codice('01-prepara-richieste.js'), { eseguiti: ['Ogni mattina'] });
assert.equal(giorno.length, 8, 'una richiesta per famiglia');
assert.ok(giorno.every(r => r.max_days_old === 2 && r.max_pages === 6 && r.region === 'Emilia-Romagna'));
const mano = run(codice('01-prepara-richieste.js'), {});
assert.equal(mano.length, 8);
assert.ok(mano.every(r => r.max_days_old === 30 && r.max_pages === 10));

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
assert.ok(agenzia('WinTime SpA', 'ricerca per importante gruppo ceramico cliente'));
assert.ok(agenzia('Rl Italia S. R. L.', 'azienda di servizi IT ricerca per notevole cliente un Full Stack'));
assert.ok(agenzia('Next spa filiale di bologna', 'seleziona per società di trasporti'), 'filiale: seleziona per società');
assert.ok(agenzia('NTWK', 'azienda italiana operante nella ricerca e selezione del personale'));
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
