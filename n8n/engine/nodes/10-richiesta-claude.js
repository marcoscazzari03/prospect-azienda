// Richiesta all'API di Claude per un lotto: il prompt del lotto + lo strumento
// di ricerca web lato server (web_search). Modello, impegno e limiti arrivano da
// "Valida richiesta" (job.ai): si cambiano in un punto solo.
const job = $('Valida richiesta').first().json;
const ai = job.ai;

return {
  json: {
    ...$json,
    _claude: {
      model: ai.model,
      max_tokens: 16000,
      output_config: { effort: ai.effort },
      // Cache dei prompt: tra una ricerca web e l'altra Claude rilegge tutto il contesto;
      // con la cache le parti già lette costano il 10% (le ricerche web aggiungono da sole
      // un punto di cache dopo ogni risultato).
      cache_control: { type: 'ephemeral' },
      system: 'Sei un ricercatore di prospect B2B. Usi la ricerca web, citi sempre la fonte e non inventi mai dati. Rispondi solo con JSON valido.',
      messages: [{ role: 'user', content: $json.prompt }],
      // Versione base della ricerca web: i risultati arrivano direttamente al modello.
      // La versione con filtro dinamico (_20260209) spendeva le ricerche in passaggi
      // di codice e restituiva pochi candidati (test del 13/10).
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: ai.max_searches }]
    }
  }
};
