import { workflow, node, trigger, sticky, newCredential, ifElse, merge, languageModel, expr } from '@n8n/workflow-sdk';

const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook: nuova ricerca',
    parameters: {
      httpMethod: 'POST',
      path: 'lead-engine/v1/search',
      authentication: 'headerAuth',
      responseMode: 'onReceived',
      options: { responseData: '{"accepted":true}' }
    },
    credentials: { httpHeaderAuth: newCredential('Lead Engine - Webhook in ingresso') }
  },
  output: [{ body: { job_id: '0b8e7c1e-1111-4222-8333-944455556666', run_id: 'r1', run_token: 'x', callback_url: 'https://app.example.it/api/engine/callback', email_mode: 'mixed', quantity: 25, target: { country_names: ['Italia'], industry: 'Software house', roles: ['CEO'] }, exclusions: { domains: [], person_keys: [] }, limits: { enrichment_cap: 10 } } }]
});

const valida = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Valida richiesta', parameters: { mode: 'runOnceForAllItems', jsCode: "// Valida e normalizza la richiesta arrivata dal backend (contratto v1).\n// Il backend ha gi\u00e0 controllato piano e crediti: qui ci limitiamo a\n// rifiutare payload incompleti e a preparare il brief per l'AI.\n// URL di callback ammessi: SOLO il backend della piattaforma (anti-SSRF).\n// Dominio della piattaforma (anche sottodomini, es. leads.weborastudio.it).\nconst DOMINIO_PIATTAFORMA = 'weborastudio.it';\nconst esc = (s) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');\nconst CALLBACK_AMMESSI = [\n  new RegExp(`^https://([a-z0-9-]+\\\\.)?${esc(DOMINIO_PIATTAFORMA)}/api/engine/callback$`, 'i')\n];\n\nconst raw = $input.first().json;\nconst b = raw.body && typeof raw.body === 'object' ? raw.body : raw;\n\nconst str = (v, max = 300) => String(v ?? '').trim().replace(/\\s+/g, ' ').slice(0, max);\nconst list = (v, max = 30) => (Array.isArray(v) ? v : (v ? [v] : []))\n  .map(x => str(x, 120)).filter(Boolean).slice(0, max);\nconst clamp = (n, min, max, def) => {\n  const x = Number(n);\n  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : def;\n};\n\nconst errori = [];\nconst t = b.target || {};\n\nconst job = {\n  contract_version: Number(b.contract_version) || 1,\n  job_id: str(b.job_id, 64),\n  run_id: str(b.run_id, 64),\n  run_token: str(b.run_token, 128),\n  callback_url: str(b.callback_url, 300),\n  email_mode: ['generic_ok', 'personal_only', 'mixed'].includes(b.email_mode) ? b.email_mode : 'mixed',\n  quantity: clamp(b.quantity, 1, 500, 25),\n  contacts_per_company: clamp(b.contacts_per_company, 1, 3, 1),\n  language: str(b.language, 5) || 'it',\n  target: {\n    countries: list(t.countries),\n    country_names: list(t.country_names),\n    regions: list(t.regions),\n    industry: str(t.industry, 200),\n    industry_keywords: list(t.industry_keywords),\n    company_size: list(t.company_size, 6),\n    revenue_range: str(t.revenue_range, 60),\n    roles: list(t.roles, 12),\n    keywords: list(t.keywords, 15),\n    exclude_keywords: list(t.exclude_keywords, 15),\n    notes: str(t.notes, 600)\n  },\n  exclusions: {\n    domains: list((b.exclusions || {}).domains, 20000),\n    person_keys: list((b.exclusions || {}).person_keys, 20000)\n  },\n  limits: {\n    max_lots: clamp((b.limits || {}).max_lots, 1, 20, 6),\n    candidates_per_lot: clamp((b.limits || {}).candidates_per_lot, 5, 30, 20),\n    enrichment_cap: clamp((b.limits || {}).enrichment_cap, 0, 500, 0)\n  }\n};\n\nif (!/^[0-9a-f-]{8,64}$/i.test(job.job_id)) errori.push('job_id mancante o non valido');\nif (!job.run_id) errori.push('run_id mancante');\nif (job.run_token.length < 24) errori.push('run_token mancante');\nif (!CALLBACK_AMMESSI.some(r => r.test(job.callback_url))) errori.push('callback_url non ammesso');\nif (!job.target.industry && !job.target.industry_keywords.length) errori.push('settore mancante');\nif (!job.target.countries.length && !job.target.country_names.length) errori.push('paese mancante');\n\n// Lotti: sovracampioniamo (deduplica, siti senza email, ruoli non coerenti\n// fanno perdere in media 40-60% dei candidati), entro il limite del backend.\nconst SOVRACAMPIONAMENTO = job.email_mode === 'personal_only' ? 2.6 : 1.8;\nconst lotti = Math.min(\n  job.limits.max_lots,\n  Math.max(1, Math.ceil(job.quantity * SOVRACAMPIONAMENTO / job.limits.candidates_per_lot))\n);\n\nconst paesi = job.target.country_names.length ? job.target.country_names : job.target.countries;\nconst brief = [\n  `Settore: ${job.target.industry || job.target.industry_keywords.join(', ')}`,\n  job.target.industry_keywords.length ? `Parole chiave del settore: ${job.target.industry_keywords.join(', ')}` : '',\n  `Paesi: ${paesi.join(', ')}`,\n  job.target.regions.length ? `Aree / citt\u00e0: ${job.target.regions.join(', ')}` : '',\n  job.target.company_size.length ? `Dimensione azienda (dipendenti): ${job.target.company_size.join(', ')}` : '',\n  job.target.revenue_range ? `Fatturato indicativo: ${job.target.revenue_range}` : '',\n  `Ruoli da contattare: ${job.target.roles.length ? job.target.roles.join(', ') : 'titolare / CEO / fondatore'}`,\n  job.target.keywords.length ? `Parole chiave aggiuntive: ${job.target.keywords.join(', ')}` : '',\n  job.target.exclude_keywords.length ? `Da escludere: ${job.target.exclude_keywords.join(', ')}` : '',\n  job.target.notes ? `Note del cliente: ${job.target.notes}` : ''\n].filter(Boolean).join('\\n');\n\nconst planner_prompt = [\n  'Sei un analista di lead generation B2B. Dividi la ricerca qui sotto in',\n  `${lotti} LOTTI DI RICERCA DIVERSI, che non si sovrappongano (aree geografiche,`,\n  'citt\u00e0, sotto-nicchie o tipologie di azienda diverse), in modo che ricerche web',\n  'separate trovino aziende diverse.',\n  '',\n  'RICERCA',\n  brief,\n  '',\n  'Per ogni lotto indica il paese, il focus (in italiano) e 3-5 query di ricerca',\n  'nella LINGUA LOCALE del paese, come le scriverebbe una persona del posto.',\n  '',\n  'Restituisci ESCLUSIVAMENTE JSON valido:',\n  '{\"lotti\":[{\"paese\":\"\",\"focus\":\"\",\"query\":[\"\",\"\"]}]}'\n].join('\\n');\n\nreturn [{\n  json: {\n    ...job,\n    valida: errori.length === 0,\n    errori,\n    lotti_previsti: lotti,\n    brief,\n    planner_prompt\n  }\n}];\n" } },
  output: [{ job_id: '0b8e7c1e-1111-4222-8333-944455556666', valida: true, errori: [], callback_url: 'https://app.example.it/api/engine/callback', planner_prompt: '...', lotti_previsti: 3 }]
});

const richiestaValida = ifElse({
  version: 2.2,
  config: {
    name: 'Richiesta valida?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $json.valida }}"), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const rifiuta = node({
  type: 'n8n-nodes-base.stopAndError',
  version: 1,
  config: {
    name: 'Richiesta rifiutata',
    parameters: { errorMessage: expr('Richiesta non valida: {{ $json.errori.join(", ") }}') }
  }
});

const notificaAvvio = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Notifica: ricerca avviata',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("{{ $('Valida richiesta').first().json.callback_url }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ event: 'progress', contract_version: 1, job_id: $('Valida richiesta').first().json.job_id, run_id: $('Valida richiesta').first().json.run_id, run_token: $('Valida richiesta').first().json.run_token, stage: 'planning', message: 'Pianificazione della ricerca', counters: { lots_planned: $('Valida richiesta').first().json.lotti_previsti } }) }}"),
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: newCredential('Lead Engine - Callback verso backend') }
  },
  output: [{ ok: true }]
});

const modelloPlanner = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI (pianificazione)',
    parameters: { model: { __rl: true, mode: 'id', value: 'gpt-5.6-luna' }, options: { timeout: 120000 } },
    credentials: { openAiApi: { id: 'ZQVz3FqwCrCMFcB9', name: 'OpenAi account' } }
  }
});

const planner = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Pianifica lotti AI',
    parameters: {
      promptType: 'define',
      text: expr("{{ $('Valida richiesta').first().json.planner_prompt }}"),
      options: { systemMessage: 'Sei un analista di lead generation B2B. Rispondi solo con JSON valido.', maxIterations: 3 }
    },
    subnodes: { model: modelloPlanner }
  },
  output: [{ output: '{"lotti":[{"paese":"Italia","focus":"Software house a Milano","query":["software house Milano"]}]}' }]
});

