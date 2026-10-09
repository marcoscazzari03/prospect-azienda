// Test locali dei Code node del motore, senza n8n.
// Simula $, $json, $input, $execution e verifica i casi chiave.
// Uso: node n8n/engine/test/run.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'nodes');
const src = (f, subs = {}) => Object.entries(subs)
  .reduce((s, [k, v]) => s.split(k).join(v), readFileSync(join(dir, f), 'utf8'));

const run = (code, { nodes = {}, input = [], json = {} }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) throw new Error(`nodo mancante: ${name}`);
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })), item: { json: n[0] } };
  };
  const $input = { first: () => ({ json: input[0] }), all: () => input.map(j => ({ json: j })) };
  return new Function('$', '$json', '$input', '$execution', code)($, json, $input, { id: 'test' });
};

const body = {
  job_id: '0b8e7c1e-1111-4222-8333-944455556666', run_id: 'r1', run_token: 'x'.repeat(32),
  callback_url: 'https://app.TUO-DOMINIO.it/api/engine/callback',
  email_mode: 'personal_only', quantity: 20,
  target: { country_names: ['Italia'], industry: 'Software house', roles: ['CEO', 'Founder'] },
  exclusions: { domains: ['venduta.it'], person_keys: [] },
  limits: { enrichment_cap: 5 }
};

// 1. Validazione
const [job] = run(src('01-valida-richiesta.js'), { input: [{ body }] }).map(i => i.json);
assert.equal(job.valida, true, job.errori.join(', '));
assert.ok(job.lotti_previsti >= 2);
const [bad] = run(src('01-valida-richiesta.js'), { input: [{ body: { ...body, callback_url: 'https://evil.com/x' } }] }).map(i => i.json);
assert.equal(bad.valida, false);
console.log('ok  validazione + anti-SSRF');

// 2. Deduplica
const cands = [
  { company_name: 'Acme Srl', website: 'https://www.acme.it', full_name: 'Mario Rossi', job_title: 'CEO', source_url: 'https://acme.it/team' },
  { company_name: 'Acme Srl', website: 'acme.it/chi-siamo', full_name: 'Luca Bianchi', job_title: 'Founder', source_url: 'https://acme.it/team' },
  { company_name: 'Venduta', website: 'https://venduta.it', full_name: 'Anna Verdi', job_title: 'CEO', source_url: 'https://venduta.it' },
  { company_name: 'Social', website: 'https://linkedin.com/company/x', full_name: 'Gino Neri', job_title: 'CEO', source_url: 'https://x.it' },
  { company_name: 'NoFonte', website: 'https://nofonte.it', full_name: 'Paolo Gialli', job_title: 'CEO', source_url: '' },
  { company_name: 'Dev Spa', website: 'https://dev.it', full_name: 'Sara Blu', job_title: 'Office manager', source_url: 'https://dev.it' }
];
const dedup = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [job] }, input: [{ candidates: cands, lotto: 1 }] }).map(i => i.json);
assert.equal(dedup.length, 1);
assert.equal(dedup[0].person_key, 'mario rossi|acme.it');
assert.deepEqual(dedup[0]._stats_deduplica.scarti, {
  limite_contatti_azienda: 1, azienda_gia_acquistata: 1, sito_non_ufficiale: 1, senza_fonte: 1, ruolo_non_coerente: 1
});
const vuoto = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [job] }, input: [{ candidates: [] }] }).map(i => i.json);
assert.equal(vuoto[0]._vuoto, true);
console.log('ok  deduplica, esclusioni, limite per azienda, ruolo');

// 3. Estrazione email
const estrai = src('05-estrai-email.template.js', { __SORGENTE__: 'P', __FASE__: 'HOMEPAGE', __FONTE__: "$('P').item.json.website" });
const html = `<a href="mailto:info@acme.it">info</a> m.rossi [at] acme.it
  <a href="/contatti">Contatti</a><a href="/privacy">Privacy</a> noreply@acme.it x@sentry.io acme@pec.it`;
const r = run(estrai, { nodes: { P: [dedup[0]], 'Valida richiesta': [job] }, json: { html } }).json;
assert.equal(r.email_site, 'm.rossi@acme.it');
assert.equal(r.email_site_type, 'personal');
assert.equal(r.page_1, '', 'nominativa trovata: niente altre pagine');
const r2 = run(estrai, { nodes: { P: [dedup[0]], 'Valida richiesta': [job] }, json: { html: '<a href="mailto:info@acme.it">x</a><a href="/contatti">c</a>' } }).json;
assert.equal(r2.email_site_type, 'generic');
assert.equal(r2.page_1, 'https://www.acme.it/contatti', 'solo generica in personal_only: continua a cercare');
console.log('ok  estrazione email, offuscamento, PEC/noreply scartate, pagine successive');

// 4. Classificazione finale per modalità
const classifica = src('08-classifica-e-prepara-risultati.js');
const lotti = [{ stato_lotto: 'OK' }];
const out = (mode, p) => run(classifica, {
  nodes: { 'Valida richiesta': [{ ...job, email_mode: mode }], 'Normalizza output AI': lotti },
  input: [p]
})[0].json;

const soloGenerica = { ...r2 };
assert.equal(out('personal_only', soloGenerica).leads.length, 0);
assert.equal(out('personal_only', soloGenerica).rejected[0].reason, 'solo_email_generica');
const mista = out('mixed', soloGenerica);
assert.equal(mista.leads.length, 1);
assert.equal(mista.leads[0].email.status, 'found_public');
assert.equal(mista.leads[0].email_patterns[0].status, 'guessed');
assert.equal(mista.leads[0].email_patterns[0].address, 'mario.rossi@acme.it');
const validata = out('personal_only', { ...soloGenerica, email_enrichment: 'mario.rossi@acme.it', email_enrichment_status: 'VALIDATED' });
assert.equal(validata.leads[0].email.status, 'validated');
const nessuna = out('generic_ok', { _vuoto: true, stats: { candidati_ai: 0 } });
assert.equal(nessuna.leads.length, 0);
assert.equal(nessuna.event, 'results');
console.log('ok  classificazione: personal_only / mixed / validated / ricerca vuota');
console.log('\nTutti i test superati.');
