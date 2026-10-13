// Legge la risposta di Claude (__FASE__) e la porta nel formato del motore:
// { output: testo, error }. Se Claude si ferma a metà della ricerca web
// (stop_reason "pause_turn"), prepara la richiesta per riprendere dal punto
// in cui era: una sola ripresa, poi si usa quello che c'è.
const FASE = '__FASE__';
const r = $json;
const richiesta = FASE === 'PRIMA'
  ? $('Prepara richiesta Claude').item.json._claude
  : $('Esito ricerca Claude').item.json._claude_seguito;
const precedente = FASE === 'PRIMA' ? '' : String($('Esito ricerca Claude').item.json._testo_parziale ?? '');

const blocchi = Array.isArray(r.content) ? r.content : [];
const testo = precedente + blocchi.filter(b => b?.type === 'text').map(b => b.text).join('');
const errore = r.type === 'error' || r.error
  ? String(r.error?.message ?? r.error?.type ?? r.error ?? 'errore API')
  : (r.stop_reason === 'refusal' ? 'richiesta rifiutata dal modello' : '');

const usage = r.usage || {};
const out = {
  output: testo,
  stop_reason: String(r.stop_reason ?? ''),
  usage: {
    input_tokens: Number(usage.input_tokens) || 0,
    output_tokens: Number(usage.output_tokens) || 0,
    web_search_requests: Number(usage.server_tool_use?.web_search_requests) || 0
  }
};
if (errore) out.error = { message: errore };

if (FASE === 'PRIMA' && r.stop_reason === 'pause_turn' && !errore) {
  out._continua = true;
  out._testo_parziale = testo;
  out._claude_seguito = { ...richiesta, messages: [...richiesta.messages, { role: 'assistant', content: blocchi }] };
} else {
  out._continua = false;
}
return { json: out };