const prepara = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Prepara lotti', parameters: { mode: 'runOnceForAllItems', jsCode: "// Trasforma il piano dell'AI in N lotti di ricerca, ognuno con il proprio\n// prompt. Se il piano \u00e8 illeggibile, ripiega su lotti costruiti dai filtri\n// (paesi x aree) cos\u00ec la ricerca parte comunque.\nconst job = $('Valida richiesta').first().json;\n\nconst parse = (raw) => {\n  if (raw && typeof raw === 'object') return raw;\n  let s = String(raw ?? '').trim().replace(/^```(?:json)?\\s*/i, '').replace(/```\\s*$/i, '').trim();\n  const a = s.indexOf('{');\n  const b = s.lastIndexOf('}');\n  if (a >= 0 && b > a) s = s.slice(a, b + 1);\n  try { return JSON.parse(s); } catch { return null; }\n};\n\nconst piano = parse($input.first().json.output);\nlet lotti = Array.isArray(piano?.lotti) ? piano.lotti : [];\n\nlotti = lotti\n  .map(l => ({\n    paese: String(l?.paese ?? '').trim().slice(0, 80),\n    focus: String(l?.focus ?? '').trim().slice(0, 300),\n    query: (Array.isArray(l?.query) ? l.query : []).map(q => String(q).trim().slice(0, 160)).filter(Boolean).slice(0, 6)\n  }))\n  .filter(l => l.focus)\n  .slice(0, job.lotti_previsti);\n\nif (!lotti.length) {\n  const paesi = job.target.country_names.length ? job.target.country_names : job.target.countries;\n  const aree = job.target.regions.length ? job.target.regions : [''];\n  for (const p of paesi) for (const a of aree) {\n    lotti.push({ paese: p, focus: [job.target.industry, a].filter(Boolean).join(' - '), query: [] });\n  }\n  lotti = lotti.slice(0, job.lotti_previsti);\n}\n\nconst ruoli = job.target.roles.length ? job.target.roles.join(', ') : 'titolare, fondatore, CEO, amministratore delegato';\nconst perAzienda = job.contacts_per_company;\n\nconst prompt = (l, i) => [\n  `Cerca sul web fino a ${job.limits.candidates_per_lot} AZIENDE REALI con il relativo referente, come prospect commerciali B2B.`,\n  '',\n  `LOTTO ${i + 1} di ${lotti.length}`,\n  `PAESE: ${l.paese}`,\n  `FOCUS DEL LOTTO: ${l.focus}`,\n  l.query.length ? `QUERY SUGGERITE (lingua locale): ${l.query.join(' | ')}` : null,\n  '',\n  'TARGET DEL CLIENTE',\n  job.brief,\n  '',\n  'CHI CERCHIAMO',\n  `Per ogni azienda indica al massimo ${perAzienda} persona/e con uno di questi ruoli: ${ruoli}.`,\n  'Il ruolo deve risultare da una fonte pubblica (sito aziendale, pagina team, registro, articolo,',\n  'profilo professionale). Se non trovi nessuna persona con un ruolo coerente, NON inserire l\\'azienda.',\n  'Non indicare dipendenti junior, stagisti, consulenti esterni o personale amministrativo,',\n  'a meno che il ruolo non sia esplicitamente richiesto.',\n  '',\n  'SITO UFFICIALE OBBLIGATORIO',\n  '\"website\" deve essere il sito dell\\'azienda (dominio proprio). NON sono siti ufficiali: LinkedIn,',\n  'Facebook, Instagram, Google Maps, directory, pagine gialle, marketplace, articoli.',\n  'Usa directory e registri solo per SCOPRIRE i nomi, poi trova il sito ufficiale.',\n  'Se non trovi il sito ufficiale, scarta il candidato e passa al successivo.',\n  '',\n  'PAGINA CONTATTI',\n  'Se durante la ricerca vedi la pagina contatti / note legali / impressum del sito ufficiale,',\n  'mettila in \"contact_page\". NON cercare email e NON scriverne: le email le troviamo noi.',\n  '',\n  'METODO',\n  'Usa davvero la ricerca web, anche nella lingua del paese. Privilegia la quantit\u00e0 di candidati',\n  'verificabili. Non approfondire un candidato quando hai gi\u00e0: azienda reale, sito ufficiale,',\n  'persona reale con ruolo coerente, una fonte.',\n  '',\n  'REGOLE INVIOLABILI',\n  '- Non inventare mai persone, aziende, ruoli, siti, URL o dati economici.',\n  '- Ogni candidato deve avere \"source_url\": la pagina in cui hai visto la persona e il ruolo.',\n  '- Se un dato non \u00e8 noto lascialo stringa vuota.',\n  '- Niente grandi gruppi quotati o multinazionali, salvo richiesta esplicita del cliente.',\n  '',\n  'OUTPUT',\n  'Restituisci ESCLUSIVAMENTE JSON valido, senza testo prima o dopo:',\n  '{\"candidates\":[{\"company_name\":\"\",\"website\":\"\",\"country\":\"\",\"city\":\"\",\"industry\":\"\",',\n  '\"size_hint\":\"\",\"full_name\":\"\",\"first_name\":\"\",\"last_name\":\"\",\"job_title\":\"\",',\n  '\"source_url\":\"\",\"contact_page\":\"\",\"linkedin_url\":\"\"}]}'\n].filter(x => x !== null).join('\\n');\n\nreturn lotti.map((l, i) => ({\n  json: {\n    job_id: job.job_id,\n    lotto: i + 1,\n    paese: l.paese,\n    focus: l.focus,\n    prompt: prompt(l, i)\n  }\n}));\n" } },
  output: [{ job_id: 'x', lotto: 1, paese: 'Italia', focus: 'Software house a Milano', prompt: '...' }]
});

const modelloRicerca = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI + Web Search',
    parameters: {
      model: { __rl: true, mode: 'id', value: 'gpt-5.6-luna' },
      responsesApiEnabled: true,
      builtInTools: { webSearch: { searchContextSize: 'low' } },
      options: { timeout: 240000 }
    },
    credentials: { openAiApi: { id: 'ZQVz3FqwCrCMFcB9', name: 'OpenAi account' } }
  }
});

const ricerca = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Ricerca prospect AI',
    onError: 'continueRegularOutput',
    parameters: {
      promptType: 'define',
      text: expr('{{ $json.prompt }}'),
      options: {
        systemMessage: 'Sei un ricercatore di prospect B2B. Usi la ricerca web, citi sempre la fonte e non inventi mai dati. Rispondi solo con JSON valido.',
        maxIterations: 8,
        batching: { batchSize: 3, delayBetweenBatches: 1000 }
      }
    },
    subnodes: { model: modelloRicerca }
  },
  output: [{ output: '{"candidates":[]}' }]
});

const normalizzaAI = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Normalizza output AI', parameters: { mode: 'runOnceForEachItem', jsCode: "// Rende robusto l'output dell'AI: un lotto con JSON malformato, troncato\n// o in errore non deve far perdere gli altri lotti.\nconst raw = $json.output;\nconst errore = $json.error ? String($json.error.message ?? $json.error) : '';\n\nconst tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };\nconst pulisci = (s) => String(s).trim().replace(/^```(?:json)?\\s*/i, '').replace(/```\\s*$/i, '').trim();\n\nlet candidati = null;\nlet stato = 'OK';\n\nif (errore) {\n  stato = 'ERRORE';\n} else if (raw && typeof raw === 'object') {\n  candidati = Array.isArray(raw.candidates) ? raw.candidates : (Array.isArray(raw) ? raw : null);\n} else if (typeof raw === 'string') {\n  const s = pulisci(raw);\n  const a = s.indexOf('{');\n  const b = s.lastIndexOf('}');\n  const dati = tryParse(s) ?? (a >= 0 && b > a ? tryParse(s.slice(a, b + 1)) : null);\n  if (dati && Array.isArray(dati.candidates)) {\n    candidati = dati.candidates;\n  } else {\n    // Recupero: i singoli oggetti validi anche se il JSON complessivo \u00e8 rotto.\n    const recuperati = (s.match(/\\{[^{}]*\\}/g) || []).map(tryParse).filter(o => o && o.company_name);\n    if (recuperati.length) { candidati = recuperati; stato = 'RECUPERATO'; }\n  }\n}\n\nif (!candidati) { candidati = []; if (stato === 'OK') stato = 'JSON NON VALIDO'; }\n\nconst lotto = $('Prepara lotti').item.json;\n\nreturn {\n  json: {\n    lotto: lotto.lotto,\n    paese_lotto: lotto.paese,\n    stato_lotto: stato,\n    errore,\n    candidates: candidati.map(c => ({ ...c, country: c?.country || lotto.paese }))\n  }\n};\n" } },
  output: [{ lotto: 1, stato_lotto: 'OK', candidates: [] }]
});

