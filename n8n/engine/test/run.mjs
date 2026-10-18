// Test locali dei Code node del motore, senza n8n.
// Simula $, $json, $input, $execution e verifica i casi chiave.
// Uso: node n8n/engine/test/run.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'nodes');
const src = (f, subs = {}) => Object.entries(subs)
  .reduce((s, [k, v]) => s.split(k).join(v), readFileSync(join(dir, f), 'utf8')
    .split('__CONTROLLI_SITO__').join(readFileSync(join(dir, 'lib-controlli-sito.js'), 'utf8')));

const run = (code, { nodes = {}, input = [], json = {} }) => {
  const $ = (name) => {
    const n = nodes[name];
    if (!n) throw new Error(`nodo mancante: ${name}`);
    return { first: () => ({ json: n[0] }), all: () => n.map(j => ({ json: j })), item: { json: n[0] } };
  };
  const $input = { first: () => ({ json: input[0] }), all: () => input.map(j => ({ json: j })) };
  // URL non esiste nella sandbox dei Code node di n8n: lo togliamo anche qui.
  return new Function('$', '$json', '$input', '$execution', 'URL', code)($, json, $input, { id: 'test' }, undefined);
};

const body = {
  job_id: '0b8e7c1e-1111-4222-8333-944455556666', run_id: 'r1', run_token: 'x'.repeat(32),
  callback_url: 'https://leads.weborastudio.it/api/engine/callback',
  email_mode: 'personal_only', quantity: 20,
  target: { country_names: ['Italia'], industry: 'Software house', roles: ['CEO', 'Founder'] },
  exclusions: { domains: ['venduta.it'], person_keys: [] },
  limits: { enrichment_cap: 5 }
};

