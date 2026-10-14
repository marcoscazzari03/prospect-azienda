import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GENERATO da n8n/annunci/build.mjs: non modificare a mano.
// Controllo dei siti del database (gratis, solo richieste HTTP): ogni ora 120 aziende mai
// controllate o controllate da più di 25 giorni, con le stesse regole del motore. Le prove
// (HTTPS, CMS vecchio, mobile, lingue, copyright...) servono alle ricerche opportunità
// senza ricerca AI e restano fresche (valgono 30 giorni).

const ogniOra = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Ogni ora',
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 25 }] } }
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
    name: 'Aziende da controllare',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      url: 'https://leads.weborastudio.it/api/engine/site-checks?limit=120',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      options: { timeout: 30000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ companies: [{ company_id: '00000000-0000-4000-8000-000000000000', domain: 'vargroup.it', name: 'Var Group', website: 'https://vargroup.it' }] }]
});

const daControllare = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Siti da controllare',
    parameters: { jsCode: "return ($input.first().json.companies || []).map(c => ({ json: c }));" }
  },
  output: [{ company_id: '00000000-0000-4000-8000-000000000000', domain: 'vargroup.it', name: 'Var Group', website: 'https://vargroup.it' }]
});

const https = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Controllo HTTPS',
    parameters: {
      url: expr("{{ 'https://' + $json.domain + '/' }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 3 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'https_body' } },
        timeout: 8000
      }
    },
    // L'errore (certificato scaduto, HTTPS assente) è proprio l'esito da registrare.
    onError: 'continueRegularOutput'
  },
  output: [{ https_body: '<html></html>' }]
});

const apri = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Apri sito',
    parameters: {
      url: expr("{{ $('Siti da controllare').item.json.website }}"),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' },
        { name: 'Accept', value: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        { name: 'Accept-Language', value: 'it,en;q=0.8' }
      ] },
      options: {
        batching: { batch: { batchSize: 2, batchInterval: 500 } },
        redirect: { redirect: { followRedirects: true, maxRedirects: 5 } },
        response: { response: { neverError: true, responseFormat: 'text', outputPropertyName: 'html' } },
        allowUnauthorizedCerts: true,
        timeout: 10000
      }
    },
    onError: 'continueRegularOutput'
  },
  output: [{ html: '<html></html>' }]
});