const deduplica = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Deduplica candidati', parameters: { mode: 'runOnceForAllItems', jsCode: "// Deduplica e validazione formale dei candidati dell'AI.\n// Scarta: senza fonte, senza sito ufficiale, siti non ufficiali (social,\n// directory), aziende/persone gi\u00e0 vendute al cliente (exclusions dal backend),\n// duplicati interni alla ricerca, oltre N contatti per azienda.\n// Se non resta nessuno, emette un solo item {_vuoto:true}: il ramo \"vuoto\"\n// invia comunque i risultati (0 lead) al backend, che chiude la ricerca.\nconst job = $('Valida richiesta').first().json;\n\nconst norm = (v) => String(v ?? '')\n  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')\n  .toLowerCase().replace(/&/g, ' and ')\n  .replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim();\n\n// Caratteri invisibili che l'AI a volte copia dalle pagine (es. U+FEFF): rompono gli URL.\nconst INVISIBILI = /[\\u00AD\\u200B-\\u200F\\u2060\\uFEFF]/g;\nconst pulito = (v, max = 200) => String(v ?? '').replace(INVISIBILI, '').trim().replace(/\\s+/g, ' ').slice(0, max);\n// URL: niente spazi n\u00e9 invisibili, e deve essere un indirizzo http(s) valido.\n// (Niente `new URL`: nella sandbox dei Code node di n8n non \u00e8 disponibile.)\nconst urlPulito = (v, max = 500) => {\n  let s = String(v ?? '').replace(INVISIBILI, '').replace(/\\s+/g, '').slice(0, max);\n  if (!s) return '';\n  if (!/^https?:\\/\\//i.test(s)) s = `https://${s}`;\n  const m = s.match(/^(https?):\\/\\/([a-z0-9.-]+)(:\\d+)?([/?#].*)?$/i);\n  if (!m || !m[2].includes('.') || /^[.-]|[.-]$/.test(m[2])) return '';\n  return `${m[1].toLowerCase()}://${m[2].toLowerCase()}${m[3] || ''}${m[4] || '/'}`;\n};\n\nconst host = (u) => String(u ?? '').trim().toLowerCase()\n  .replace(/^https?:\\/\\//i, '').replace(/^\\/\\//, '').replace(/^www\\./i, '')\n  .split('/')[0].split('?')[0].split('#')[0].replace(/:\\d+$/, '').trim();\n\n// Chiave azienda = dominio (sulle piattaforme condivise anche il primo segmento).\nconst chiaveAzienda = (sito) => {\n  const s = String(sito ?? '').trim().toLowerCase().replace(/^https?:\\/\\//, '').replace(/^www\\./, '');\n  const [h, primo] = s.split(/[?#]/)[0].split('/');\n  if (!h) return '';\n  return ['sites.google.com', 'linktr.ee', 'business.site'].includes(h) && primo ? `${h}/${primo}` : h;\n};\n\nconst NON_UFFICIALI = /(^|\\.)(linkedin|facebook|instagram|twitter|x|youtube|tiktok|google|goo|bing|yelp|trustpilot|tripadvisor|glassdoor|indeed|crunchbase|zoominfo|rocketreach|apollo|dnb|bloomberg|wikipedia|kompass|europages|infobel|paginegialle|paginebianche|paginasamarillas|yellowpages|gelbeseiten|pagesjaunes|herold|panoramafirm|firmy|zlatestranky|cylex|hotfrog|yell|192|houzz|clutch|g2|capterra|amazon|ebay|etsy|medium|wordpress|blogspot|wixsite|reddit|quora|ufficiocamerale|registroimprese|reportaziende|informazione-aziende|atoka|companieshouse|northdata|opencorporates)\\.[a-z.]+$/;\n\nconst parti = (nome) => norm(nome).split(' ').filter(p => p.length > 1);\nconst chiavePersona = (nome, dominio) => `${norm(nome)}|${dominio}`;\n\nconst escludiDomini = new Set(job.exclusions.domains.map(d => chiaveAzienda(d)));\nconst escludiPersone = new Set(job.exclusions.person_keys.map(k => String(k).toLowerCase()));\nconst escludiParole = job.target.exclude_keywords.map(norm).filter(Boolean);\n\n// Coerenza del ruolo: corrispondenza con i ruoli richiesti o sinonimi di vertice.\nconst VERTICE = ['ceo', 'founder', 'co founder', 'cofounder', 'owner', 'titolare', 'fondatore', 'presidente',\n  'president', 'managing director', 'amministratore', 'general manager', 'direttore generale', 'partner',\n  'managing partner', 'socio', 'geschaftsfuhrer', 'gerente', 'director general', 'directeur general', 'proprietario',\n  'principal', 'head', 'chief'];\n// I ruoli scelti nel wizard possono contenere alternative (\"Titolare / CEO\"):\n// ognuna conta da sola, con i sinonimi pi\u00f9 comuni in italiano e inglese.\nconst SINONIMI = {\n  ceo: ['ceo', 'chief executive', 'amministratore delegato', 'ad'],\n  titolare: ['titolare', 'owner', 'proprietario', 'imprenditore'],\n  fondatore: ['fondatore', 'founder', 'co founder', 'cofounder', 'co fondatore', 'cofondatore'],\n  founder: ['founder', 'co founder', 'cofounder', 'fondatore', 'co fondatore'],\n  'managing director': ['managing director', 'direttore generale', 'general manager', 'amministratore unico'],\n  partner: ['partner', 'socio', 'managing partner', 'senior partner'],\n  cto: ['cto', 'chief technology', 'responsabile it', 'it manager', 'head of it'],\n  cfo: ['cfo', 'chief financial', 'direttore finanziario', 'responsabile amministrativo'],\n  cmo: ['cmo', 'chief marketing', 'direttore marketing', 'marketing director', 'head of marketing', 'responsabile marketing'],\n};\nconst scelti = job.target.roles\n  .flatMap(r => String(r).split(/\\s*(?:\\/|,|\\||&|\\so\\s|\\sor\\s)\\s*/i))\n  .map(norm).filter(Boolean);\nconst ruoliRichiesti = [...new Set(scelti.flatMap(a => [a, ...(SINONIMI[a] || [])]))];\n// Parole generiche che da sole non dicono nulla sul ruolo.\nconst GENERICHE_RUOLO = new Set(['responsabile', 'direttore', 'director', 'manager', 'head', 'chief', 'senior', 'junior', 'ufficio']);\nconst parola = (testo, termine) => ` ${testo} `.includes(` ${termine} `);\nconst coerenzaRuolo = (titolo) => {\n  const t = norm(titolo);\n  if (!t) return 'unknown';\n  if (ruoliRichiesti.some(r => parola(t, r))) return 'exact';\n  const tok = scelti.flatMap(r => r.split(' ')).filter(w => w.length >= 4 && !GENERICHE_RUOLO.has(w));\n  if (tok.some(w => parola(t, w))) return 'plausible';\n  if (!ruoliRichiesti.length && VERTICE.some(v => parola(t, v))) return 'exact';\n  if (VERTICE.some(v => parola(t, v))) return 'plausible';\n  return 'mismatch';\n};\n\nconst visti = new Set();\nconst perAzienda = {};\nconst scarti = {};\nconst scarta = (m) => { scarti[m] = (scarti[m] || 0) + 1; };\nconst out = [];\n\nfor (const item of $input.all()) {\n  for (const c of item.json.candidates || []) {\n    const azienda = pulito(c?.company_name);\n    const nome = pulito(c?.full_name, 120);\n    const sito = urlPulito(c?.website, 300);\n    const dominio = host(sito);\n    const chiave = chiaveAzienda(sito);\n    const fonte = /^https?:\\/\\//i.test(String(c?.source_url ?? '').trim()) ? urlPulito(c.source_url) : '';\n\n    if (!azienda || !nome || parti(nome).length < 2) { scarta('dati_persona_incompleti'); continue; }\n    if (!fonte) { scarta('senza_fonte'); continue; }\n    if (!dominio || !dominio.includes('.') || NON_UFFICIALI.test(dominio)) { scarta('sito_non_ufficiale'); continue; }\n    if (escludiDomini.has(chiave)) { scarta('azienda_gia_acquistata'); continue; }\n    if (escludiPersone.has(chiavePersona(nome, chiave))) { scarta('persona_gia_acquistata'); continue; }\n    if (escludiParole.some(p => norm(`${azienda} ${c?.industry ?? ''}`).includes(p))) { scarta('parola_esclusa'); continue; }\n\n    const kp = chiavePersona(nome, chiave);\n    if (visti.has(kp)) { scarta('duplicato_ricerca'); continue; }\n    if ((perAzienda[chiave] || 0) >= job.contacts_per_company) { scarta('limite_contatti_azienda'); continue; }\n\n    const ruolo = coerenzaRuolo(c?.job_title);\n    if (ruolo === 'mismatch') { scarta('ruolo_non_coerente'); continue; }\n\n    const contatti = /^https?:\\/\\//i.test(String(c?.contact_page ?? '').trim()) ? urlPulito(c.contact_page) : '';\n    visti.add(kp);\n    perAzienda[chiave] = (perAzienda[chiave] || 0) + 1;\n\n    const p = parti(nome);\n    out.push({\n      json: {\n        company_name: azienda,\n        website: sito,\n        domain: dominio,\n        company_key: chiave,\n        country: pulito(c?.country, 80),\n        city: pulito(c?.city, 80),\n        industry: pulito(c?.industry, 120) || job.target.industry,\n        size_hint: pulito(c?.size_hint, 60),\n        full_name: nome,\n        first_name: pulito(c?.first_name, 60) || p[0],\n        last_name: pulito(c?.last_name, 80) || p.slice(1).join(' '),\n        job_title: pulito(c?.job_title, 120),\n        role_match: ruolo,\n        person_key: kp,\n        linkedin_url: /linkedin\\.com\\/in\\//i.test(String(c?.linkedin_url ?? '')) ? pulito(c.linkedin_url, 300) : '',\n        source_url: fonte,\n        contact_page: /^https?:\\/\\//i.test(contatti) && host(contatti) === dominio ? contatti : '',\n        lotto: item.json.lotto\n      }\n    });\n  }\n}\n\nconst totale = $input.all().reduce((s, i) => s + (i.json.candidates || []).length, 0);\nconst stats = { candidati_ai: totale, candidati_validi: out.length, scarti };\n\nif (!out.length) return [{ json: { _vuoto: true, stats } }];\nout[0].json._stats_deduplica = stats;\nreturn out;\n" } },
  output: [{ _vuoto: false, company_name: 'Acme Srl', website: 'https://acme.it', domain: 'acme.it', full_name: 'Mario Rossi', person_key: 'mario rossi|acme.it', role_match: 'exact' }]
});

const ciSonoCandidati = ifElse({
  version: 2.2,
  config: {
    name: 'Ci sono candidati?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $json._vuoto === true }}"), operator: { type: 'boolean', operation: 'false', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const notificaVerifica = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Notifica: verifica email',
    executeOnce: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr("{{ $('Valida richiesta').first().json.callback_url }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ event: 'progress', contract_version: 1, job_id: $('Valida richiesta').first().json.job_id, run_id: $('Valida richiesta').first().json.run_id, run_token: $('Valida richiesta').first().json.run_token, stage: 'verifying', message: 'Verifica dei siti e delle email in corso', counters: { candidates: $('Deduplica candidati').all().filter(i => !i.json._vuoto).length } }) }}"),
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: newCredential('Lead Engine - Callback verso backend') }
  },
  output: [{ ok: true }]
});