// 1. Validazione
const [job] = run(src('01-valida-richiesta.js'), { input: [{ body }] }).map(i => i.json);
assert.equal(job.valida, true, job.errori.join(', '));
assert.ok(job.lotti_previsti >= 2);
const [bad] = run(src('01-valida-richiesta.js'), { input: [{ body: { ...body, callback_url: 'https://weborastudio.it.evil.com/api/engine/callback' } }] }).map(i => i.json);
assert.equal(bad.valida, false);
const senzaSettore = (signals) => run(src('01-valida-richiesta.js'), { input: [{ body: { ...body, target: { ...body.target, industry: '', industry_keywords: [], signals } } }] })[0].json;
assert.equal(senzaSettore({ codes: ['outdated_cms'] }).valida, true, 'opportunità senza settore: valida');
assert.match(senzaSettore({ codes: ['outdated_cms'] }).brief, /Settore: qualsiasi/);
assert.equal(senzaSettore(undefined).valida, false, 'ricerca normale senza settore: rifiutata');
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
assert.equal(dedup.length, 2);
assert.equal(dedup[0].person_key, 'mario rossi|acme.it');
assert.deepEqual(dedup[0]._stats_deduplica.scarti, {
  limite_contatti_azienda: 1, azienda_gia_acquistata: 1, sito_non_ufficiale: 1, senza_fonte: 1
});
// Due passaggi per tutte le ricerche: ruolo non coerente -> l'azienda resta, il referente lo cerchiamo noi.
assert.equal(dedup[1].person_key, '|dev.it');
assert.equal(dedup[1].full_name, '');
assert.equal(dedup[1]._serve_referente, true);
const vuoto = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [job] }, input: [{ candidates: [] }] }).map(i => i.json);
assert.equal(vuoto[0]._vuoto, true);
console.log('ok  deduplica, esclusioni, limite per azienda, ruolo');
const sporco = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [job] }, input: [{ candidates: [
  { company_name: 'Musso', website: 'https://www.studioavvocat\uFEFFomusso.com/', full_name: 'Luca Musso', job_title: 'CEO', source_url: 'https://www.studioavvocatomusso.com/' },
  { company_name: 'Rotto', website: 'https://ex ample', full_name: 'Gino Rotti', job_title: 'CEO', source_url: 'https://x.it' }
] }] }).map(i => i.json);
assert.equal(sporco.length, 1);
assert.equal(sporco[0].website, 'https://www.studioavvocatomusso.com/');
assert.equal(sporco[0].domain, 'studioavvocatomusso.com');
console.log('ok  URL con caratteri invisibili ripuliti, URL non validi scartati');
const ssrf = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [job] }, input: [{ candidates: [
  ['http://169.254.169.254/latest/meta-data', 'Ip Uno'], ['http://127.0.0.1:8080/', 'Ip Due'], ['https://10.0.0.5', 'Ip Tre'],
  ['http://intranet.corp/', 'Corp Quattro'], ['http://server.local/', 'Local Cinque'], ['https://acme.it:8443/', 'Porta Sei'],
  ['http://localhost/', 'Host Sette'], ['https://[::1]/', 'Sei Otto'], ['https://buona.it:443/chi-siamo', 'Buona Nove']
].map(([website, full_name]) => ({ company_name: full_name, website, full_name, job_title: 'CEO', source_url: 'https://fonte.it/x' })) }] }).map(i => i.json);
assert.equal(ssrf.length, 1);
assert.equal(ssrf[0].website, 'https://buona.it/chi-siamo');
console.log('ok  anti-SSRF: IP, localhost, domini interni e porte non standard scartati');
const conRuoli = (roles, title) => run(src('04-deduplica-candidati.js'), {
  nodes: { 'Valida richiesta': [{ ...job, target: { ...job.target, roles } }] },
  input: [{ candidates: [{ company_name: 'Acme', website: 'https://acme.it', full_name: 'Mario Rossi', job_title: title, source_url: 'https://acme.it' }] }]
})[0].json.role_match;
assert.equal(conRuoli(['Titolare / CEO'], 'CEO e Founder'), 'exact');
assert.equal(conRuoli(['Titolare / CEO'], 'Proprietario'), 'exact');
assert.equal(conRuoli(['Titolare / CEO'], 'Co-Founder'), 'plausible');
assert.equal(conRuoli(['Fondatore'], 'Co-Founder e Google Ads Expert'), 'exact');
assert.equal(conRuoli(['Direttore marketing'], 'Head of Marketing'), 'plausible');
assert.equal(conRuoli(['Responsabile IT / CTO'], 'Office manager'), 'unknown', 'ruolo non coerente: referente da cercare');
assert.equal(conRuoli(['Titolare / CEO'], 'Legale rappresentante'), 'exact', 'legale rappresentante = titolare');
console.log('ok  ruoli con alternative e sinonimi (Titolare / CEO)');

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
const r3 = run(estrai, { nodes: { P: [dedup[0]], 'Valida richiesta': [job] }, json: { html: '<html><head><meta http-equiv="refresh" content="0; url=/it/home"></head></html>' } }).json;
assert.equal(r3.page_1, 'https://www.acme.it/it/home', 'homepage con meta refresh: si segue il rimando');
const r4 = run(estrai, { nodes: { P: [dedup[0]], 'Valida richiesta': [job] }, json: { html: '<meta http-equiv="refresh" content="0;url=https://altro.it/">' } }).json;
assert.notEqual(r4.page_1, 'https://altro.it/', 'rimando verso un altro dominio: ignorato');
const tipoDi = (h) => run(estrai, { nodes: { P: [dedup[0]], 'Valida richiesta': [job] }, json: { html: h } }).json.email_site_type;
assert.equal(tipoDi('<a href="mailto:segreteria.rossi@gmail.com">x</a>'), 'generic', 'segreteria.cognome su gmail: casella di ufficio');
assert.equal(tipoDi('<a href="mailto:studiodentisticorossi@gmail.com">x</a>'), 'generic');
assert.equal(tipoDi('<a href="mailto:info-rossi@acme.it">x</a>'), 'generic');
assert.equal(tipoDi('<a href="mailto:mario.rossi@gmail.com">x</a>'), 'personal');
assert.equal(tipoDi('<a href="mailto:rossicostruzionisrl@libero.it">x</a>'), 'generic', 'casella aziendale col cognome');
assert.equal(tipoDi('<a href="mailto:rossicostruzioni@acme.it">x</a>'), 'generic');
assert.equal(tipoDi('<a href="mailto:mrossi74@gmail.com">x</a>'), 'personal');
assert.equal(tipoDi('<a href="mailto:contact.dataprivacy@acme.it">x</a>'), 'privacy', 'casella privacy composta: mai venduta');
assert.equal(tipoDi('<a href="mailto:dpo.italia@acme.it">x</a>'), 'privacy');
assert.equal(tipoDi('<a href="mailto:privacy@acme.it">x</a><a href="mailto:info@acme.it">y</a>'), 'generic', 'privacy scartata se c\'è altro');
const famiglia = { ...dedup[0], website: 'https://www.maggioli.it', full_name: 'Paolo Maggioli', first_name: 'Paolo', last_name: 'Maggioli' };
const tipoFam = (h) => run(estrai, { nodes: { P: [famiglia], 'Valida richiesta': [job] }, json: { html: h } }).json.email_site_type;
assert.equal(tipoFam('<a href="mailto:maggiolispa@maggioli.it">x</a>'), 'generic', 'cognome = azienda: casella dell\'azienda');
assert.equal(tipoFam('<a href="mailto:maggioli@maggioli.it">x</a>'), 'generic');
assert.equal(tipoFam('<a href="mailto:paolo.maggioli@maggioli.it">x</a>'), 'personal', 'con il nome resta nominativa');
assert.equal(tipoFam('<a href="mailto:pmaggioli@maggioli.it">x</a>'), 'personal');
console.log('ok  estrazione email, offuscamento, PEC/noreply scartate, pagine successive, caselle di ufficio');

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
assert.equal(out('personal_only', soloGenerica).rejected[0].email.type, 'generic', 'la generica scartata va al backend per il magazzino');
assert.ok(out('personal_only', soloGenerica).rejected[0].quality.score > 0);
const mista = out('mixed', soloGenerica);
assert.equal(mista.leads.length, 1);
assert.equal(mista.leads[0].email.status, 'found_public');
assert.equal(mista.leads[0].email_patterns[0].status, 'guessed');
assert.equal(mista.leads[0].email_patterns[0].address, 'mario.rossi@acme.it');
const validata = out('personal_only', { ...soloGenerica, email_enrichment: 'mario.rossi@acme.it', email_enrichment_status: 'VALIDATED' });
assert.equal(validata.leads[0].email.status, 'validated');
const senzaNome = { ...soloGenerica, _senza_referente: true, full_name: '', first_name: '', last_name: '', job_title: '', role_match: 'unknown' };
const anonima = out('generic_ok', senzaNome);
assert.equal(anonima.leads.length, 1, 'senza referente: consegnata la generica');
assert.equal(anonima.leads[0].email.type, 'generic');
assert.equal(anonima.leads[0].email_patterns.length, 0, 'nessuna email ipotizzata senza nome');
assert.equal(out('generic_ok', { ...senzaNome, email_enrichment: 'x.y@acme.it', email_enrichment_status: 'VALIDATED' }).leads[0].email.type, 'generic');
const decidi = run(src('06-decidi-arricchimento.js'), { nodes: { 'Valida richiesta': [{ ...job, email_mode: 'generic_ok', limits: { ...job.limits, enrichment_cap: 5 } }] },
  input: [{ ...senzaNome, email_site_score: 0 }] });
