// Richiesta all'API di Claude per un lotto: il prompt del lotto + lo strumento
// di ricerca web lato server (web_search) e di lettura delle pagine (web_fetch,
// solo URL già emersi nella ricerca). Modello, impegno e limiti arrivano da "Valida richiesta" (job.ai): si cambiano in un punto solo.
const job = $('Valida richiesta').first().json;
const ai = job.ai;

return {
  json: {
    ...$json,
    _claude: {
      model: ai.model,
      max_tokens: 16000,
      output_config: { effort: ai.effort },
      system: 'Sei un ricercatore di prospect B2B. Usi la ricerca web, citi sempre la fonte e non inventi mai dati. Rispondi solo con JSON valido.',
      messages: [{ role: 'user', content: $json.prompt }],
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: ai.max_searches },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: ai.max_fetches }
      ]
    }
  }
};
