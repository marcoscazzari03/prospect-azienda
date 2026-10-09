// Rende robusto l'output dell'AI: un lotto con JSON malformato, troncato
// o in errore non deve far perdere gli altri lotti.
const raw = $json.output;
const errore = $json.error ? String($json.error.message ?? $json.error) : '';

const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const pulisci = (s) => String(s).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

let candidati = null;
let stato = 'OK';

if (errore) {
  stato = 'ERRORE';
} else if (raw && typeof raw === 'object') {
  candidati = Array.isArray(raw.candidates) ? raw.candidates : (Array.isArray(raw) ? raw : null);
} else if (typeof raw === 'string') {
  const s = pulisci(raw);
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  const dati = tryParse(s) ?? (a >= 0 && b > a ? tryParse(s.slice(a, b + 1)) : null);
  if (dati && Array.isArray(dati.candidates)) {
    candidati = dati.candidates;
  } else {
    // Recupero: i singoli oggetti validi anche se il JSON complessivo è rotto.
    const recuperati = (s.match(/\{[^{}]*\}/g) || []).map(tryParse).filter(o => o && o.company_name);
    if (recuperati.length) { candidati = recuperati; stato = 'RECUPERATO'; }
  }
}

if (!candidati) { candidati = []; if (stato === 'OK') stato = 'JSON NON VALIDO'; }

const lotto = $('Prepara lotti').item.json;

return {
  json: {
    lotto: lotto.lotto,
    paese_lotto: lotto.paese,
    stato_lotto: stato,
    errore,
    candidates: candidati.map(c => ({ ...c, country: c?.country || lotto.paese }))
  }
};