assert.equal(decidi[0].json.needs_enrichment, false, 'senza nome niente Icypeas');
const nessuna = out('generic_ok', { _vuoto: true, stats: { candidati_ai: 0 } });
assert.equal(nessuna.leads.length, 0);
assert.equal(nessuna.event, 'results');
console.log('ok  classificazione: personal_only / mixed / validated / ricerca vuota');
// 5. Icypeas: solo email del dominio con certezza alta
const icy = (results, status = 'DEBITED') => run(src('07-normalizza-icypeas.js'), {
  nodes: { 'Arricchimento necessario?': [{ ...dedup[0], domain: 'acme.it' }] },
  json: { items: [{ status, results: { emails: results } }] }
}).json;
assert.equal(icy([{ email: 'Mario.Rossi@acme.it', certainty: 'ultra_sure' }]).email_enrichment, 'mario.rossi@acme.it');
assert.equal(icy([{ email: 'mario.rossi@acme.it', certainty: 'ultra_sure' }]).enrichment_lookups, 1);
assert.equal(icy([{ email: 'mario@acme.it', certainty: 'probable' }]).email_enrichment_status, 'LOW_CERTAINTY');
assert.equal(icy([{ email: 'mario@altro.it', certainty: 'ultra_sure' }]).email_enrichment, '');
const nf = icy([], 'DEBITED_NOT_FOUND');
assert.equal(nf.email_enrichment_status, 'NOT_FOUND');
assert.equal(nf.enrichment_lookups, 0);
assert.equal(icy([], 'SCHEDULED').email_enrichment_status, 'PENDING');
console.log('ok  Icypeas: certezza, dominio, crediti solo se trovata');

// 6. Segnale "annuncio di lavoro" (fase 1): validazione, lotti, deduplica, verifica
const fx = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'signals');
const attesi = JSON.parse(readFileSync(join(fx, 'expected.json'), 'utf8')).fixtures;
const famiglie = {
  it_systems: { code: 'it_systems', label: 'Sistemista / tecnico IT', titles: ['sistemista', 'tecnico informatico', 'tecnico it', 'help desk', 'system administrator'] },
  software_dev: { code: 'software_dev', label: 'Programmatore / sviluppatore', titles: ['programmatore', 'sviluppatore', 'developer'] }
};
const bodyAnnunci = (fam, extra = {}) => ({ ...body, today: '2026-10-13', target: { ...body.target, signals: { codes: ['job_ad'], job_families: [famiglie[fam]], ...extra } } });
const [jobA] = run(src('01-valida-richiesta.js'), { input: [{ body: bodyAnnunci('it_systems') }] }).map(i => i.json);
assert.deepEqual(jobA.target.signals.codes, ['job_ad']);
assert.equal(jobA.today, '2026-10-13');
assert.equal(jobA.lotti_previsti, 0, 'annuncio decisivo: solo database, niente ricerca AI');
assert.equal(jobA.limits.candidates_per_lot, 30, 'due passaggi: solo aziende, tante per lotto');
assert.equal(jobA.limits.referenti_max, Math.ceil(jobA.quantity * (jobA.email_mode === 'personal_only' ? 2.2 : 1.5)) + 1, 'tetto ai referenti');
assert.equal(jobA.ai.max_searches, 8);
// Riserva sufficiente: nessuna ricerca AI.
const riserva = Array.from({ length: 40 }, (_, i) => ({ company_name: `R${i}`, website: `https://r${i}.it`, signals: [{ code: 'job_ad', evidence: { url: 'https://r.it/a' } }] }));
const [conRiserva] = run(src('01-valida-richiesta.js'), { input: [{ body: { ...bodyAnnunci('it_systems'), quantity: 3, reserve: riserva } }] }).map(i => i.json);
assert.equal(conRiserva.lotti_previsti, 0);
assert.equal(conRiserva.reserve[0].signals[0].status, 'pass');
const [saltato] = run(src('02-prepara-lotti.js'), { nodes: { 'Valida richiesta': [conRiserva] }, input: [{ output: '' }] }).map(i => i.json);
assert.equal(saltato._salta, true);
// Collaudo 14/10: 7 aziende in riserva per 5 lead (email miste) bastano; con solo nominative ne servono 10.
const sitoBody = { ...body, target: { ...body.target, signals: { codes: ['outdated_cms'], match: 'any' } } };
const lottiCon = (n, extra) => run(src('01-valida-richiesta.js'), { input: [{ body: { ...sitoBody, quantity: 5, reserve: riserva.slice(0, n).map(r => ({ ...r, signals: [{ code: 'outdated_cms', evidence: {} }] })), ...extra } }] })[0].json.lotti_previsti;
// Annuncio decisivo: mai ricerca AI, anche senza riserva.
assert.equal(run(src('01-valida-richiesta.js'), { input: [{ body: { ...bodyAnnunci('it_systems'), quantity: 5 } }] })[0].json.lotti_previsti, 0, 'annunci: solo database');
assert.equal(lottiCon(7, { email_mode: 'mixed' }), 0, 'riserva 1,4 volte i lead: niente AI');
assert.ok(lottiCon(6, { email_mode: 'mixed' }) > 0, 'riserva scarsa: ricerca AI');
assert.equal(lottiCon(10, { email_mode: 'personal_only' }), 0);
assert.ok(lottiCon(9, { email_mode: 'personal_only' }) > 0);
// Ricerca in target semplice: riserva dal database senza segnali.
const riservaTarget = riserva.map(({ signals, ...r }) => ({ ...r, signals: [] }));
const target = (n, extra = {}) => run(src('01-valida-richiesta.js'), { input: [{ body: { ...body, quantity: 5, reserve: riservaTarget.slice(0, n), ...extra } }] })[0].json;
assert.equal(target(7, { email_mode: 'mixed' }).reserve.length, 7, 'target: riserva senza segnali ammessa');
assert.equal(target(7, { email_mode: 'mixed' }).lotti_previsti, 0, 'target: riserva sufficiente, niente AI');
assert.equal(target(7, { email_mode: 'mixed' }).limits.referenti_max, 7, 'giro solo dalla riserva: tutte quelle disponibili');
assert.equal(target(30, { email_mode: 'mixed' }).limits.referenti_max, Math.ceil(5 * 2.5) + 2, 'giro solo dalla riserva: tetto 2,5 volte i lead + 2');
assert.equal(target(30, { email_mode: 'generic_ok' }).limits.referenti_max, Math.ceil(5 * 1.6) + 2, 'generiche incluse: tetto 1,6 volte i lead + 2');
assert.equal(target(30, { email_mode: 'personal_only' }).limits.referenti_max, Math.ceil(5 * 3) + 2, 'solo nominative: tetto invariato');
assert.equal(target(7, { email_mode: 'generic_ok' }).limits.referenti_max, 7, 'generiche incluse: mai oltre la riserva');
assert.ok(target(3, { email_mode: 'mixed' }).lotti_previsti >= 1, 'target: riserva scarsa, AI per il resto');
assert.equal(target(0).limits.referenti_max, Math.ceil(5 * 2.2) + 1, 'target senza riserva: tetto ai referenti anche per le aziende dell AI');
assert.equal(target(0).limits.candidates_per_lot, 30, 'l AI cerca solo aziende: molte per lotto');
assert.equal(run(src('01-valida-richiesta.js'), { input: [{ body: { ...sitoBody, reserve: riservaTarget } }] })[0].json.reserve.length, 0, 'opportunità: riserva senza segnali scartata');
const dedR = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [{ ...conRiserva, exclusions: { domains: ['r1.it'], person_keys: [] } }] }, input: [{ candidates: [], lotto: 1 }] }).map(i => i.json);
assert.equal(dedR[0].company_name, 'R0');
assert.equal(dedR[0]._riserva, true);
assert.ok(!dedR.some(p => p.domain === 'r1.it'), 'riserva già acquistata esclusa');
assert.match(jobA.planner_prompt, /ANNUNCI DI LAVORO/);
const [senzaFam] = run(src('01-valida-richiesta.js'), { input: [{ body: { ...body, target: { ...body.target, signals: { codes: ['job_ad', 'inventato'] } } } }] }).map(i => i.json);
assert.deepEqual(senzaFam.target.signals.codes, [], 'job_ad senza figure e codici sconosciuti ignorati');
const [lotto1] = run(src('02-prepara-lotti.js'), { nodes: { 'Valida richiesta': [{ ...jobA, lotti_previsti: 1 }] }, input: [{ output: '{"lotti":[{"paese":"Italia","focus":"Brescia","query":["offerta lavoro sistemista Brescia"]}]}' }] }).map(i => i.json);
assert.match(lotto1.prompt, /job_ad_url/);
assert.match(lotto1.prompt, /Sistemista \/ tecnico IT/);
console.log('ok  segnali nella richiesta e nei lotti (annunci di lavoro)');