const homepage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'HTTP - Homepage',
    parameters: {
      url: expr("{{ $json.website }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept-Language', value: 'it,en;q=0.9,es;q=0.8,fr;q=0.8,de;q=0.7,*;q=0.5' }
      ] },
      options: {
        batching: { batch: { batchSize: 10, batchInterval: 200 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        timeout: 10000
      }
    },
    // Un sito irraggiungibile o un URL rotto non deve mai fermare la ricerca.
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const estraiHome = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Estrai email homepage', parameters: { mode: 'runOnceForEachItem', jsCode: "// Estrae le email dalla pagina scaricata (HOMEPAGE) e sceglie la migliore\n// tra quelle trovate finora sul sito ufficiale. Punteggi:\n// 5   email del dominio con il nome della persona   -> personal\n// 4.5 email gratuita (gmail...) in un mailto, col nome -> personal (free provider)\n// 4   email generica del dominio (info@, sales@...)  -> generic\n// 3   email di un'altra persona del dominio          -> other_person\n// 2   email gratuita in un mailto, senza il nome     -> generic (free provider)\n// 1   privacy@ / dpo@ del dominio                    -> privacy (mai venduta)\n// Nessuna email viene \"indovinata\" qui: solo email realmente presenti nella pagina.\nconst prospect = $('Deduplica candidati').item.json;\nconst job = $('Valida richiesta').first().json;\nconst FASE = 'HOMEPAGE';\nconst FONTE = $('Deduplica candidati').item.json.website;\n\nlet html = String($json.html ?? '');\n\nconst cleanHost = (raw) => String(raw ?? '').trim().toLowerCase()\n  .replace(/^https?:\\/\\//i, '').replace(/^\\/\\//, '')\n  .split('/')[0].split('?')[0].split('#')[0]\n  .replace(/^www\\./, '').replace(/:\\d+$/, '');\n\nconst decodeCfEmail = (encoded) => {\n  try {\n    if (!encoded || encoded.length < 4) return '';\n    const key = parseInt(encoded.slice(0, 2), 16);\n    let email = '';\n    for (let i = 2; i < encoded.length; i += 2) {\n      email += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);\n    }\n    return email;\n  } catch {\n    return '';\n  }\n};\n\nhtml = html\n  .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(Number(n)))\n  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))\n  .replace(/&commat;/gi, '@').replace(/&period;/gi, '.')\n  .replace(/\\\\u0040/gi, '@').replace(/\\\\u002e/gi, '.')\n  .replace(/\\\\x40/gi, '@').replace(/\\\\x2e/gi, '.')\n  .replace(/%40/gi, '@').replace(/%2e/gi, '.')\n  .replace(/\\s*\\[\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\]\\s*/gi, '@')\n  .replace(/\\s*\\(\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\)\\s*/gi, '@')\n  .replace(/\\s*\\[\\s*(?:dot|punto|punkt|point)\\s*\\]\\s*/gi, '.')\n  .replace(/\\s*\\(\\s*(?:dot|punto|punkt|point)\\s*\\)\\s*/gi, '.');\n\n// Email nella pagina (\"sicure\" = in un mailto o protette da Cloudflare).\nconst sicure = new Set();\nconst tutte = [];\nlet m;\nconst cfRegex = /data-cfemail=[\"']([0-9a-f]+)[\"']/gi;\nwhile ((m = cfRegex.exec(html)) !== null) {\n  const e = decodeCfEmail(m[1]);\n  if (e) { sicure.add(e.toLowerCase()); tutte.push(e); }\n}\nconst mailtoRegex = /mailto:([^\"'?#\\s<>]+)/gi;\nwhile ((m = mailtoRegex.exec(html)) !== null) {\n  let v = m[1];\n  try { v = decodeURIComponent(v); } catch {}\n  sicure.add(v.toLowerCase().trim());\n  tutte.push(v);\n}\ntutte.push(...(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || []));\n\nconst ESTENSIONI = /\\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|pdf)$/i;\nconst SCARTA_LOCALI = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|example|test|user|email|e-mail|name|nome|your|youremail|yourname|you|tuonome|sentry|wordpress|webmaster|hostmaster|jobs?|careers?|lavora(con)?noi|recruit(ment|ing)?|cv|hr|bewerbung|praktikum|stage|empleo|trabaja|vacatures|rekrutacja|kariera|unsubscribe|bounce)$/;\nconst SCARTA_DOMINI = /(^|\\.)(example\\.(com|org)|sentry\\.io|sentry-next\\.wixpress\\.com|wixpress\\.com|domain\\.com|email\\.com|yoursite\\.com|godaddy\\.com|wix\\.com|squarespace\\.com|sentry\\.wixpress\\.com)$/;\nconst GRATUITE = /(^|\\.)(gmail\\.com|googlemail\\.com|icloud\\.com|me\\.com|aol\\.com|protonmail\\.(com|ch)|proton\\.me|mail\\.com|zoho\\.(com|eu)|(hotmail|outlook|live|yahoo|gmx|msn)\\.[a-z.]+|libero\\.it|virgilio\\.it|tiscali\\.it|alice\\.it|tin\\.it|fastwebnet\\.it|seznam\\.cz|centrum\\.(cz|sk)|email\\.cz|wp\\.pl|o2\\.pl|onet\\.(pl|eu)|interia\\.(pl|eu)|abv\\.bg|otenet\\.gr|freemail\\.hu|sapo\\.pt|telenet\\.be|skynet\\.be|ziggo\\.nl|kpnmail\\.nl|bluewin\\.ch|aon\\.at|eircom\\.net|btinternet\\.com|sky\\.com|telia\\.com|online\\.no|web\\.de|t-online\\.de|orange\\.fr|free\\.fr|wanadoo\\.fr|laposte\\.net|sfr\\.fr|yandex\\.(com|ru)|pec\\.it|legalmail\\.it|arubapec\\.it)$/;\nconst PEC = /(^|\\.)(pec\\.[a-z.]+|legalmail\\.it|arubapec\\.it|postacert\\.[a-z.]+|pecimprese\\.it|cert\\.[a-z.]+)$/;\nconst GENERICHE = new Set([\n  'info', 'infos', 'hello', 'hi', 'ciao', 'contact', 'contacts', 'contatti', 'kontakt', 'kontakty', 'contacto', 'contato', 'contacte',\n  'office', 'ufficio', 'mail', 'post', 'posta', 'postmottak', 'admin', 'amministrazione', 'administration', 'administracion',\n  'segreteria', 'secretaria', 'secretariat', 'sekretariat', 'secretary', 'reception', 'recepcion', 'enquiries', 'enquiry',\n  'inquiries', 'inquiry', 'general', 'geral', 'sales', 'vendite', 'commerciale', 'business', 'ventas', 'vertrieb', 'verkauf',\n  'marketing', 'ordini', 'orders', 'order', 'support', 'assistenza', 'service', 'servizioclienti', 'customerservice',\n  'team', 'studio', 'company', 'azienda', 'firma', 'direzione', 'management', 'board', 'export', 'import', 'shop', 'store',\n  'booking', 'prenotazioni', 'kanzlei', 'kancelaria', 'cabinet', 'despacho', 'bufete', 'biuro', 'kontor', 'web', 'mailbox'\n]);\nconst PRIVACY = /^(privacy|dpo|gdpr|rodo|datenschutz|dataprotection|data\\.protection|protecciondedatos|lopd|rgpd|avg|legal|compliance)$/;\nconst SEGNAPOSTO = /^(firstname|first\\.?name|name|nome|nombre|prenom|vorname|voornaam|imie|jmeno|etunimi|fornamn|fornavn)[._-]?(lastname|last\\.?name|surname|cognome|apellidos?|nom|nachname|achternaam|nazwisko|prijmeni|sukunimi|efternamn|etternavn)?$/;\n\nconst dominio = cleanHost(prospect.website);\nconst titoli = new Set(['dr', 'dott', 'dssa', 'mr', 'mrs', 'ms', 'prof', 'avv', 'ing', 'arch', 'geom', 'rag', 'me', 'mag', 'mgr', 'adw', 'adv', 'lic', 'ldo', 'dra', 'jur', 'kc', 'qc', 'judr', 'dipl', 'phd']);\nconst parti = String(prospect.full_name ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()\n  .split(/[\\s-]+/).map(p => p.replace(/[^a-z]/g, '')).filter(p => p && !titoli.has(p));\nconst primo = parti[0] || '';\nconst ultimo = parti.length > 1 ? parti[parti.length - 1] : '';\n\nconst conNome = (local) => {\n  const l = local.replace(/[^a-z]/g, '');\n  if (ultimo.length >= 3 && l.includes(ultimo)) return true;\n  if (primo.length >= 3 && ultimo && l.startsWith(primo)) return true;\n  if (primo && ultimo && l === primo[0] + ultimo) return true;\n  return parti.slice(1, -1).some(p => p.length >= 4 && l.includes(p));\n};\n\nconst punteggio = (email) => {\n  const [local, dom] = email.split('@');\n  if (!local || !dom || SCARTA_LOCALI.test(local) || SCARTA_DOMINI.test(dom) || ESTENSIONI.test(email)) return 0;\n  if (dom.startsWith('www.') || SEGNAPOSTO.test(local) || PEC.test(dom)) return 0;\n  const delDominio = dominio && (dom === dominio || dom.endsWith('.' + dominio));\n  if (delDominio) {\n    if (conNome(local)) {\n      // Stesso cognome ma un altro nome (es. un familiare in azienda): non \u00e8 la persona.\n      const altroNome = local.split(/[._-]+/).some(t =>\n        /^[a-z]{3,}$/.test(t) && !parti.some(p => p === t || t.includes(p) || p.includes(t)));\n      return altroNome ? 3 : 5;\n    }\n    if (GENERICHE.has(local.replace(/[0-9]+$/, ''))) return 4;\n    if (PRIVACY.test(local)) return 1;\n    return 3;\n  }\n  if (GRATUITE.test(dom) && sicure.has(email)) return conNome(local) ? 4.5 : 2;\n  return 0;\n};\n\nconst TIPO = (p) => p >= 4.5 ? 'personal' : p >= 4 ? 'generic' : p >= 3 ? 'other_person' : p >= 2 ? 'generic' : 'privacy';\n\nconst precedenti = Array.isArray(prospect._emails) ? prospect._emails : [];\nconst trovate = [...precedenti];\nconst giaViste = new Set(precedenti.map(x => x.email));\n\nfor (const raw of tutte) {\n  const email = String(raw).toLowerCase().trim().replace(/^[^a-z0-9]+/, '').replace(/[),.;:'\"]+$/g, '');\n  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/.test(email) || giaViste.has(email)) continue;\n  giaViste.add(email);\n  const p = punteggio(email);\n  if (p > 0) trovate.push({ email, p, type: TIPO(p), free_provider: GRATUITE.test(email.split('@')[1]), source_url: FONTE, in_mailto: sicure.has(email) });\n}\n\ntrovate.sort((a, b) => b.p - a.p);\nconst migliore = trovate[0];\n\n// Quando fermarsi: con \"solo generiche\" basta una generica; altrimenti\n// si continua a cercare finch\u00e9 non c'\u00e8 una nominativa.\nconst soglia = job.email_mode === 'generic_ok' ? 4 : 4.5;\nconst basta = Boolean(migliore && migliore.p >= soglia);\n\nconst out = {\n  ...prospect,\n  _emails: trovate.slice(0, 8),\n  email_site: migliore ? migliore.email : '',\n  email_site_type: migliore ? migliore.type : '',\n  email_site_score: migliore ? migliore.p : 0,\n  email_site_source: migliore ? migliore.source_url : '',\n  email_site_free_provider: migliore ? migliore.free_provider : false,\n  pages_fetched: (Number(prospect.pages_fetched) || 0) + 1,\n  email_search_stage: (migliore ? 'FOUND ' : 'NOT FOUND ') + FASE\n};\n\nif (FASE !== 'HOMEPAGE') {\n  if (basta) out.page_2 = '';\n  return { json: out };\n}\n\n// Pagine da controllare dopo la homepage: contatti (o quella indicata dall'AI),\n// poi note legali / impressum / privacy, dove l'email aziendale c'\u00e8 quasi sempre.\nconst sitoConProtocollo = /^https?:\\/\\//i.test(prospect.website) ? prospect.website : 'https://' + prospect.website;\nconst originMatch = sitoConProtocollo.match(/^(https?:\\/\\/[^\\/?#]+)/i);\nconst origin = originMatch ? originMatch[1] : '';\n\nconst normalizeUrl = (raw) => {\n  const s = String(raw ?? '').trim().replace(/^https?:\\/\\//i, '').replace(/^\\/\\//, '');\n  const [h, ...resto] = s.split('/');\n  const path = ('/' + resto.join('/')).split('?')[0].split('#')[0].replace(/\\/+$/, '') || '/';\n  return h.toLowerCase().replace(/^www\\./, '') + path.toLowerCase();\n};\n\nconst rendiAssoluto = (href) => {\n  const link = String(href ?? '').trim().replace(/&amp;/gi, '&');\n  if (!link || /^(#|mailto:|tel:|javascript:|data:|whatsapp:)/i.test(link)) return '';\n  if (/^https?:\\/\\//i.test(link)) return link;\n  if (/^\\/\\//.test(link)) return 'https:' + link;\n  if (!origin) return '';\n  if (link.startsWith('/')) return origin + link;\n  return origin + '/' + link.replace(/^\\.\\//, '');\n};\n\nconst categoria = (url) => {\n  const u = String(url).toLowerCase().split('?')[0].split('#')[0];\n  if (/contact|kontakt|contacto|contato|contatti|contacte|get-in-touch|reach-us|enquir|inquir|dove-siamo|find-us|location|donde-estamos|onde-estamos|yhteys|kapcsolat/.test(u)) return ['CONTATTI', 100];\n  if (/impressum|impresszum|aviso-legal|avisolegal|nota-legal|note-legali|legal-notice|mentions-legales|colofon|privacy|privacidad|datenschutz|gdpr|cookie|terms|termini|polityka/.test(u)) return ['LEGALE', 80];\n  if (/team|people|management|leadership|chi-siamo|about|azienda|company|quienes-somos|quem-somos|over-ons|uber-uns|ueber-uns|qui-sommes|o-nas|staff|persone|organigramma/.test(u)) return ['TEAM', 70];\n  return ['', 0];\n};\n\nconst linkTrovati = [];\nconst hrefRegex = /href\\s*=\\s*[\"']([^\"']+)[\"']/gi;\nconst homeNorm = normalizeUrl(prospect.website);\nwhile ((m = hrefRegex.exec(html)) !== null) {\n  const url = rendiAssoluto(m[1]);\n  const h = cleanHost(url);\n  if (!url || !h || !dominio || !(h === dominio || h.endsWith('.' + dominio))) continue;\n  const percorso = url.split('?')[0].split('#')[0];\n  if (/\\.(pdf|jpe?g|png|gif|svg|webp|docx?|zip|css|js|xml|json|ico)$/i.test(percorso)) continue;\n  if (/\\/(wp-content|wp-includes|wp-json|feed|news|blog|insights|articles?|cdn-cgi|tag|category|product|prodotti?|shop)(\\/|$)/i.test(percorso)) continue;\n  if (normalizeUrl(url) === homeNorm) continue;\n  linkTrovati.push(url.split('#')[0]);\n}\n\nconst candidate = [...new Set(linkTrovati)]\n  .map(url => { const [cat, score] = categoria(url); return { url, cat, score }; })\n  .filter(x => x.score > 0)\n  .sort((a, b) => b.score - a.score || a.url.length - b.url.length);\n\nconst paginaAI = String(prospect.contact_page ?? '');\nif (paginaAI && normalizeUrl(paginaAI) !== homeNorm) {\n  candidate.unshift({ url: paginaAI, cat: categoria(paginaAI)[0] || 'AI', score: 110 });\n}\n\n// Siti in JavaScript senza link leggibili: percorsi tipici per lingua.\nif (!candidate.length && origin) {\n  const p = String(prospect.country || '').toLowerCase();\n  const ipotesi =\n    /ital|^it$/.test(p) ? ['/contatti', '/chi-siamo'] :\n    /spagn|spain|^es$/.test(p) ? ['/contacto', '/aviso-legal'] :\n    /portog|portugal|^pt$/.test(p) ? ['/contactos', '/contacto'] :\n    /german|tedesc|^de$|austri|^at$|svizz|switz|^ch$/.test(p) ? ['/kontakt', '/impressum'] :\n    /franc|^fr$|belg|^be$|lussemb|^lu$/.test(p) ? ['/contact', '/mentions-legales'] :\n    /olanda|paesi bassi|netherl|^nl$/.test(p) ? ['/contact', '/colofon'] :\n    /polon|poland|^pl$|ceca|czech|^cz$|slovac|^sk$/.test(p) ? ['/kontakt', '/kontakty'] :\n    ['/contact', '/contact-us'];\n  ipotesi.forEach((path, k) => candidate.push({ url: origin + path, cat: 'IPOTESI', score: 1 - k / 10 }));\n}\n\nconst pagina1 = candidate[0];\nconst pagina2 = pagina1\n  ? (candidate.find(x => x !== pagina1 && x.cat !== pagina1.cat && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)) ||\n     candidate.find(x => x !== pagina1 && normalizeUrl(x.url) !== normalizeUrl(pagina1.url)))\n  : null;\n\nout.page_1 = basta || !pagina1 ? '' : pagina1.url;\nout.page_2 = basta || !pagina2 ? '' : pagina2.url;\n\nreturn { json: out };\n" } },
  output: [{ email_site: 'info@acme.it', email_site_type: 'generic', page_1: 'https://acme.it/contatti', page_2: '' }]
});

