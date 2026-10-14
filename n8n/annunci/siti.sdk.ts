import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Ogni mattina, dopo la raccolta annunci, cerca il sito delle aziende degli annunci che
// non l'hanno ancora: prova i domini più probabili dal nome e accetta solo le pagine che
// contengono il nome dell'azienda (livello 2, gratuito). Esiti in company_resolutions,
// aziende trovate in companies con gli annunci collegati.

const ogniGiorno = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni mattina',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 6, triggerAtMinute: 40 }] } }
  }
});

const aMano = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'A mano' }
});

const aziende = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Aziende senza sito',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies?limit=150',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ companies: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', ads: 2 }] }]
});

const candidati = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Domini candidati',
    parameters: { jsCode: "// Domini probabili per le aziende degli annunci senza sito (livello 2, gratuito).\n// Dal nome, nell'ordine: parole distintive unite («Gruppo Maggioli» -> maggioli), le prime\n// due («Max Mara Fashion» -> maxmara), tutte le parole, col trattino; .it e .com.\n// Al massimo 6 tentativi per azienda.\nconst risposta = $input.first()?.json || {};\nconst aziende = Array.isArray(risposta.companies) ? risposta.companies : [];\n\nconst norm = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()\n  .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim();\nconst FORME = new Set(['srl', 'srls', 'spa', 'sas', 'snc', 'sapa', 'scarl', 'scrl', 'soc', 'coop', 'societa', 'cooperativa',\n  'unipersonale', 's', 'r', 'l', 'p', 'a', 'c', 'e', 'di', 'del', 'della', 'the', 'and', 'ltd', 'inc', 'gmbh', 'ag', 'sa', 'bv']);\nconst GENERICHE = new Set(['group', 'gruppo', 'italia', 'italy', 'italiana', 'holding', 'international', 'filiale', 'sede']);\n\nconst out = [];\nfor (const a of aziende) {\n  const parole = norm(a.company_name).split(' ').filter(w => w && !FORME.has(w));\n  const nucleo = parole.filter(w => !GENERICHE.has(w));\n  if (!nucleo.length) continue;\n  const slug = [\n    nucleo.join(''),\n    nucleo.length > 2 ? nucleo.slice(0, 2).join('') : '',\n    parole.join(''),\n    nucleo.length > 1 ? nucleo.join('-') : '',\n    nucleo.length > 1 && nucleo[0].length >= 5 ? nucleo[0] : ''\n  ].filter((s, i, all) => s.length >= 3 && s.length <= 40 && all.indexOf(s) === i);\n  const domini = slug.flatMap(s => [`${s}.it`, `${s}.com`]).slice(0, 6);\n  domini.forEach((d, ordine) => out.push({ json: {\n    company_key: a.company_key, company_name: a.company_name, city: a.city || '',\n    nucleo: nucleo.join(' '), nome: parole.join(' '), domain: d, ordine, url: `https://${d}`\n  } }));\n}\nreturn out;\n" }
  },
  output: [{ company_key: 'var', company_name: 'Var Group', city: 'Bologna', nucleo: 'var', nome: 'var group', domain: 'vargroup.it', ordine: 2, url: 'https://vargroup.it' }]
});