const candA = [
  { company_name: 'Rossi Meccanica Srl', website: 'https://www.rossimeccanica.it', full_name: 'Mario Rossi', job_title: 'CEO', source_url: 'https://rossimeccanica.it/chi-siamo', job_ad_url: 'https://lavoro.example-board.it/annuncio/123', job_ad_title: 'Sistemista', job_ad_date: '2026-09-28' },
  { company_name: 'Senza Annuncio', website: 'https://senzaannuncio.it', full_name: 'Gino Neri', job_title: 'CEO', source_url: 'https://senzaannuncio.it' },
  { company_name: 'Solo Linkedin', website: 'https://sololinkedin.it', full_name: 'Anna Blu', job_title: 'CEO', source_url: 'https://sololinkedin.it', job_ad_url: 'https://www.linkedin.com/jobs/view/1' },
  { company_name: 'Ip Interno', website: 'https://ipinterno.it', full_name: 'Paolo Viola', job_title: 'CEO', source_url: 'https://ipinterno.it', job_ad_url: 'http://10.0.0.1/annuncio' }
];
const dedA = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [jobA] }, input: [{ candidates: candA, lotto: 1 }] }).map(i => i.json);
assert.equal(dedA.length, 1);
assert.equal(dedA[0].job_ad_url, 'https://lavoro.example-board.it/annuncio/123');
assert.deepEqual(dedA[0]._stats_deduplica.scarti, { annuncio_mancante: 2, annuncio_non_verificabile: 1 });
console.log('ok  deduplica: annuncio obbligatorio, LinkedIn e indirizzi interni scartati');

const verifica = src('09-verifica-annuncio.js');
const prospetto = (extra) => ({ ...dedA[0], company_name: 'Rossi Meccanica Srl', domain: 'rossimeccanica.it', ...extra });
const casi = {
  'job-ad-jsonld.html': ['it_systems', {}],
  'job-ad-agency.html': ['it_systems', {}],
  'job-ad-expired.html': ['it_systems', { company_name: 'Bianchi Logistica S.p.A.', domain: 'bianchilogistica.it' }],
  'job-ad-nodate.html': ['software_dev', { company_name: 'Verdi Software S.r.l.', domain: 'verdisoftware.it' }],
  'job-ad-wrong-family.html': ['it_systems', {}],
  'careers-page.html': ['it_systems', { company_name: 'Neri Impianti Srl', domain: 'neriimpianti.it', job_ad_url: 'https://www.neriimpianti.it/lavora-con-noi' }]
};
const MAPPA = { pass: 'pass', reject: 'reject', undetermined: 'undetermined' };
for (const [file, [fam, extra]] of Object.entries(casi)) {
  const [jobF] = run(src('01-valida-richiesta.js'), { input: [{ body: bodyAnnunci(fam) }] }).map(i => i.json);
  const r = run(verifica, { nodes: { 'Valida richiesta': [jobF], 'Serve verifica annuncio?': [prospetto(extra)] }, json: { html: readFileSync(join(fx, file), 'utf8') } }).json;
  const s = r.signals.at(-1);
  assert.equal(s.status, MAPPA[attesi[file].expect], `${file}: ${s.status} (${s.reason}) invece di ${attesi[file].expect}`);
  if (s.status === 'pass') {
    assert.equal(s.evidence.date, attesi[file].date, `${file}: data`);
    assert.equal(r._scarto_segnale, undefined);
  } else {
    assert.ok(r._scarto_segnale?.startsWith('annuncio_'), `${file}: scarto`);
  }
}
const vuota = run(verifica, { nodes: { 'Valida richiesta': [jobA], 'Serve verifica annuncio?': [prospetto({})] }, json: { html: '' } }).json;
assert.equal(vuota.signals[0].status, 'undetermined');
assert.equal(vuota._scarto_segnale, 'annuncio_pagina_non_leggibile');
const [jobAny] = run(src('01-valida-richiesta.js'), { input: [{ body: bodyAnnunci('it_systems', { codes: ['job_ad', 'no_mobile'], match: 'any' }) }] }).map(i => i.json);
const nonObblig = run(verifica, { nodes: { 'Valida richiesta': [jobAny], 'Serve verifica annuncio?': [prospetto({})] }, json: { html: '' } }).json;
assert.equal(nonObblig._scarto_segnale, undefined, 'con "basta uno" decide anche il sito');
console.log('ok  verifica annunci: JSON-LD, agenzie, scaduti, senza data, fuori famiglia, Lavora con noi');