const servePagina2 = ifElse({
  version: 2.2,
  config: {
    name: 'Serve pagina 2?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $json.page_1 }}"), operator: { type: 'string', operation: 'notEmpty', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const pagina2 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'HTTP - Pagina 2',
    parameters: {
      url: expr("{{ $json.page_1 }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept-Language', value: 'it,en;q=0.9,es;q=0.8,fr;q=0.8,de;q=0.7,*;q=0.5' }
      ] },
      options: {
        batching: { batch: { batchSize: 10, batchInterval: 200 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        timeout: 10000
      }
    },
    // Un sito irraggiungibile o un URL rotto non deve mai fermare la ricerca.
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const estraiP2 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Estrai email pagina 2', parameters: { mode: 'runOnceForEachItem', jsCode: "// Estrae le email dalla pagina scaricata (PAGINA 2) e sceglie la migliore\n// tra quelle trovate finora sul sito ufficiale. Punteggi:\n// 5   email del dominio con il nome della persona   -> personal\n// 4.5 email gratuita (gmail...) in un mailto, col nome -> personal (free provider)\n// 4   email generica del dominio (info@, sales@...)  -> generic\n// 3   email di un'altra persona del dominio          -> other_person\n// 2   email gratuita in un mailto, senza il nome     -> generic (free provider)\n// 1   privacy@ / dpo@ del dominio                    -> privacy (mai venduta)\n// Nessuna email viene \"indovinata\" qui: solo email realmente presenti nella pagina.\nconst prospect = $('Serve pagina 2?').item.json;\nconst job = $('Valida richiesta').first().json;\nconst FASE = 'PAGINA 2';\nconst FONTE = $('Serve pagina 2?').item.json.page_1;\n\nlet html = String($json.html ?? '');\n\nconst cleanHost = (raw) => String(raw ?? '').trim().toLowerCase()\n  .replace(/^https?:\\/\\//i, '').replace(/^\\/\\//, '')\n  .split('/')[0].split('?')[0].split('#')[0]\n  .replace(/^www\\./, '').replace(/:\\d+$/, '');\n\nconst decodeCfEmail = (encoded) => {\n  try {\n    if (!encoded || encoded.length < 4) return '';\n    const key = parseInt(encoded.slice(0, 2), 16);\n    let email = '';\n    for (let i = 2; i < encoded.length; i += 2) {\n      email += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);\n    }\n    return email;\n  } catch {\n    return '';\n  }\n};\n\nhtml = html\n  .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(Number(n)))\n  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))\n  .replace(/&commat;/gi, '@').replace(/&period;/gi, '.')\n  .replace(/\\\\u0040/gi, '@').replace(/\\\\u002e/gi, '.')\n  .replace(/\\\\x40/gi, '@').replace(/\\\\x2e/gi, '.')\n  .replace(/%40/gi, '@').replace(/%2e/gi, '.')\n  .replace(/\\s*\\[\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\]\\s*/gi, '@')\n  .replace(/\\s*\\(\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\)\\s*/gi, '@')\n  .replace(/\\s*\\[\\s*(?:dot|punto|punkt|point)\\s*\\]\\s*/gi, '.')\n  .replace(/\\s*\\(\\s*(?:dot|punto|punkt|point)\\s*\\)\\s*/gi, '.');\n\n// Email nella pagina (\"sicure\" = in un mailto o protette da Cloudflare).\nconst sicure = new Set();\nconst tutte = [];\nlet m;\nconst cfRegex = /data-cfemail=[\"']([0-9a-f]+)[\"']/gi;\nwhile ((m = cfRegex.exec(html)) !== null) {\n  const e = decodeCfEmail(m[1]);\n  if (e) { sicure.add(e.toLowerCase()); tutte.push(e); }\n}\nconst mailtoRegex = /mailto:([^\"'?#\\s<>]+)/gi;\nwhile ((m = mailtoRegex.exec(html)) !== null) {\n  let v = m[1];\n  try { v = decodeURIComponent(v); } catch {}\n  sicure.add(v.toLowerCase().trim());\n  tutte.push(v);\n}\ntutte.push(...(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || []));\n\nconst ESTENSIONI = /\\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|pdf)$/i;\nconst SCARTA_LOCALI = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|example|test|user|email|e-mail|name|nome|your|youremail|yourname|you|tuonome|sentry|wordpress|webmaster|hostmaster|jobs?|careers?|lavora(con)?noi|recruit(ment|ing)?|cv|hr|bewerbung|praktikum|stage|empleo|trabaja|vacatures|rekrutacja|kariera|unsubscribe|bounce)$/;\nconst SCARTA_DOMINI = /(^|\\.)(example\\.(com|org)|sentry\\.io|sentry-next\\.wixpress\\.com|wixpress\\.com|domain\\.com|email\\.com|yoursite\\.com|godaddy\\.com|wix\\.com|squarespace\\.com|sentry\\.wixpress\\.com)$/;\nconst GRATUITE = /(^|\\.)(gmail\\.com|googlemail\\.com|icloud\\.com|me\\.com|aol\\.com|protonmail\\.(com|ch)|proton\\.me|mail\\.com|zoho\\.(com|eu)|(hotmail|outlook|live|yahoo|gmx|msn)\\.[a-z.]+|libero\\.it|virgilio\\.it|tiscali\\.it|alice\\.it|tin\\.it|fastwebnet\\.it|seznam\\.cz|centrum\\.(cz|sk)|email\\.cz|wp\\.pl|o2\\.pl|onet\\.(pl|eu)|interia\\.(pl|eu)|abv\\.bg|otenet\\.gr|freemail\\.hu|sapo\\.pt|telenet\\.be|skynet\\.be|ziggo\\.nl|kpnmail\\.nl|bluewin\\.ch|aon\\.at|eircom\\.net|btinternet\\.com|sky\\.com|telia\\.com|online\\.no|web\\.de|t-online\\.de|orange\\.fr|free\\.fr|wanadoo\\.fr|laposte\\.net|sfr\\.fr|yandex\\.(com|ru)|pec\\.it|legalmail\\.it|arubapec\\.it)$/;\nconst PEC = /(^|\\.)(pec\\.[a-z.]+|legalmail\\.it|arubapec\\.it|postacert\\.[a-z.]+|pecimprese\\.it|cert\\.[a-z.]+)$/;\nconst GENERICHE = new Set([\n  'info', 'infos', 'hello', 'hi', 'ciao', 'contact', 'contacts', 'contatti', 'kontakt', 'kontakty', 'contacto', 'contato', 'contacte',\n  'office', 'ufficio', 'mail', 'post', 'posta', 'postmottak', 'admin', 'amministrazione', 'administration', 'administracion',\n  'segreteria', 'secretaria', 'secretariat', 'sekretariat', 'secretary', 'reception', 'recepcion', 'enquiries', 'enquiry',\n  'inquiries', 'inquiry', 'general', 'geral', 'sales', 'vendite', 'commerciale', 'business', 'ventas', 'vertrieb', 'verkauf',\n  'marketing', 'ordini', 'orders', 'order', 'support', 'assistenza', 'service', 'servizioclienti', 'customerservice',\n  'team', 'studio', 'company', 'azienda', 'firma', 'direzione', 'management', 'board', 'export', 'import', 'shop', 'store',\n  'booking', 'prenotazioni', 'kanzlei', 'kancelaria', 'cabinet', 'despacho', 'bufete', 'biuro', 'kontor', 'web', 'mailbox'\n]);\nconst PRIVACY = /^(privacy|dpo|gdpr|rodo|datenschutz|dataprotection|data\\.protection|protecciondedatos|lopd|rgpd|avg|legal|compliance)$/;\nconst SEGNAPOSTO = /^(firstname|first\\.?name|name|nome|nombre|prenom|vorname|voornaam|imie|jmeno|etunimi|fornamn|fornavn)[._-]?(lastname|last\\.?name|surname|cognome|apellidos?|nom|nachname|achternaam|nazwisko|prijmeni|sukunimi|efternamn|etternavn)?$/;\n\nconst dominio = cleanHost(prospect.website);\nconst titoli = new Set(['dr', 'dott', 'dssa', 'mr', 'mrs', 'ms', 'prof', 'avv', 'ing', 'arch', 'geom', 'rag', 'me', 'mag', 'mgr', 'adw', 'adv', 'lic', 'ldo', 'dra', 'jur', 'kc', 'qc', 'judr', 'dipl', 'phd']);\nconst parti = String(prospect.full_name ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()\n  .split(/[\\s-]+/).map(p => p.replace(/[^a-z]/g, '')).filter(p => p && !titoli.has(p));\nconst primo = parti[0] || '';\nconst ultimo = parti.length > 1 ? parti[parti.length - 1] : '';\n\nconst conNome = (local) => {\n  const l = local.replace(/[^a-z]/g, '');\n  if (ultimo.length >= 3 && l.includes(ultimo)) return true;\n  if (primo.length >= 3 && ultimo && l.startsWith(primo)) return true;\n  if (primo && ultimo && l === primo[0] + ultimo) return true;\n  return parti.slice(1, -1).some(p => p.length >= 4 && l.includes(p));\n};\n\nconst punteggio = (email) => {\n  const [local, dom] = email.split('@');\n  if (!local || !dom || SCARTA_LOCALI.test(local) || SCARTA_DOMINI.test(dom) || ESTENSIONI.test(email)) return 0;\n  if (dom.startsWith('www.') || SEGNAPOSTO.test(local) || PEC.test(dom)) return 0;\n  const delDominio = dominio && (dom === dominio || dom.endsWith('.' + dominio));\n  if (delDominio) {\n    if (conNome(local)) {\n      // Stesso cognome ma un altro nome (es. un familiare in azienda): non \u00e8 la persona.\n      const altroNome = local.split(/[._-]+/).some(t =>\n        /^[a-z]{3,}$/.test(t) && !parti.some(p => p === t || t.includes(p) || p.includes(t)));\n      return altroNome ? 3 : 5;\n    }\n    if (GENERICHE.has(local.replace(/[0-9]+$/, ''))) return 4;\n    if (PRIVACY.test(local)) return 1;\n    return 3;\n  }\n  if (GRATUITE.test(dom) && sicure.has(email)) return conNome(local) ? 4.5 : 2;\n  return 0;\n};\n\nconst TIPO = (p) => p >= 4.5 ? 'personal' : p >= 4 ? 'generic' : p >= 3 ? 'other_person' : p >= 2 ? 'generic' : 'privacy';\n\nconst precedenti = Array.isArray(prospect._emails) ? prospect._emails : [];\nconst trovate = [...precedenti];\nconst giaViste = new Set(precedenti.map(x => x.email));\n\nfor (const raw of tutte) {\n  const email = String(raw).toLowerCase().trim().replace(/^[^a-z0-9]+/, '').replace(/[),.;:'\"]+$/g, '');\n  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/.test(email) || giaViste.has(email)) continue;\n  giaViste.add(email);\n  const p = punteggio(email);\n  if (p > 0) trovate.push({ email, p, type: TIPO(p), free_provider: GRATUITE.test(email.split('@')[1]), source_url: FONTE, in_mailto: sicure.has(email) });\n}\n\ntrovate.sort((a, b) => b.p - a.p);\nconst migliore = trovate[0];\n\n// Quando fermarsi: con \"solo generiche\" basta una generica; altrimenti\n// si continua a cercare finch\u00e9 non c'\u00e8 una nominativa.\nconst soglia = job.email_mode === 'generic_ok' ? 4 : 4.5;\nconst basta = Boolean(migliore && migliore.p >= soglia);\n\nconst out = {\n  ...prospect,\n  _emails: trovate.slice(0, 8),\n  email_site: migliore ? migliore.email : '',\n  email_site_type: migliore ? migliore.type : '',\n  email_site_score: migliore ? migliore.p : 0,\n  email_site_source: migliore ? migliore.source_url : '',\n  email_site_free_provider: migliore ? migliore.free_provider : false,\n  pages_fetched: (Number(prospect.pages_fetched) || 0) + 1,\n  email_search_stage: (migliore ? 'FOUND ' : 'NOT FOUND ') + FASE\n};\n\nif (basta) out.page_2 = '';\nreturn { json: out };\n" } },
  output: [{ email_site: 'info@acme.it', page_2: '' }]
});

const servePagina3 = ifElse({
  version: 2.2,
  config: {
    name: 'Serve pagina 3?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $json.page_2 }}"), operator: { type: 'string', operation: 'notEmpty', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const pagina3 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'HTTP - Pagina 3',
    parameters: {
      url: expr("{{ $json.page_2 }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept-Language', value: 'it,en;q=0.9,es;q=0.8,fr;q=0.8,de;q=0.7,*;q=0.5' }
      ] },
      options: {
        batching: { batch: { batchSize: 10, batchInterval: 200 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        timeout: 10000
      }
    },
    // Un sito irraggiungibile o un URL rotto non deve mai fermare la ricerca.
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const estraiP3 = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Estrai email pagina 3', parameters: { mode: 'runOnceForEachItem', jsCode: "// Estrae le email dalla pagina scaricata (PAGINA 3) e sceglie la migliore\n// tra quelle trovate finora sul sito ufficiale. Punteggi:\n// 5   email del dominio con il nome della persona   -> personal\n// 4.5 email gratuita (gmail...) in un mailto, col nome -> personal (free provider)\n// 4   email generica del dominio (info@, sales@...)  -> generic\n// 3   email di un'altra persona del dominio          -> other_person\n// 2   email gratuita in un mailto, senza il nome     -> generic (free provider)\n// 1   privacy@ / dpo@ del dominio                    -> privacy (mai venduta)\n// Nessuna email viene \"indovinata\" qui: solo email realmente presenti nella pagina.\nconst prospect = $('Serve pagina 3?').item.json;\nconst job = $('Valida richiesta').first().json;\nconst FASE = 'PAGINA 3';\nconst FONTE = $('Serve pagina 3?').item.json.page_2;\n\nlet html = String($json.html ?? '');\n\nconst cleanHost = (raw) => String(raw ?? '').trim().toLowerCase()\n  .replace(/^https?:\\/\\//i, '').replace(/^\\/\\//, '')\n  .split('/')[0].split('?')[0].split('#')[0]\n  .replace(/^www\\./, '').replace(/:\\d+$/, '');\n\nconst decodeCfEmail = (encoded) => {\n  try {\n    if (!encoded || encoded.length < 4) return '';\n    const key = parseInt(encoded.slice(0, 2), 16);\n    let email = '';\n    for (let i = 2; i < encoded.length; i += 2) {\n      email += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);\n    }\n    return email;\n  } catch {\n    return '';\n  }\n};\n\nhtml = html\n  .replace(/&#(\\d+);/g, (_, n) => String.fromCharCode(Number(n)))\n  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))\n  .replace(/&commat;/gi, '@').replace(/&period;/gi, '.')\n  .replace(/\\\\u0040/gi, '@').replace(/\\\\u002e/gi, '.')\n  .replace(/\\\\x40/gi, '@').replace(/\\\\x2e/gi, '.')\n  .replace(/%40/gi, '@').replace(/%2e/gi, '.')\n  .replace(/\\s*\\[\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\]\\s*/gi, '@')\n  .replace(/\\s*\\(\\s*(?:at|chiocciola|arroba|\u00e4t)\\s*\\)\\s*/gi, '@')\n  .replace(/\\s*\\[\\s*(?:dot|punto|punkt|point)\\s*\\]\\s*/gi, '.')\n  .replace(/\\s*\\(\\s*(?:dot|punto|punkt|point)\\s*\\)\\s*/gi, '.');\n\n// Email nella pagina (\"sicure\" = in un mailto o protette da Cloudflare).\nconst sicure = new Set();\nconst tutte = [];\nlet m;\nconst cfRegex = /data-cfemail=[\"']([0-9a-f]+)[\"']/gi;\nwhile ((m = cfRegex.exec(html)) !== null) {\n  const e = decodeCfEmail(m[1]);\n  if (e) { sicure.add(e.toLowerCase()); tutte.push(e); }\n}\nconst mailtoRegex = /mailto:([^\"'?#\\s<>]+)/gi;\nwhile ((m = mailtoRegex.exec(html)) !== null) {\n  let v = m[1];\n  try { v = decodeURIComponent(v); } catch {}\n  sicure.add(v.toLowerCase().trim());\n  tutte.push(v);\n}\ntutte.push(...(html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || []));\n\nconst ESTENSIONI = /\\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?|ttf|pdf)$/i;\nconst SCARTA_LOCALI = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|example|test|user|email|e-mail|name|nome|your|youremail|yourname|you|tuonome|sentry|wordpress|webmaster|hostmaster|jobs?|careers?|lavora(con)?noi|recruit(ment|ing)?|cv|hr|bewerbung|praktikum|stage|empleo|trabaja|vacatures|rekrutacja|kariera|unsubscribe|bounce)$/;\nconst SCARTA_DOMINI = /(^|\\.)(example\\.(com|org)|sentry\\.io|sentry-next\\.wixpress\\.com|wixpress\\.com|domain\\.com|email\\.com|yoursite\\.com|godaddy\\.com|wix\\.com|squarespace\\.com|sentry\\.wixpress\\.com)$/;\nconst GRATUITE = /(^|\\.)(gmail\\.com|googlemail\\.com|icloud\\.com|me\\.com|aol\\.com|protonmail\\.(com|ch)|proton\\.me|mail\\.com|zoho\\.(com|eu)|(hotmail|outlook|live|yahoo|gmx|msn)\\.[a-z.]+|libero\\.it|virgilio\\.it|tiscali\\.it|alice\\.it|tin\\.it|fastwebnet\\.it|seznam\\.cz|centrum\\.(cz|sk)|email\\.cz|wp\\.pl|o2\\.pl|onet\\.(pl|eu)|interia\\.(pl|eu)|abv\\.bg|otenet\\.gr|freemail\\.hu|sapo\\.pt|telenet\\.be|skynet\\.be|ziggo\\.nl|kpnmail\\.nl|bluewin\\.ch|aon\\.at|eircom\\.net|btinternet\\.com|sky\\.com|telia\\.com|online\\.no|web\\.de|t-online\\.de|orange\\.fr|free\\.fr|wanadoo\\.fr|laposte\\.net|sfr\\.fr|yandex\\.(com|ru)|pec\\.it|legalmail\\.it|arubapec\\.it)$/;\nconst PEC = /(^|\\.)(pec\\.[a-z.]+|legalmail\\.it|arubapec\\.it|postacert\\.[a-z.]+|pecimprese\\.it|cert\\.[a-z.]+)$/;\nconst GENERICHE = new Set([\n  'info', 'infos', 'hello', 'hi', 'ciao', 'contact', 'contacts', 'contatti', 'kontakt', 'kontakty', 'contacto', 'contato', 'contacte',\n  'office', 'ufficio', 'mail', 'post', 'posta', 'postmottak', 'admin', 'amministrazione', 'administration', 'administracion',\n  'segreteria', 'secretaria', 'secretariat', 'sekretariat', 'secretary', 'reception', 'recepcion', 'enquiries', 'enquiry',\n  'inquiries', 'inquiry', 'general', 'geral', 'sales', 'vendite', 'commerciale', 'business', 'ventas', 'vertrieb', 'verkauf',\n  'marketing', 'ordini', 'orders', 'order', 'support', 'assistenza', 'service', 'servizioclienti', 'customerservice',\n  'team', 'studio', 'company', 'azienda', 'firma', 'direzione', 'management', 'board', 'export', 'import', 'shop', 'store',\n  'booking', 'prenotazioni', 'kanzlei', 'kancelaria', 'cabinet', 'despacho', 'bufete', 'biuro', 'kontor', 'web', 'mailbox'\n]);\nconst PRIVACY = /^(privacy|dpo|gdpr|rodo|datenschutz|dataprotection|data\\.protection|protecciondedatos|lopd|rgpd|avg|legal|compliance)$/;\nconst SEGNAPOSTO = /^(firstname|first\\.?name|name|nome|nombre|prenom|vorname|voornaam|imie|jmeno|etunimi|fornamn|fornavn)[._-]?(lastname|last\\.?name|surname|cognome|apellidos?|nom|nachname|achternaam|nazwisko|prijmeni|sukunimi|efternamn|etternavn)?$/;\n\nconst dominio = cleanHost(prospect.website);\nconst titoli = new Set(['dr', 'dott', 'dssa', 'mr', 'mrs', 'ms', 'prof', 'avv', 'ing', 'arch', 'geom', 'rag', 'me', 'mag', 'mgr', 'adw', 'adv', 'lic', 'ldo', 'dra', 'jur', 'kc', 'qc', 'judr', 'dipl', 'phd']);\nconst parti = String(prospect.full_name ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()\n  .split(/[\\s-]+/).map(p => p.replace(/[^a-z]/g, '')).filter(p => p && !titoli.has(p));\nconst primo = parti[0] || '';\nconst ultimo = parti.length > 1 ? parti[parti.length - 1] : '';\n\nconst conNome = (local) => {\n  const l = local.replace(/[^a-z]/g, '');\n  if (ultimo.length >= 3 && l.includes(ultimo)) return true;\n  if (primo.length >= 3 && ultimo && l.startsWith(primo)) return true;\n  if (primo && ultimo && l === primo[0] + ultimo) return true;\n  return parti.slice(1, -1).some(p => p.length >= 4 && l.includes(p));\n};\n\nconst punteggio = (email) => {\n  const [local, dom] = email.split('@');\n  if (!local || !dom || SCARTA_LOCALI.test(local) || SCARTA_DOMINI.test(dom) || ESTENSIONI.test(email)) return 0;\n  if (dom.startsWith('www.') || SEGNAPOSTO.test(local) || PEC.test(dom)) return 0;\n  const delDominio = dominio && (dom === dominio || dom.endsWith('.' + dominio));\n  if (delDominio) {\n    if (conNome(local)) {\n      // Stesso cognome ma un altro nome (es. un familiare in azienda): non \u00e8 la persona.\n      const altroNome = local.split(/[._-]+/).some(t =>\n        /^[a-z]{3,}$/.test(t) && !parti.some(p => p === t || t.includes(p) || p.includes(t)));\n      return altroNome ? 3 : 5;\n    }\n    if (GENERICHE.has(local.replace(/[0-9]+$/, ''))) return 4;\n    if (PRIVACY.test(local)) return 1;\n    return 3;\n  }\n  if (GRATUITE.test(dom) && sicure.has(email)) return conNome(local) ? 4.5 : 2;\n  return 0;\n};\n\nconst TIPO = (p) => p >= 4.5 ? 'personal' : p >= 4 ? 'generic' : p >= 3 ? 'other_person' : p >= 2 ? 'generic' : 'privacy';\n\nconst precedenti = Array.isArray(prospect._emails) ? prospect._emails : [];\nconst trovate = [...precedenti];\nconst giaViste = new Set(precedenti.map(x => x.email));\n\nfor (const raw of tutte) {\n  const email = String(raw).toLowerCase().trim().replace(/^[^a-z0-9]+/, '').replace(/[),.;:'\"]+$/g, '');\n  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/.test(email) || giaViste.has(email)) continue;\n  giaViste.add(email);\n  const p = punteggio(email);\n  if (p > 0) trovate.push({ email, p, type: TIPO(p), free_provider: GRATUITE.test(email.split('@')[1]), source_url: FONTE, in_mailto: sicure.has(email) });\n}\n\ntrovate.sort((a, b) => b.p - a.p);\nconst migliore = trovate[0];\n\n// Quando fermarsi: con \"solo generiche\" basta una generica; altrimenti\n// si continua a cercare finch\u00e9 non c'\u00e8 una nominativa.\nconst soglia = job.email_mode === 'generic_ok' ? 4 : 4.5;\nconst basta = Boolean(migliore && migliore.p >= soglia);\n\nconst out = {\n  ...prospect,\n  _emails: trovate.slice(0, 8),\n  email_site: migliore ? migliore.email : '',\n  email_site_type: migliore ? migliore.type : '',\n  email_site_score: migliore ? migliore.p : 0,\n  email_site_source: migliore ? migliore.source_url : '',\n  email_site_free_provider: migliore ? migliore.free_provider : false,\n  pages_fetched: (Number(prospect.pages_fetched) || 0) + 1,\n  email_search_stage: (migliore ? 'FOUND ' : 'NOT FOUND ') + FASE\n};\n\nif (basta) out.page_2 = '';\nreturn { json: out };\n" } },
  output: [{ email_site: 'info@acme.it' }]
});

const riunisciEmail = merge({
  version: 3.2,
  config: { name: 'Riunisci email sito', parameters: { mode: 'append', numberInputs: 3 } }
});

const decidi = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Decidi arricchimento', parameters: { mode: 'runOnceForAllItems', jsCode: "// Decide chi passa dall'arricchimento a pagamento (RocketReach), entro il\n// tetto fissato dal backend per questa ricerca (budget del piano / margine).\n// Priorit\u00e0: 1) serve una nominativa e non c'\u00e8  2) nessuna email  3) \"mista\" con\n// sola generica (miglioramento facoltativo). A parit\u00e0, ruolo pi\u00f9 coerente.\nconst job = $('Valida richiesta').first().json;\nconst cap = job.limits.enrichment_cap;\n\nconst priorita = (j) => {\n  const s = Number(j.email_site_score) || 0;\n  if (s >= 4.5) return 0;                                           // gi\u00e0 nominativa\n  if (job.email_mode === 'personal_only') return 3;\n  if (s < 4) return 2;                                              // nessuna email utile\n  return job.email_mode === 'mixed' ? 1 : 0;                        // generica: ok o migliorabile\n};\nconst pesoRuolo = { exact: 2, plausible: 1, unknown: 0 };\n\nconst ordinati = $input.all()\n  .map((it, i) => ({ it, i, pr: priorita(it.json), r: pesoRuolo[it.json.role_match] ?? 0 }))\n  .sort((a, b) => b.pr - a.pr || b.r - a.r || a.i - b.i);\n\nlet usati = 0;\nreturn ordinati.map(x => {\n  const serve = x.pr > 0 && usati < cap;\n  if (serve) usati++;\n  return {\n    json: {\n      ...x.it.json,\n      needs_enrichment: serve,\n      enrichment_skipped: x.pr > 0 && !serve ? 'tetto_raggiunto' : ''\n    },\n    pairedItem: { item: x.i }\n  };\n});\n" } },
  output: [{ full_name: 'Mario Rossi', company_name: 'Acme Srl', job_title: 'CEO', needs_enrichment: true }]
});

const serveArricchimento = ifElse({
  version: 2.2,
  config: {
    name: 'Arricchimento necessario?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ $json.needs_enrichment }}"), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const icyCerca = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Icypeas - Avvia ricerca',
    parameters: {
      method: 'POST',
      url: 'https://app.icypeas.com/api/email-search',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ firstname: $json.first_name, lastname: $json.last_name, domainOrCompany: $json.domain }) }}"),
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 300 } },
        response: { response: { neverError: true } },
        timeout: 20000
      }
    },
    credentials: { httpHeaderAuth: { id: 'sdOCb0GxGnanvIRo', name: 'Icypeas API' } }
  },
  output: [{ success: true, items: [] }]
});

