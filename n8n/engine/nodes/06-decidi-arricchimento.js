// Decide chi passa dall'arricchimento a pagamento (RocketReach), entro il
// tetto fissato dal backend per questa ricerca (budget del piano / margine).
// Priorità: 1) serve una nominativa e non c'è  2) nessuna email  3) "mista" con
// sola generica (miglioramento facoltativo). A parità, ruolo più coerente.
const job = $('Valida richiesta').first().json;
const cap = job.limits.enrichment_cap;

const priorita = (j) => {
  const s = Number(j.email_site_score) || 0;
  if (s >= 4.5) return 0;                                           // già nominativa
  if (job.email_mode === 'personal_only') return 3;
  if (s < 4) return 2;                                              // nessuna email utile
  return job.email_mode === 'mixed' ? 1 : 0;                        // generica: ok o migliorabile
};
const pesoRuolo = { exact: 2, plausible: 1, unknown: 0 };

const ordinati = $input.all()
  .map((it, i) => ({ it, i, pr: priorita(it.json), r: pesoRuolo[it.json.role_match] ?? 0 }))
  .sort((a, b) => b.pr - a.pr || b.r - a.r || a.i - b.i);

let usati = 0;
return ordinati.map(x => {
  const serve = x.pr > 0 && usati < cap;
  if (serve) usati++;
  return {
    json: {
      ...x.it.json,
      needs_enrichment: serve,
      enrichment_skipped: x.pr > 0 && !serve ? 'tetto_raggiunto' : ''
    },
    pairedItem: { item: x.i }
  };
});
