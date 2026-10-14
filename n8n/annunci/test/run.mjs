// Test locali dei Code node della raccolta annunci, senza n8n.
// Uso: node n8n/annunci/test/run.mjs
import assert from 'node:assert/strict';
import { codice } from '../build.mjs';

const run = (code, { nodes = {}, input = [], mode = 'trigger' }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) throw new Error(`nodo mancante: ${name}`);
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })) };
  };
  const $input = { all: () => input.map((j, i) => ({ json: j, pairedItem: { item: i } })) };
  return new Function('$', '$input', '$execution', code)($, $input, { id: 'test', mode }).map(i => i.json);
};

// 1. Richieste: ogni giorno 3 giorni e 2 pagine, a mano 30 giorni e 4 pagine.
const giorno = run(codice('01-prepara-richieste.js'), {});
assert.equal(giorno.length, 16, '8 famiglie x 2 pagine');
assert.ok(giorno.every(r => r.max_days_old === 3 && r.region === 'Emilia-Romagna'));
const mano = run(codice('01-prepara-richieste.js'), { mode: 'manual' });
assert.equal(mano.length, 32);
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
assert.deepEqual(out.ads.map(a => a.external_id), ['1', '5']);
assert.equal(out.ads[0].title, 'Sistemista Windows Server', 'titolo senza HTML');
assert.equal(out.ads[0].family, 'it_systems');
assert.equal(out.ads[0].city, 'Carpi');
assert.equal(out.ads[0].region, 'Emilia-Romagna');
assert.equal(out.ads[1].family, 'sales', 'business developer è commerciale, non programmatore');
assert.deepEqual(out.stats, { requests: 3, errors: 1, results: 7, off_topic: 1, agencies: 2, anonymous: 1, duplicates: 1, kept: 2 });

console.log('Test raccolta annunci superati.');