const icyAttendi = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: { name: 'Attendi Icypeas', parameters: { resume: 'timeInterval', amount: 20, unit: 'seconds' } }
});

const icyLeggi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Icypeas - Leggi risultato',
    parameters: {
      method: 'POST',
      url: 'https://app.icypeas.com/api/bulk-single-searchs/read',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ mode: 'single', id: $json.item?._id ?? $json.items?.[0]?._id ?? '' }) }}"),
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 300 } },
        response: { response: { neverError: true } },
        timeout: 20000
      }
    },
    credentials: { httpHeaderAuth: { id: 'sdOCb0GxGnanvIRo', name: 'Icypeas API' } }
  },
  output: [{ success: true, items: [] }]
});

const icyInCorso = ifElse({
  version: 2.2,
  config: {
    name: 'Icypeas in corso?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr("{{ ['NONE','SCHEDULED','IN_PROGRESS'].includes(String($json.items?.[0]?.status ?? '').toUpperCase()) }}"), operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const icyAttendi2 = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: { name: 'Attendi ancora Icypeas', parameters: { resume: 'timeInterval', amount: 30, unit: 'seconds' } }
});

const icyRileggi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Icypeas - Rileggi risultato',
    parameters: {
      method: 'POST',
      url: 'https://app.icypeas.com/api/bulk-single-searchs/read',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify({ mode: 'single', id: $json.item?._id ?? $json.items?.[0]?._id ?? '' }) }}"),
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 300 } },
        response: { response: { neverError: true } },
        timeout: 20000
      }
    },
    credentials: { httpHeaderAuth: { id: 'sdOCb0GxGnanvIRo', name: 'Icypeas API' } }
  },
  output: [{ success: true, items: [] }]
});