const apriSito = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri sito',
    parameters: {
      url: expr('{{ $json.url }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 10, batchInterval: 300 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        timeout: 8000
      }
    },
    // Un dominio inesistente o lento non deve fermare il giro.
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const scegli = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Scegli sito',
    parameters: { jsCode: "// Sceglie il sito di ogni azienda tra i domini provati: la pagina deve esistere, non\n// essere un dominio parcheggiato o in vendita e contenere il nome dell'azienda (tutte le\n// parole distintive, o il nome scritto attaccato). Con una sola parola distintiva serve\n// il nome intero se ha parole generiche («Var Group»: var.it di «Var Sport» non va),\n// altrimenti il nome nel titolo o nella descrizione («Digital», «ENG»: nel testo\n// comparirebbero per caso).\n// Un'azienda senza dominio valido viene salvata come «non trovata» (si riprova tra 30 giorni).\nconst candidati = $('Domini candidati').all().map(i => i.json);\nconst pagine = $input.all().map(i => i.json);\n\nconst norm = (v) => ` ${String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()\n  .replace(/&[a-z]+;/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim()} `;\nconst testo = (h) => String(h ?? '').replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>/gi, ' ')\n  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&');\nconst PARCHEGGIATO = /\\b((domain|dominio) (is )?(for sale|in vendita|acquistabile)|buy this domain|this domain (is|may be) for sale|sedo|dan com|parkingcrew|bodis|domain parking|parked (free|domain)|registra il tuo dominio|questo dominio e stato registrato|hugedomains|afternic)\\b/;\n\nconst valuta = (c, p) => {\n  const html = String(p?.html ?? '');\n  if (html.length < 500) return 'irraggiungibile';\n  const corpo = norm(testo(html).slice(0, 150000));\n  if (PARCHEGGIATO.test(corpo)) return 'parcheggiato';\n  const titolo = norm(testo((html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i) || [])[1]));\n  const meta = norm((html.match(/<meta[^>]+(?:og:site_name|og:title|description)[^>]+content=[\"']([^\"']+)/i) || [])[1]);\n  const tutto = `${titolo}${meta}${corpo}`;\n  const parole = c.nucleo.split(' ').filter(Boolean);\n  const attaccato = parole.join('');\n  if (parole.length === 1) {\n    const nome = String(c.nome || attaccato);\n    if (nome !== attaccato) return tutto.includes(` ${nome} `) || tutto.includes(` ${nome.replace(/ /g, '')} `) ? 'ok' : 'nome_assente';\n    return `${titolo}${meta}`.includes(` ${attaccato} `) ? 'ok' : 'nome_assente';\n  }\n  if (parole.every(w => tutto.includes(` ${w} `))) return 'ok';\n  if (tutto.replace(/ /g, '').includes(attaccato)) return 'ok';\n  return 'nome_assente';\n};\n\nconst esiti = new Map();\n// Anche le aziende senza domini da provare (nome fatto solo di parole generiche).\nfor (const a of $('Aziende senza sito').first().json.companies || []) {\n  esiti.set(a.company_key, { company_key: a.company_key, company_name: a.company_name, city: a.city || '', domain: '', method: 'guess', ordine: 99 });\n}\nconst stats = { companies: 0, tried: candidati.length, found: 0, not_found: 0, unreachable: 0, parked: 0, name_missing: 0 };\ncandidati.forEach((c, i) => {\n  const e = esiti.get(c.company_key) || { company_key: c.company_key, company_name: c.company_name, city: c.city, domain: '', method: 'guess', ordine: 99 };\n  const v = valuta(c, pagine[i]);\n  if (v === 'irraggiungibile') stats.unreachable++;\n  else if (v === 'parcheggiato') stats.parked++;\n  else if (v === 'nome_assente') stats.name_missing++;\n  if (v === 'ok' && c.ordine < e.ordine) { e.domain = c.domain; e.ordine = c.ordine; }\n  esiti.set(c.company_key, e);\n});\n\nconst results = [...esiti.values()].map(({ ordine, ...e }) => e);\nstats.companies = results.length;\nstats.found = results.filter(r => r.domain).length;\nstats.not_found = stats.companies - stats.found;\nreturn [{ json: { results, stats } }];\n" }
  },
  output: [{ results: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva siti',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/job-ads/companies',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ results: $json.results }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ ok: true, found: 0, not_found: 0, linked_ads: 0 }]
});

export default workflow('annunci-siti', 'Annunci | Siti aziende', {
  timezone: 'Europe/Rome',
  errorWorkflow: 'LOw3fRo49WKvrF6z',
  executionOrder: 'v1'
})
  .add(ogniGiorno)
  .to(aziende)
  .to(candidati)
  .to(apriSito)
  .to(scegli)
  .to(salva)
  .add(aMano)
  .to(aziende);
