// Esito della classificazione: settore e parole chiave per ogni azienda del lotto (la
// posizione «n» collega la risposta all'azienda). Una risposta mancante o illeggibile
// non salva nulla: quelle aziende tornano nel prossimo giro.
const richieste = $('Prepara settore').all().map(i => i.json);
const pulisci = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const results = [];
const stats = { companies: 0, classified: 0, unknown: 0, failed: 0, input_tokens: 0, output_tokens: 0 };
for (const id of richieste[0]?.senza_testo || []) { results.push({ company_id: id, industry: '', keywords: [] }); stats.unknown++; }

$input.all().forEach((item, i) => {
  const r = item.json || {};
  const p = richieste[item.pairedItem?.item ?? i] || {};
  stats.input_tokens += Number(r.usage?.input_tokens) || 0;
  stats.output_tokens += Number(r.usage?.output_tokens) || 0;
  const testo = (Array.isArray(r.content) ? r.content : []).filter(b => b?.type === 'text').map(b => b.text).join('');
  let elenco = null;
  try { const a = testo.indexOf('{'); const b = testo.lastIndexOf('}'); elenco = JSON.parse(testo.slice(a, b + 1)).aziende; } catch { elenco = null; }
  if (!Array.isArray(elenco)) { stats.failed += (p.aziende || []).length; return; }
  (p.aziende || []).forEach((id, k) => {
    const e = elenco.find(x => Number(x?.n) === k + 1);
    if (!e) { stats.failed++; return; }
    const industry = pulisci(e.industry, 120);
    const keywords = industry && Array.isArray(e.keywords)
      ? [...new Set(e.keywords.map(w => pulisci(w, 60).toLowerCase()).filter(Boolean))].slice(0, 15) : [];
    results.push({ company_id: id, industry, keywords });
    if (industry) stats.classified++; else stats.unknown++;
  });
});

stats.companies = results.length;
return [{ json: { results, stats } }];