const riunisciIcy = merge({
  version: 3.2,
  config: { name: 'Riunisci Icypeas', parameters: { mode: 'append', numberInputs: 2 } }
});

const normalizzaIcy = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Normalizza Icypeas', parameters: { mode: 'runOnceForEachItem', jsCode: "// Risultato Icypeas -> campi email_enrichment_*.\n// Teniamo SOLO email del dominio aziendale con certezza alta (ultra_sure,\n// very_sure): le altre non vengono mai presentate come verificate.\n// Icypeas scala un credito solo quando trova (stato DEBITED).\nconst prospect = $('Arricchimento necessario?').item.json;\nconst r = $json.items?.[0] ?? {};\nconst statoIcy = String(r.status ?? '').toUpperCase();\n\nconst CERTE = ['ultra_sure', 'very_sure'];\nconst emails = Array.isArray(r.results?.emails) ? r.results.emails : [];\nconst dominio = String(prospect.domain || '').toLowerCase();\nconst delDominio = (e) => {\n  const x = String(e || '').toLowerCase();\n  return dominio && (x.endsWith('@' + dominio) || x.endsWith('.' + dominio));\n};\nconst certa = emails.find(e => e?.email && CERTE.includes(String(e.certainty)) && delDominio(e.email));\n\nlet stato;\nif (certa) stato = 'VALIDATED';\nelse if (emails.some(e => e?.email && delDominio(e.email))) stato = 'LOW_CERTAINTY';\nelse if (emails.length) stato = 'OTHER_DOMAIN';\nelse if (['NONE', 'SCHEDULED', 'IN_PROGRESS'].includes(statoIcy)) stato = 'PENDING';\nelse if (statoIcy === 'INSUFFICIENT_FUNDS' || $json.statusCode === 429) stato = 'RATE_LIMIT';\nelse stato = 'NOT_FOUND';\n\nreturn {\n  json: {\n    ...prospect,\n    email_enrichment: certa ? String(certa.email).toLowerCase() : '',\n    email_enrichment_status: stato,\n    email_enrichment_certainty: certa ? certa.certainty : '',\n    enrichment_lookups: statoIcy === 'DEBITED' ? 1 : 0\n  }\n};\n" } },
  output: [{ email_enrichment: '', email_enrichment_status: 'NOT_FOUND' }]
});

const riunisciEsiti = merge({
  version: 3.2,
  config: { name: 'Riunisci esiti', parameters: { mode: 'append', numberInputs: 3 } }
});