const valuta = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Valuta siti',
    parameters: { jsCode: "// Controllo dei siti del database: stesse regole del motore (controlliSito, condiviso con\n// «Valuta segnali sito»), su tutti i controlli. Gli esiti vanno in company_checks e le prove\n// (pass) in company_signals, pronte per le ricerche opportunità senza AI.\n// Ogni azienda viene salvata come controllata, anche con il sito irraggiungibile\n// (tutti «non determinabile»): si riprova tra 25 giorni.\nconst aziende = $('Siti da controllare').all().map(i => i.json);\nconst https = $('Controllo HTTPS').all().map(i => i.json);\nconst pagine = $input.all().map(i => i.json);\nconst oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); // AAAA-MM-GG\nconst CODICI = ['no_https', 'no_mobile', 'outdated_cms', 'single_language', 'stale_copyright', 'under_construction', 'no_booking_engine'];\n\nconst items = [];\nconst stats = { companies: 0, unreachable: 0, signals: {} };\naziende.forEach((a, i) => {\n  const html = String(pagine[i]?.html ?? '');\n  const { esiti, tecnologie } = controlliSito({ html, website: a.website, oggi, richiesti: CODICI, https: https[i] || {} });\n  const checks = Object.values(esiti);\n  if (html.length < 500) stats.unreachable++;\n  for (const c of checks) if (c.status === 'pass') stats.signals[c.code] = (stats.signals[c.code] || 0) + 1;\n  items.push({ company: { domain: a.domain, name: a.name, website: a.website, technologies: tecnologie }, checks });\n});\nstats.companies = items.length;\nreturn [{ json: { items, stats } }];\n\n// Controlli tecnici sul sito (regole in docs/07-segnali.md), condivisi dal motore\n// («Valuta segnali sito», «Controlli tecnici sito») e dal workflow «Aziende | Controllo siti».\n// Inserito al posto di __CONTROLLI_SITO__ da build.py / build.mjs.\n//   html: homepage; website: URL del sito; oggi: AAAA-MM-GG; richiesti: codici da controllare;\n//   https: esito della richiesta HTTPS ({ https_body } o { error }), solo per no_https.\n// Ogni esito: pass (presente, con la prova), fail (assente), undetermined (non dimostrabile).\nfunction controlliSito({ html, website, oggi, richiesti, https }) {\n  const testo = html.replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>|<noscript[\\s\\S]*?<\\/noscript>/gi, ' ')\n    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&copy;|&#169;/gi, '©').replace(/\\s+/g, ' ').trim();\n  const leggibile = html.length > 200 && /<html|<body|<head/i.test(html);\n  const contenuto = testo.length >= 200;\n  const anno = Number(oggi.slice(0, 4));\n\n  // Tabella delle versioni (da src/lib/domain/cms-releases.json, inserita dalla build).\n  const RILASCI = {\"wordpress\":[[\"4.9\",\"2017-11-16\"],[\"5.0\",\"2018-12-06\"],[\"5.1\",\"2019-02-21\"],[\"5.2\",\"2019-05-07\"],[\"5.3\",\"2019-11-12\"],[\"5.4\",\"2020-03-31\"],[\"5.5\",\"2020-08-11\"],[\"5.6\",\"2020-12-08\"],[\"5.7\",\"2021-03-09\"],[\"5.8\",\"2021-07-20\"],[\"5.9\",\"2022-01-25\"],[\"6.0\",\"2022-05-24\"],[\"6.1\",\"2022-11-01\"],[\"6.2\",\"2023-03-29\"],[\"6.3\",\"2023-08-08\"],[\"6.4\",\"2023-11-07\"],[\"6.5\",\"2024-04-02\"],[\"6.6\",\"2024-07-16\"],[\"6.7\",\"2024-11-12\"],[\"6.8\",\"2025-04-15\"]],\"joomla\":[[\"3.9\",\"2018-10-30\"],[\"3.10\",\"2021-08-17\"],[\"4.0\",\"2021-08-17\"],[\"4.1\",\"2022-02-15\"],[\"4.2\",\"2022-08-16\"],[\"4.3\",\"2023-04-18\"],[\"4.4\",\"2023-10-17\"],[\"5.0\",\"2023-10-17\"],[\"5.1\",\"2024-04-16\"],[\"5.2\",\"2024-10-15\"],[\"5.3\",\"2025-04-15\"]],\"woocommerce\":[[\"5.0\",\"2021-02-09\"],[\"6.0\",\"2021-12-14\"],[\"7.0\",\"2022-10-11\"],[\"8.0\",\"2023-08-08\"],[\"9.0\",\"2024-06-11\"]]};\n  const v2n = (v) => String(v).split('.').map(x => parseInt(x, 10) || 0);\n  const cmp = (a, b) => { const x = v2n(a), y = v2n(b); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };\n  const limite = `${anno - 2}${oggi.slice(4)}`; // oggi meno 2 anni (AAAA-MM-GG)\n  const vecchia = (cms, versione) => {\n    const tab = RILASCI[cms] || [];\n    const mm = versione.split('.').slice(0, 2).join('.');\n    const nota = tab.find(([v]) => v === mm);\n    if (nota && nota[1] <= limite) return nota[1];\n    const dopo = tab.find(([v, d]) => cmp(v, versione) > 0 && d <= limite);\n    return dopo ? `prima del ${dopo[1]}` : '';\n  };\n\n  const esiti = {};\n  const metti = (code, status, detail = '') => {\n    esiti[code] = { code, status, evidence: { detail, url: website, checked_at: oggi } };\n  };\n\n  // Tecnologie (filtro di segmentazione, sempre calcolate quando si valutano segnali).\n  const tecnologie = [];\n  if (/wp-content|wp-includes|name=[\"']generator[\"'][^>]*wordpress/i.test(html)) tecnologie.push('wordpress');\n  if (/woocommerce/i.test(html)) tecnologie.push('woocommerce');\n  if (/name=[\"']generator[\"'][^>]*joomla|\\/media\\/jui\\/|\\/components\\/com_/i.test(html)) tecnologie.push('joomla');\n  if (/static\\.wixstatic\\.com|wix\\.com|_wixCIDX|X-Wix/i.test(html)) tecnologie.push('wix');\n  if (/cdn\\.shopify\\.com|Shopify\\.theme/i.test(html)) tecnologie.push('shopify');\n\n  if (richiesti.includes('no_mobile')) {\n    if (!leggibile) metti('no_mobile', 'undetermined');\n    else if (/<meta[^>]+name=[\"']?viewport/i.test(html)) metti('no_mobile', 'fail');\n    else if (/<link[^>]+rel=[\"']alternate[\"'][^>]+media=[\"'][^\"']*max-width/i.test(html) || /href=[\"']https?:\\/\\/m\\./i.test(html)) metti('no_mobile', 'fail', 'versione mobile separata');\n    else metti('no_mobile', 'pass', 'Homepage senza impostazione per dispositivi mobili');\n  }\n\n  if (richiesti.includes('outdated_cms')) {\n    const versioni = [];\n    for (const m of html.matchAll(/name=[\"']generator[\"'][^>]*content=[\"']([^\"']+)[\"']|content=[\"']([^\"']+)[\"'][^>]*name=[\"']generator[\"']/gi)) {\n      const g = m[1] || m[2] || '';\n      const wp = g.match(/WordPress\\s+(\\d+\\.\\d+(?:\\.\\d+)?)/i); if (wp) versioni.push(['wordpress', wp[1]]);\n      const jo = g.match(/Joomla!?\\s*(?:-\\s*Open Source Content Management\\s*)?(\\d+\\.\\d+(?:\\.\\d+)?)/i); if (jo) versioni.push(['joomla', jo[1]]);\n      const wc = g.match(/WooCommerce\\s+(\\d+\\.\\d+(?:\\.\\d+)?)/i); if (wc) versioni.push(['woocommerce', wc[1]]);\n    }\n    if (!versioni.some(([c]) => c === 'wordpress')) {\n      const ver = html.match(/\\/wp-includes\\/[^\"'?]+\\?ver=(\\d+\\.\\d+(?:\\.\\d+)?)/i);\n      if (ver) versioni.push(['wordpress', ver[1]]);\n    }\n    const NOMI = { wordpress: 'WordPress', joomla: 'Joomla', woocommerce: 'WooCommerce' };\n    const vecchie = versioni.map(([c, v]) => [c, v, vecchia(c, v)]).filter(x => x[2]);\n    if (!leggibile || !versioni.length) metti('outdated_cms', 'undetermined');\n    else if (vecchie.length) metti('outdated_cms', 'pass', vecchie.map(([c, v, d]) => `${NOMI[c]} ${v} (${/^\\d/.test(d) ? `versione del ${d}` : d})`).join(', '));\n    else metti('outdated_cms', 'fail', versioni.map(([c, v]) => `${NOMI[c]} ${v}`).join(', '));\n  }\n\n  if (richiesti.includes('single_language')) {\n    const LINGUE = 'en|de|fr|es|it|pt|nl|pl|cs|ru|zh|ja';\n    const altre = /hreflang=[\"'](?!x-default)[a-z]{2}/i.test(html)\n      || new RegExp(`href=[\"'](?:https?://[^\"'/]+)?/(?:${LINGUE})(?:[-_][a-z]{2})?/?[\"'/?#]`, 'i').test(html)\n      || /[?&](?:lang|language|lng)=[a-z]{2}/i.test(html)\n      || new RegExp(`href=[\"']https?://(?:${LINGUE})\\\\.`, 'i').test(html)\n      || new RegExp(`>\\\\s*(?:${LINGUE.toUpperCase()})\\\\s*</a>`).test(html);\n    const lingua = (html.match(/<html[^>]+lang=[\"']([a-z]{2})/i) || [])[1] || '';\n    if (!leggibile || !contenuto) metti('single_language', 'undetermined');\n    else if (altre) metti('single_language', 'fail');\n    else metti('single_language', 'pass', `Nessuna versione in altre lingue${lingua ? ` (lingua: ${lingua})` : ''}`);\n  }\n\n  if (richiesti.includes('stale_copyright')) {\n    const anni = [...testo.matchAll(/(?:©|copyright)[^0-9]{0,30}((?:19|20)\\d{2})(?:\\s*[-–]\\s*((?:19|20)\\d{2}))?/gi)]\n      .map(m => Number(m[2] || m[1])).filter(y => y >= 1995 && y <= anno + 1);\n    if (!contenuto || !anni.length) metti('stale_copyright', 'undetermined');\n    else {\n      const ultimo = Math.max(...anni);\n      if (anno - ultimo >= 3) metti('stale_copyright', 'pass', `Copyright fermo al ${ultimo}`);\n      else metti('stale_copyright', 'fail', `Copyright ${ultimo}`);\n    }\n  }\n\n  if (richiesti.includes('under_construction')) {\n    const provvisoria = /in costruzione|coming soon|under construction|en construcci[oó]n|en construction|bient[oô]t en ligne|in k[uü]rze|im aufbau|sito in manutenzione|maintenance mode|torneremo presto online/i;\n    if (!leggibile) metti('under_construction', 'undetermined');\n    else if (provvisoria.test(testo) && testo.length < 800) metti('under_construction', 'pass', 'Homepage provvisoria');\n    else metti('under_construction', 'fail');\n  }\n\n  if (richiesti.includes('no_booking_engine')) {\n    const MOTORI = /simplebooking|vertical-?booking|octorate|bedzzle|ericsoft|cloudbeds|synxis|booking-?expert|passepartout|bookingsuite|hotelinone|blastness|5stelle|scrigno|wubook|bookassist|d-edge|availpro|smartbooking|roiback|mirai\\.com|siteminder|thebookingbutton|littlehotelier|beds24|hotelrunner|guestcentric|travelclick|ihotelier|bookingengine/i;\n    if (!leggibile) metti('no_booking_engine', 'undetermined');\n    else if (MOTORI.test(html)) metti('no_booking_engine', 'fail');\n    else if (!contenuto) metti('no_booking_engine', 'undetermined');\n    else metti('no_booking_engine', 'pass', 'Nessun booking engine riconosciuto nella homepage');\n  }\n\n  if (richiesti.includes('no_https')) {\n    // Esito della richiesta HTTPS: presente solo se eseguita.\n    const h = https;\n    const eseguito = h && (h.https_body !== undefined || h.error !== undefined);\n    const msg = String(h?.error?.message ?? h?.error ?? '');\n    if (!eseguito) metti('no_https', 'undetermined');\n    else if (!h.error) metti('no_https', 'fail');\n    else if (/certificate|self.signed|CERT_|ERR_TLS|SSL|unable to verify|altname|expired/i.test(msg)) metti('no_https', 'pass', 'Certificato HTTPS non valido o scaduto');\n    else if (/ECONNREFUSED/i.test(msg) && /^http:\\/\\//i.test(website) && leggibile) metti('no_https', 'pass', 'Il sito non risponde in HTTPS');\n    else metti('no_https', 'undetermined');\n  }\n\n  return { testo, esiti, tecnologie };\n}\n\n" }
  },
  output: [{ items: [], stats: {} }]
});

const salva = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Salva controlli',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'POST',
      url: 'https://leads.weborastudio.it/api/engine/site-checks',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ items: $json.items }) }}'),
      options: { timeout: 60000 }
    },
    credentials: { httpHeaderAuth: { id: 'kaAuSs06rml1sMA9', name: 'Lead Engine - Callback verso backend' } }
  },
  output: [{ ok: true, saved: 0 }]
});

export default workflow('aziende-controllo-siti', 'Aziende | Controllo siti', {
  timezone: 'Europe/Rome',
  errorWorkflow: 'LOw3fRo49WKvrF6z',
  executionOrder: 'v1'
})
  .add(ogniOra)
  .to(aziende)
  .to(daControllare)
  .to(https)
  .to(apri)
  .to(valuta)
  .to(salva)
  .add(aMano)
  .to(aziende);