const conSegnale = run(verifica, { nodes: { 'Valida richiesta': [jobA], 'Serve verifica annuncio?': [prospetto({})] }, json: { html: readFileSync(join(fx, 'job-ad-jsonld.html'), 'utf8') } }).json;
const scartato = { ...conSegnale, _scarto_segnale: 'annuncio_agenzia_per_il_lavoro' };
const ris = run(classifica, {
  nodes: { 'Valida richiesta': [{ ...jobA, email_mode: 'mixed' }], 'Normalizza output AI': lotti },
  input: [{ ...conSegnale, email_site: 'info@rossimeccanica.it', email_site_type: 'generic', email_site_source: 'https://rossimeccanica.it' }, scartato]
})[0].json;
assert.equal(ris.leads.length, 1);
assert.equal(ris.leads[0].signals[0].code, 'job_ad');
assert.equal(ris.leads[0].signals[0].evidence.date, '2026-09-28');
assert.equal(ris.rejected[0].reason, 'annuncio_agenzia_per_il_lavoro');
assert.deepEqual(ris.stats.signal_discards, { annuncio_agenzia_per_il_lavoro: 1 });
assert.equal(ris.stats.leads_with_signals, 1);
console.log('ok  risultati: prova dell annuncio sul lead, scarti per segnale nelle statistiche');

// 7. Claude come motore di ricerca: richiesta, risposta, ripresa dopo pause_turn, errori
assert.equal(job.ai.model, 'claude-sonnet-5-5');
const lottoC = { lotto: 1, paese: 'Italia', focus: 'Milano', prompt: 'Cerca...' };
const req = run(src('10-richiesta-claude.js'), { nodes: { 'Valida richiesta': [job] }, json: lottoC }).json._claude;
assert.equal(req.model, 'claude-sonnet-5-5');
assert.equal(req.tools[0].type, 'web_search_20250305');
assert.equal(req.messages[0].content, 'Cerca...');
assert.equal(req.temperature, undefined, 'niente parametri di campionamento: i modelli recenti li rifiutano');
const esito = (fase, json, prima) => run(src('11-esito-claude.template.js', { __FASE__: fase }), {
  nodes: { 'Prepara richiesta Claude': [{ _claude: req }], 'Esito ricerca Claude': [prima || {}] }, json
}).json;
const ok = esito('PRIMA', { stop_reason: 'end_turn', content: [
  { type: 'server_tool_use', name: 'web_search' }, { type: 'web_search_tool_result', content: [] },
  { type: 'text', text: '{"candidates":' }, { type: 'text', text: '[]}' }
], usage: { input_tokens: 1000, output_tokens: 200, server_tool_use: { web_search_requests: 3 } } });
assert.equal(ok.output, '{"candidates":[]}');
assert.equal(ok._continua, false);
assert.equal(ok.usage.web_search_requests, 3);
// Niente cache dei prompt: una richiesta con ricerca web è pagata una volta sola, la cache aggiungeva il 25% (test del 14/10).
assert.equal(req.cache_control, undefined);
const conCache = esito('PRIMA', { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"candidates":[]}' }],
  usage: { input_tokens: 1000, cache_creation_input_tokens: 8000, cache_read_input_tokens: 50000, output_tokens: 10 } });
assert.equal(conCache.usage.input_tokens, 1000 + 10000 + 5000, 'costo equivalente: scrittura 1,25×, lettura 0,1×');
const pausa = esito('PRIMA', { stop_reason: 'pause_turn', content: [{ type: 'text', text: '{"candidates":[' }, { type: 'server_tool_use', name: 'web_search' }] });
assert.equal(pausa._continua, true);
assert.equal(pausa._claude_seguito.messages.length, 2);
assert.equal(pausa._claude_seguito.messages[1].role, 'assistant');
const seguito = esito('SEGUITO', { stop_reason: 'end_turn', content: [{ type: 'text', text: ']}' }] }, pausa);
assert.equal(seguito.output, '{"candidates":[]}');
assert.equal(seguito._continua, false, 'una sola ripresa');
const errApi = esito('PRIMA', { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } });
assert.equal(errApi.error.message, 'Overloaded');
const norm = run(src('03-normalizza-output-ai.js'), { nodes: { 'Prepara lotti': [lottoC] }, json: errApi }).json;
assert.equal(norm.stato_lotto, 'ERRORE');
const normOk = run(src('03-normalizza-output-ai.js'), { nodes: { 'Prepara lotti': [lottoC] }, json: { output: '{"candidates":[{"company_name":"Acme"}]}' } }).json;
assert.equal(normOk.candidates.length, 1);
console.log('ok  Claude: richiesta con ricerca web, testo finale, ripresa dopo pause_turn, errori API');