const classifica = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Classifica e prepara risultati', parameters: { mode: 'runOnceForAllItems', jsCode: "// Classifica ogni prospect secondo la modalit\u00e0 email scelta dal cliente e\n// prepara UN solo payload \"results\" per il backend.\n//\n// Stato dell'email (mai confusi tra loro):\n//   found_public -> presente su una pagina pubblica del sito ufficiale (fonte = URL)\n//   validated    -> verificata tecnicamente da un servizio di arricchimento (SMTP valid)\n//   unverified   -> trovata ma senza verifica n\u00e9 fonte pubblica (oggi: non prodotta)\n//   guessed      -> ipotizzata dal pattern nome.cognome@dominio: NON \u00e8 un'email\n//                   del lead, va solo in email_patterns e non si vende come contatto.\n//\n// Il backend ripete la deduplica contro lo storico del cliente prima di\n// addebitare: questo payload \u00e8 una proposta, non una consegna.\nconst job = $('Valida richiesta').first().json;\nconst items = $input.all().map(i => i.json);\nconst vuoto = items.length === 1 && items[0]._vuoto;\nconst prospects = vuoto ? [] : items.filter(j => !j._vuoto);\n\nconst cleanPart = (v) => String(v ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')\n  .toLowerCase().replace(/[^a-z0-9]/g, '');\n\nconst pattern = (p) => {\n  const first = cleanPart(p.first_name);\n  const last = cleanPart(String(p.last_name ?? '').split(/\\s+/).pop());\n  if (!first || !last || !p.domain) return [];\n  return [`${first}.${last}@${p.domain}`, `${first[0]}${last}@${p.domain}`, `${first}@${p.domain}`];\n};\n\nconst leads = [];\nconst rejected = [];\nlet lookups = 0;\nlet pagine = 0;\n\nfor (const p of prospects) {\n  lookups += Number(p.enrichment_lookups) || 0;\n  pagine += Number(p.pages_fetched) || 0;\n\n  const sito = p.email_site\n    ? {\n        address: p.email_site,\n        type: p.email_site_type,\n        status: 'found_public',\n        source: 'website',\n        source_url: p.email_site_source || p.website,\n        free_provider: Boolean(p.email_site_free_provider)\n      }\n    : null;\n  const arricchita = p.email_enrichment\n    ? { address: p.email_enrichment, type: 'personal', status: 'validated', source: 'enrichment', source_url: '', free_provider: false }\n    : null;\n\n  // Nominativa: dal sito (con nome) o validata. Generica: solo dal dominio aziendale\n  // o in un mailto del sito. \"other_person\" e \"privacy\" non si vendono mai.\n  const nominativa = sito && sito.type === 'personal' ? sito : arricchita;\n  const generica = sito && sito.type === 'generic' ? sito : null;\n\n  let email = null;\n  let motivo = '';\n  if (job.email_mode === 'personal_only') {\n    email = nominativa;\n    if (!email) motivo = generica ? 'solo_email_generica' : 'nessuna_email';\n  } else {\n    // generic_ok e mixed accettano entrambe; cambiano la priorit\u00e0 di ricerca\n    // (mixed insiste di pi\u00f9 sulle nominative) e il prezzo, non il filtro.\n    email = nominativa || generica;\n    if (!email) motivo = 'nessuna_email';\n  }\n\n  if (p.email_enrichment_status === 'RATE_LIMIT' || p.email_enrichment_status === 'PENDING') {\n    if (!email) motivo = 'arricchimento_da_riprovare';\n  }\n\n  const base = {\n    company: {\n      name: p.company_name, domain: p.domain, website: p.website, country: p.country,\n      city: p.city, industry: p.industry, size_hint: p.size_hint\n    },\n    person: {\n      full_name: p.full_name, first_name: p.first_name, last_name: p.last_name,\n      job_title: p.job_title, role_match: p.role_match, linkedin_url: p.linkedin_url || ''\n    },\n    sources: { discovery_url: p.source_url, contact_page: p.contact_page || '' },\n    keys: { person_key: p.person_key, company_key: p.company_key }\n  };\n\n  if (!email) {\n    rejected.push({ ...base, reason: motivo, enrichment_status: p.email_enrichment_status || '' });\n    continue;\n  }\n\n  const altre = (p._emails || [])\n    .filter(e => e.email !== email.address && (e.type === 'personal' || e.type === 'generic'))\n    .slice(0, 3)\n    .map(e => ({ address: e.email, type: e.type, status: 'found_public', source_url: e.source_url }));\n\n  // Punteggio qualit\u00e0 0-100: trasparente e ricalcolabile dal backend.\n  const checks = {\n    official_site: true,\n    discovery_source: Boolean(p.source_url),\n    role_match: p.role_match,\n    email_on_company_domain: !email.free_provider,\n    email_personal: email.type === 'personal',\n    email_verified: email.status === 'validated' || email.status === 'found_public'\n  };\n  const score = Math.min(100,\n    30 +\n    (checks.discovery_source ? 10 : 0) +\n    (p.role_match === 'exact' ? 20 : p.role_match === 'plausible' ? 10 : 0) +\n    (checks.email_on_company_domain ? 10 : 0) +\n    (checks.email_personal ? 20 : 5) +\n    (email.status === 'validated' ? 10 : email.status === 'found_public' ? 8 : 0));\n\n  leads.push({\n    ...base,\n    email: { ...email, alternatives: altre },\n    email_patterns: email.type === 'personal' ? [] : pattern(p).map(a => ({ address: a, status: 'guessed' })),\n    quality: { score, checks }\n  });\n}\n\n// Ordine: prima le nominative e i punteggi pi\u00f9 alti.\nleads.sort((a, b) => b.quality.score - a.quality.score);\n\nconst lotti = $('Normalizza output AI').all().map(i => i.json);\nconst dedup = vuoto ? items[0].stats : (prospects[0]?._stats_deduplica || {});\nconst motivi = rejected.reduce((m, r) => ({ ...m, [r.reason]: (m[r.reason] || 0) + 1 }), {});\n\nreturn [{\n  json: {\n    event: 'results',\n    contract_version: 1,\n    job_id: job.job_id,\n    run_id: job.run_id,\n    run_token: job.run_token,\n    email_mode: job.email_mode,\n    requested: job.quantity,\n    leads,\n    rejected,\n    stats: {\n      lots: lotti.length,\n      lots_failed: lotti.filter(l => l.stato_lotto === 'ERRORE' || l.stato_lotto === 'JSON NON VALIDO').length,\n      ai_candidates: dedup.candidati_ai || 0,\n      valid_candidates: dedup.candidati_validi || 0,\n      dedup_discards: dedup.scarti || {},\n      leads: leads.length,\n      leads_personal: leads.filter(l => l.email.type === 'personal').length,\n      leads_generic: leads.filter(l => l.email.type === 'generic').length,\n      rejected: rejected.length,\n      rejected_reasons: motivi\n    },\n    usage: {\n      ai_search_calls: lotti.length,\n      ai_planner_calls: 1,\n      enrichment_lookups: lookups,\n      pages_fetched: pagine\n    },\n    n8n_execution_id: $execution.id\n  }\n}];\n" } },
  output: [{ event: 'results', job_id: 'x', leads: [], rejected: [], stats: {}, usage: {} }]
});

const inviaRisultati = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Invia risultati al backend',
    
    retryOnFail: true, maxTries: 5, waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: expr("{{ $('Valida richiesta').first().json.callback_url }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify($json) }}"),
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: newCredential('Lead Engine - Callback verso backend') }
  },
  output: [{ ok: true }]
});

const nota = sticky(
  '## Lead Engine | Search (v1)\n' +
  'Motore di ricerca prospect **generalista** chiamato dalla piattaforma SaaS via webhook autenticato.\n\n' +
  '**Flusso:** richiesta validata (anti-SSRF) -> piano AI in lotti -> ricerca AI con web search -> ' +
  'deduplica (anche contro lo storico del cliente) -> email dal sito ufficiale (homepage, contatti, note legali) -> ' +
  'Icypeas solo se serve e entro il tetto del backend -> classificazione per modalita email -> callback al backend.\n\n' +
  '**Non genera mai email ipotizzate come contatti:** i pattern finiscono in `email_patterns` con stato `guessed`.\n\n' +
  '**Prima di attivare:** 1) verifica `DOMINIO_PIATTAFORMA` in *Valida richiesta* (oggi weborastudio.it); 2) crea le due credenziali ' +
  '(*Lead Engine - Webhook in ingresso*: Header Auth; *Lead Engine - Callback verso backend*: header `X-Engine-Secret`) con segreti lunghi casuali, gli stessi del backend.\n\n' +
  'Sorgenti, test e contratto API: GitHub `marcoscazzari03/prospect-azienda` (cartella n8n/engine).',
  [],
  { color: 7, width: 760, height: 420 }
);

export default workflow('lead-engine-search-v1', 'Lead Engine | Search (v1)')
  .add(webhook)
  .to(valida)
  .to(richiestaValida
    .onTrue(notificaAvvio.to(planner))
    .onFalse(rifiuta))
  .add(planner)
  .to(prepara)
  .to(ricerca)
  .to(normalizzaAI)
  .to(deduplica)
  .to(ciSonoCandidati
    .onTrue(homepage)
    .onFalse(riunisciEsiti.input(2)))
  .add(deduplica)
  .to(notificaVerifica)
  .add(homepage)
  .to(estraiHome)
  .to(servePagina2
    .onTrue(pagina2)
    .onFalse(riunisciEmail.input(0)))
  .add(pagina2)
  .to(estraiP2)
  .to(servePagina3
    .onTrue(pagina3.to(estraiP3).to(riunisciEmail.input(2)))
    .onFalse(riunisciEmail.input(1)))
  .add(riunisciEmail)
  .to(decidi)
  .to(serveArricchimento
    .onTrue(icyCerca)
    .onFalse(riunisciEsiti.input(0)))
  .add(icyCerca)
  .to(icyAttendi)
  .to(icyLeggi)
  .to(icyInCorso
    .onTrue(icyAttendi2.to(icyRileggi).to(riunisciIcy.input(1)))
    .onFalse(riunisciIcy.input(0)))
  .add(riunisciIcy)
  .to(normalizzaIcy)
  .to(riunisciEsiti.input(1))
  .add(riunisciEsiti)
  .to(classifica)
  .to(inviaRisultati)
  .add(nota)
  .group('1 - Richiesta', [valida, richiestaValida, rifiuta, notificaAvvio], { description: 'Valida il payload del backend, blocca callback non ammessi e prepara il brief per l AI.' })
  .group('2 - Ricerca AI', [planner, modelloPlanner, prepara, ricerca, modelloRicerca, normalizzaAI], { description: 'Piano in lotti non sovrapposti, ricerca web per lotto, recupero output anche se malformato.' })
  .group('3 - Email dal sito', [homepage, estraiHome, servePagina2, pagina2, estraiP2, servePagina3, pagina3, estraiP3, riunisciEmail], { description: 'Email reali dal sito ufficiale: homepage, contatti, note legali. Nessuna email ipotizzata.' })
  .group('4 - Arricchimento', [icyCerca, icyAttendi, icyLeggi, icyInCorso, icyAttendi2, icyRileggi, riunisciIcy, normalizzaIcy], { description: 'Icypeas solo per chi ne ha bisogno ed entro il tetto deciso dal backend. Solo email del dominio con certezza alta.' })
  .group('5 - Consegna', [classifica, inviaRisultati], { description: 'Classifica per modalita email, calcola qualita e invia i risultati al backend con retry.' });
