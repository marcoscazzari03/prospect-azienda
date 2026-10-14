// Domini probabili per le aziende degli annunci senza sito (livello 2, gratuito).
// Dal nome, nell'ordine: parole distintive unite («Gruppo Maggioli» -> maggioli), le prime
// due («Max Mara Fashion» -> maxmara), tutte le parole, col trattino; .it e .com.
// Al massimo 6 tentativi per azienda.
const risposta = $input.first()?.json || {};
const aziende = Array.isArray(risposta.companies) ? risposta.companies : [];

const norm = (v) => String(v ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim();
const FORME = new Set(['srl', 'srls', 'spa', 'sas', 'snc', 'sapa', 'scarl', 'scrl', 'soc', 'coop', 'societa', 'cooperativa',
  'unipersonale', 's', 'r', 'l', 'p', 'a', 'c', 'e', 'di', 'del', 'della', 'the', 'and', 'ltd', 'inc', 'gmbh', 'ag', 'sa', 'bv']);
const GENERICHE = new Set(['group', 'gruppo', 'italia', 'italy', 'italiana', 'holding', 'international', 'filiale', 'sede']);
// «Italia» spesso non compare sul sito («Joinrs Italia» -> joinrs); «Group» sì («Var Group»).
const PAESE = new Set(['italia', 'italy', 'italiana']);

const out = [];
for (const a of aziende) {
  // Nome che è già un dominio («Facile.it», «www.giancarlobetta.com»): si prova quello.
  const giaDominio = String(a.company_name || '').toLowerCase().match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.(?:it|com|eu|net|org))\/?$/);
  if (giaDominio) {
    const d = giaDominio[1];
    const base = d.split('.')[0].replace(/-/g, ' ');
    out.push({ json: { company_key: a.company_key, company_name: a.company_name, city: a.city || '', nucleo: base, nome: base, domain: d, ordine: 0, url: `https://${d}`, dominio_nel_nome: true } });
    continue;
  }
  const parole = norm(a.company_name).split(' ').filter(w => w && !FORME.has(w));
  const nucleo = parole.filter(w => !GENERICHE.has(w));
  // Nomi troppo corti o ambigui («ENG», «B&M»): li lasciamo alla ricerca web. «Var Group»
  // va bene: la pagina dovrà contenere il nome intero.
  if (!nucleo.length || parole.join('').length < 4) continue;
  const slug = [
    nucleo.join(''),
    nucleo.length > 2 ? nucleo.slice(0, 2).join('') : '',
    parole.join(''),
    nucleo.length > 1 ? nucleo.join('-') : '',
    nucleo.length > 1 && nucleo[0].length >= 5 ? nucleo[0] : ''
  ].filter((s, i, all) => s.length >= 3 && s.length <= 40 && all.indexOf(s) === i);
  const domini = slug.flatMap(s => [`${s}.it`, `${s}.com`]).slice(0, 6);
  domini.forEach((d, ordine) => out.push({ json: {
    company_key: a.company_key, company_name: a.company_name, city: a.city || '',
    nucleo: nucleo.join(' '), nome: parole.filter(w => !PAESE.has(w)).join(' '), domain: d, ordine, url: `https://${d}`
  } }));
}
return out;