// 8. Annunci in due passaggi: aziende senza referente, poi ricerca mirata del referente
const senzaPersona = run(src('04-deduplica-candidati.js'), { nodes: { 'Valida richiesta': [jobA] }, input: [{ candidates: [
  { company_name: 'Brugola Spa', website: 'https://brugola.com', city: 'Lissone', job_ad_url: 'https://brugola.com/posizione-aperta-it-system-administrator/', job_ad_title: 'IT System Administrator' },
  { company_name: 'Senza Annuncio', website: 'https://senza.it' }
], lotto: 1 }] }).map(i => i.json);
assert.equal(senzaPersona.length, 1);
assert.equal(senzaPersona[0]._serve_referente, true);
assert.equal(senzaPersona[0].source_url, 'https://brugola.com/posizione-aperta-it-system-administrator/');
assert.equal(senzaPersona[0].person_key, '|brugola.com');
const reqRef = run(src('12-prepara-referente.js'), { nodes: { 'Valida richiesta': [jobA] }, json: senzaPersona[0] }).json._claude_ref;
assert.match(reqRef.messages[0].content, /Brugola Spa/);
assert.equal(reqRef.tools[0].max_uses, 1, 'una sola ricerca web mirata');
assert.equal(reqRef.model, 'claude-haiku-5-5', 'referente via web con Haiku');
const esitoRef = (testoRisposta, extra = {}) => run(src('13-esito-referente.template.js', { __FASE__: 'WEB', __ORIGINE__: 'Prepara ricerca referente' }), {
  nodes: { 'Valida richiesta': [jobA], 'Prepara ricerca referente': [{ ...senzaPersona[0], _claude_ref: {} }] },
  json: { content: [{ type: 'text', text: testoRisposta }], ...extra }
}).json;
const trovato = esitoRef('{"person":{"full_name":"Marco Brugola","job_title":"CEO e titolare","source_url":"https://brugola.com/chi-siamo","contact_page":"https://brugola.com/contatti","linkedin_url":""}}');
assert.equal(trovato._scarto_segnale, undefined);
assert.equal(trovato.person_key, 'marco brugola|brugola.com');
assert.equal(trovato.role_match, 'exact');
assert.equal(trovato.contact_page, 'https://brugola.com/contatti');
assert.equal(trovato.first_name, 'Marco');
assert.equal(esitoRef('{"person":null}')._scarto_segnale, 'referente_non_trovato');
const esitoGeneriche = run(src('13-esito-referente.template.js', { __FASE__: 'WEB', __ORIGINE__: 'Prepara ricerca referente' }), {
  nodes: { 'Valida richiesta': [{ ...jobA, email_mode: 'generic_ok' }], 'Prepara ricerca referente': [{ ...senzaPersona[0], _claude_ref: {} }] },
  json: { content: [{ type: 'text', text: '{"person":null}' }] }
}).json;
assert.equal(esitoGeneriche._scarto_segnale, undefined, 'generiche incluse: azienda senza referente ammessa');
assert.equal(esitoGeneriche._senza_referente, true);
assert.equal(esitoGeneriche.person_key, '|brugola.com');
const haikuUso = esitoRef('{"person":null}', { model: 'claude-haiku-5-5', usage: { input_tokens: 24000, output_tokens: 200, server_tool_use: { web_search_requests: 2 } } });
assert.equal(haikuUso.ai_input_tokens, 1200, 'token Haiku a prezzo Sonnet equivalente');
assert.equal(haikuUso.ai_output_tokens, 10);
assert.equal(haikuUso.ai_web_searches, 2);
assert.equal(esitoRef('nessun JSON')._scarto_segnale, 'referente_non_trovato');
assert.equal(esitoRef('{"person":{"full_name":"Marco Brugola","job_title":"CEO","source_url":"http://10.0.0.1/x"}}')._scarto_segnale, 'referente_non_trovato', 'fonte su IP interno');
const altroSito = esitoRef('{"person":{"full_name":"Marco Brugola","job_title":"CEO","source_url":"https://registro.it/x","contact_page":"https://evil.example.org/c"}}');
assert.equal(altroSito.contact_page, '', 'pagina contatti di un altro dominio ignorata (verrebbe scaricata)');
assert.equal(esitoRef('', { type: 'error', error: { message: 'x' } })._scarto_segnale, 'referente_errore_ricerca');
assert.equal(esitoRef('{"person":{"full_name":"Massimo (cognome non indicato)","job_title":"Titolare","source_url":"https://brugola.com/x"}}')._scarto_segnale, 'referente_non_trovato', 'nota dell AI al posto del nome');

// Referente dal sito: testo già scaricato, senza ricerca web; se manca si passa al web.
const conTesto = { ...senzaPersona[0], _testo_home: 'Brugola Spa, viti e bulloni dal 1926. '.repeat(10), _pagina_referente: 'https://brugola.com/chi-siamo' };
const reqSito = run(src('16-prepara-referente-sito.js'), { nodes: { 'Valida richiesta': [jobA], 'Serve pagina referente?': [conTesto] },
  json: { html: '<p>Fondata da Marco Brugola, CEO e titolare.</p>' } }).json;
assert.equal(reqSito._referente_sito, true);
assert.equal(reqSito._claude_sito.tools, undefined, 'nessuna ricerca web');
assert.match(reqSito._claude_sito.messages[0].content, /Fondata da Marco Brugola/);
assert.equal(reqSito._testo_home, undefined, 'testo non portato avanti');
const esitoSito = (testoRisposta) => run(src('13-esito-referente.template.js', { __FASE__: 'SITO', __ORIGINE__: 'Prepara referente dal sito' }), {
  nodes: { 'Valida richiesta': [jobA], 'Prepara referente dal sito': [reqSito] },
  json: { content: [{ type: 'text', text: testoRisposta }], usage: { input_tokens: 3000, output_tokens: 80 } }
}).json;
const dalSito = esitoSito('{"person":{"full_name":"Marco Brugola","job_title":"CEO e titolare","source_url":"https://brugola.com/chi-siamo"}}');
assert.equal(dalSito._cerca_web, false);
assert.equal(dalSito.person_key, 'marco brugola|brugola.com');
assert.equal(dalSito.source_url, 'https://brugola.com/chi-siamo');
assert.equal(dalSito.ai_input_tokens, 3000);
assert.equal(esitoSito('{"person":{"full_name":"Marco Brugola","job_title":"CEO","source_url":"https://altro.it/x"}}').source_url, 'https://brugola.com/', 'fonte fuori dalle pagine lette: la homepage');
const nonTrovato = esitoSito('{"person":null}');
assert.equal(nonTrovato._cerca_web, true);
assert.equal(nonTrovato._scarto_segnale, undefined);
assert.match(reqSito._claude_sito.messages[0].content, /anche senza la parola esatta del ruolo/, 'regola ampia: chi guida l azienda');

