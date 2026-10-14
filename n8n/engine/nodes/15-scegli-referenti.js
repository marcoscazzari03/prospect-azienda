// Tetto alle ricerche del referente: si cerca il referente solo per le aziende
// che servono (lead richiesti più un margine). Le altre aziende con il segnale
// restano in «riserva»: il backend le ripropone al giro successivo senza
// rifare la ricerca AI.
const job = $('Valida richiesta').first().json;
const items = $input.all();
const max = Number(job.limits.referenti_max) || Infinity;

// Prima la riserva (già pagata), poi chi ha più segnali verificati.
const ordine = items.map((it, i) => ({ it, i }))
  .filter(x => x.it.json._serve_referente === true)
  .sort((a, b) => (b.it.json._riserva === true) - (a.it.json._riserva === true)
    || (b.it.json.signals || []).filter(s => s.status === 'pass').length - (a.it.json.signals || []).filter(s => s.status === 'pass').length
    || a.i - b.i);
const scelti = new Set(ordine.slice(0, max).map(x => x.i));

return items.map((it, i) => {
  const p = it.json;
  if (p._serve_referente !== true || scelti.has(i)) return { json: p, pairedItem: { item: i } };
  const { _testo_home, _pagina_referente, ...resto } = p;
  return { json: { ...resto, _serve_referente: false, _scarto_segnale: 'riserva' }, pairedItem: { item: i } };
});