// Il nome è un valore aggiunto (17/10): per modalità, cosa succede senza referente.
const esitoModo = (fase, mode, testoRisposta = '{"person":null}') => run(src('13-esito-referente.template.js',
  fase === 'SITO' ? { __FASE__: 'SITO', __ORIGINE__: 'Prepara referente dal sito' } : { __FASE__: 'WEB', __ORIGINE__: 'Prepara ricerca referente' }), {
  nodes: { 'Valida richiesta': [{ ...jobA, email_mode: mode }], 'Prepara referente dal sito': [reqSito], 'Prepara ricerca referente': [{ ...senzaPersona[0], _claude_ref: {} }] },
  json: { content: [{ type: 'text', text: testoRisposta }] }
}).json;
assert.equal(esitoModo('SITO', 'generic_ok')._senza_referente, true, 'generiche: niente web, lead senza nome');
assert.equal(esitoModo('SITO', 'generic_ok')._cerca_web, false);
assert.equal(esitoModo('SITO', 'mixed')._cerca_web, true, 'mista: prima prova il web');
assert.equal(esitoModo('WEB', 'mixed')._senza_referente, true, 'mista: poi lead senza nome');
assert.equal(esitoModo('WEB', 'mixed')._scarto_segnale, undefined);
assert.equal(esitoModo('WEB', 'personal_only')._scarto_segnale, 'referente_non_trovato', 'solo nominative: nome obbligatorio');
assert.equal(esitoModo('SITO', 'personal_only')._cerca_web, true);
const senzaTesto = run(src('16-prepara-referente-sito.js'), { nodes: { 'Valida richiesta': [{ ...jobA, email_mode: 'generic_ok' }], 'Serve pagina referente?': [{ ...senzaPersona[0], _testo_home: '' }] },
  json: {} }).json;
assert.equal(senzaTesto._referente_sito, false);
assert.equal(senzaTesto._senza_referente, true, 'generiche senza testo: nessuna ricerca web');
const senzaTestoMista = run(src('16-prepara-referente-sito.js'), { nodes: { 'Valida richiesta': [{ ...jobA, email_mode: 'mixed' }], 'Serve pagina referente?': [{ ...senzaPersona[0], _testo_home: '' }] },
  json: {} }).json;
assert.equal(senzaTestoMista._senza_referente, undefined, 'mista senza testo: ricerca web');

// Tetto ai referenti: oltre il tetto le aziende restano in riserva (prima la riserva già pagata).
const scegli = src('15-scegli-referenti.js');
const conSegnaleRef = (n, extra = {}) => ({ company_name: `A${n}`, domain: `a${n}.it`, _serve_referente: true, signals: [{ code: 'no_mobile', status: 'pass' }], ...extra });
const sceltiRef = run(scegli, { nodes: { 'Valida richiesta': [{ ...jobA, limits: { ...jobA.limits, referenti_max: 2 } }] },
  input: [conSegnaleRef(1), conSegnaleRef(2), { company_name: "Nominativo", _serve_referente: false }, conSegnaleRef(3, { _riserva: true })] }).map(i => i.json);
assert.deepEqual(sceltiRef.map(p => p._scarto_segnale ?? 'ok'), ['ok', 'riserva', 'ok', 'ok']);
console.log('ok  annunci in due passaggi: aziende senza referente, referente dal sito e dal web, tetto e riserva');

// 9. Segnali dal sito sulle pagine di prova (fase 2)
const cmsJson = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'lib', 'domain', 'cms-releases.json'), 'utf8');
const valuta = src('14-valuta-segnali-sito.js', { __CMS_RELEASES__: cmsJson });
const SITO = ['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine'];
const jobSito = (codes, match = 'any') => ({ ...job, today: '2026-10-13', target: { ...job.target, signals: { codes, match, job_families: [], max_age_days: 60 } } });
const prospettoSito = { company_name: 'Prova', website: 'https://prova.it/', domain: 'prova.it', signals: [] };
const valutaFile = (file, codes = SITO, https = undefined, match = 'any') => run(valuta, {
  nodes: { 'Valida richiesta': [jobSito(codes, match)], 'Serve controllo sito?': [prospettoSito], 'HTTP - Sito (segnali)': [{ html: readFileSync(join(fx, file), 'utf8') }] },
  json: https ?? prospettoSito
}).json;
for (const [file, info] of Object.entries(attesi)) {
  if (typeof info.expect !== 'object') continue;
  const r = valutaFile(file);
  for (const [code, atteso] of Object.entries(info.expect)) {
    if (code === 'technology') { assert.deepEqual(r.technologies, atteso, `${file}: tecnologie`); continue; }
    const s = r.signals.find(x => x.code === code);
    assert.equal(s?.status, atteso, `${file}: ${code} = ${s?.status} invece di ${atteso}`);
  }
}
const vecchioWp = valutaFile('site-old-wp.html', ['outdated_cms']);
assert.match(vecchioWp.signals[0].evidence.detail, /WordPress 5\.4\.2/);
assert.equal(vecchioWp._scarto_segnale, undefined);
const moderno = valutaFile('site-modern.html', ['no_mobile', 'outdated_cms']);
assert.equal(moderno._scarto_segnale, 'segnale_assente');
const jsOnly = valutaFile('site-js-only.html', ['outdated_cms']);
assert.equal(jsOnly._scarto_segnale, 'segnale_non_determinabile');
const tutti = valutaFile('site-old-wp.html', ['no_mobile', 'single_language'], undefined, 'all');
assert.equal(tutti._scarto_segnale, undefined, 'servono tutti: presenti tutti');
// Versione di jQuery in wp-includes: non è la versione di WordPress (falso positivo del 14/10).
const valutaHtml = (html, codes) => run(valuta, {
  nodes: { 'Valida richiesta': [jobSito(codes)], 'Serve controllo sito?': [prospettoSito], 'HTTP - Sito (segnali)': [{ html }] },
  json: prospettoSito
}).json;
const paginaWp = (script) => `<html><head><meta name="viewport" content="width=device-width">${script}</head><body>${'Testo della pagina aziendale. '.repeat(20)}</body></html>`;
const conJquery = valutaHtml(paginaWp('<script src="/wp-includes/js/jquery/jquery.min.js?ver=3.7.1"></script><script src="/wp-includes/js/masonry.min.js?ver=4.2.2"></script>'), ['outdated_cms']);
assert.equal(conJquery.signals.find(x => x.code === 'outdated_cms').status, 'undetermined', 'jQuery 3.7.1 non è WordPress 3.7.1');
const conEmoji = valutaHtml(paginaWp('<script src="/wp-includes/js/wp-emoji-release.min.js?ver=5.2.4"></script>'), ['outdated_cms']);
assert.equal(conEmoji.signals.find(x => x.code === 'outdated_cms').status, 'pass', 'versione di WordPress dal file delle emoji');
assert.match(conEmoji.signals.find(x => x.code === 'outdated_cms').evidence.detail, /WordPress 5\.2\.4/);
const indicativo = valutaFile('site-modern.html', ['stale_copyright']);
assert.equal(indicativo._scarto_segnale, undefined, 'gli indicativi non scartano mai');
const httpsOk = valutaFile('site-modern.html', ['no_https'], { https_body: '<html></html>' });
assert.equal(httpsOk.signals[0].status, 'fail');
const httpsCert = valutaFile('site-modern.html', ['no_https'], { error: { message: 'certificate has expired' } });
assert.equal(httpsCert.signals[0].status, 'pass');
const httpsBoh = valutaFile('site-modern.html', ['no_https'], { error: { message: 'ETIMEDOUT' } });
assert.equal(httpsBoh.signals[0].status, 'undetermined');
const senzaSegnali = run(valuta, { nodes: { 'Valida richiesta': [job], 'Serve controllo sito?': [prospettoSito], 'HTTP - Sito (segnali)': [{ html: '' }] }, json: prospettoSito }).json;
assert.deepEqual(senzaSegnali, prospettoSito, 'ricerche senza segnali: nessun cambiamento');

// Ricerca in target: scansione completa della homepage già scaricata, senza scarti.
const scansiona = src('14-valuta-segnali-sito.js', { __CMS_RELEASES__: cmsJson, __MODO__: 'SCANSIONA' });
const jobTarget = { ...job, today: '2026-10-13' };
const scan = run(scansiona, { nodes: { 'Valida richiesta': [jobTarget], 'Estrai email homepage': [{ ...prospettoSito, page_1: 'https://prova.it/contatti' }],
  'HTTP - Homepage': [{ html: readFileSync(join(fx, 'site-old-wp.html'), 'utf8') }] }, json: {} }).json;
assert.equal(scan._scarto_segnale, undefined, 'la scansione non scarta mai');
assert.equal(scan.page_1, 'https://prova.it/contatti', 'il resto del prospect passa invariato');
assert.deepEqual(scan.signals.map(x => x.code).sort(), SITO.filter(c => c !== 'no_https').sort(), 'tutti i controlli tranne HTTPS');
assert.equal(scan.signals.find(x => x.code === 'outdated_cms').status, 'pass');
assert.ok(scan.technologies.includes('wordpress'));
const giaControllato = run(scansiona, { nodes: { 'Valida richiesta': [jobSito(['no_mobile'])], 'Estrai email homepage': [prospettoSito],
  'HTTP - Homepage': [{ html: '' }] }, json: {} }).json;
assert.deepEqual(giaControllato, prospettoSito, 'ricerca opportunità: controlli già fatti prima del referente');

// Risultati: tutti i controlli (anche degli scartati) per il database; sul lead solo i segnali richiesti.
const conControlli = run(classifica, { nodes: { 'Valida richiesta': [{ ...job, email_mode: 'mixed' }], 'Normalizza output AI': [{ stato_lotto: 'OK' }] }, input: [
  { company_name: 'Lead', domain: 'lead.it', website: 'https://lead.it', full_name: 'Mario Rossi', role_match: 'exact', source_url: 'https://lead.it',
    email_site: 'info@lead.it', email_site_type: 'generic', technologies: ['wordpress'], signals: scan.signals },
  { company_name: 'Scartata', domain: 'scartata.it', website: 'https://scartata.it', _scarto_segnale: 'segnale_assente',
    signals: [{ code: 'no_mobile', status: 'fail', evidence: {} }] }
] })[0].json;
assert.equal(conControlli.company_checks.length, 2, 'anche l azienda scartata finisce nel database');
assert.equal(conControlli.company_checks[0].company.domain, 'lead.it');
assert.equal(conControlli.company_checks[1].checks[0].status, 'fail');
assert.deepEqual(conControlli.leads[0].signals, [], 'ricerca in target: nessun segnale sul lead (non richiesto né pagato)');
console.log('ok  database aziende: scansione in target, controlli di tutte le aziende nei risultati');
console.log('ok  segnali dal sito: viewport, CMS, lingue, copyright, costruzione, booking, HTTPS, decisione');
console.log('\nTutti i test superati.');
