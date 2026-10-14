// Dalle attività di OpenStreetMap alle aziende del database: dominio dal sito web, nome,
// città, settore in italiano (dalla categoria OSM) e parole chiave. Scarta enti pubblici,
// associazioni, luoghi non commerciali, siti che non sono dell'azienda (social, portali) e
// catene (lo stesso dominio su 3 o più punti: sono filiali o negozi in franchising).
// Le categorie senza traduzione restano senza settore: lo assegna poi Claude Haiku.
const richieste = $('Prepara richieste OSM').all().map(i => i.json);

// Categoria OSM -> [settore, parole chiave]. Solo attività che comprano servizi alle imprese.
const SETTORI = {
  office: {
    it: ['Informatica e software', ['informatica', 'software', 'it']],
    lawyer: ['Studio legale', ['avvocati', 'avvocato', 'legale']], accountant: ['Studio commercialista', ['commercialisti', 'commercialista', 'contabilità', 'fiscale']],
    tax_advisor: ['Consulenza fiscale', ['commercialista', 'fiscale', 'tributario']], notary: ['Studio notarile', ['notaio', 'notai', 'notarile']],
    architect: ['Studio di architettura', ['architetti', 'architetto', 'architettura', 'progettazione']], engineer: ['Studio di ingegneria', ['ingegneri', 'ingegneria', 'progettazione']],
    surveyor: ['Studio tecnico', ['geometri', 'geometra', 'tecnico']], consulting: ['Consulenza aziendale', ['consulenza', 'consulenti']],
    insurance: ['Assicurazioni', ['assicurazioni', 'assicurativo', 'broker']], financial: ['Servizi finanziari', ['finanza', 'finanziario']],
    financial_advisor: ['Consulenza finanziaria', ['finanza', 'consulenza finanziaria']], estate_agent: ['Agenzia immobiliare', ['immobiliare', 'immobiliari', 'real estate']],
    travel_agent: ['Agenzia di viaggi', ['viaggi', 'turismo']], advertising_agency: ['Agenzia di pubblicità', ['pubblicità', 'marketing', 'comunicazione']],
    marketing: ['Marketing e comunicazione', ['marketing', 'comunicazione']], graphic_design: ['Grafica e design', ['grafica', 'design']],
    logistics: ['Trasporti e logistica', ['logistica', 'trasporti', 'spedizioni']], moving_company: ['Traslochi', ['traslochi', 'trasporti']],
    construction_company: ['Impresa edile', ['edilizia', 'edile', 'costruzioni']], energy_supplier: ['Energia', ['energia']],
    telecommunication: ['Telecomunicazioni', ['telecomunicazioni']], publisher: ['Editoria', ['editoria', 'editore']],
    coworking: ['Coworking', ['coworking', 'uffici']], property_management: ['Amministrazione condomini', ['amministratore di condominio', 'condomini']],
    employment_agency: ['Agenzia per il lavoro', ['selezione del personale', 'risorse umane']], research: ['Ricerca e sviluppo', ['ricerca']],
    security: ['Sicurezza e vigilanza', ['vigilanza', 'sicurezza']], design: ['Design', ['design']], translator: ['Traduzioni', ['traduzioni', 'traduttori']]
  },
  craft: {
    carpenter: ['Falegnameria', ['falegnameria', 'legno', 'artigiano']], electrician: ['Impianti elettrici', ['elettricista', 'impianti elettrici', 'artigiano']],
    plumber: ['Idraulica', ['idraulico', 'impianti idraulici', 'artigiano']], hvac: ['Impianti termici e climatizzazione', ['climatizzazione', 'riscaldamento', 'impianti']],
    metal_construction: ['Carpenteria metallica', ['metalmeccanica', 'carpenteria', 'metallo']], builder: ['Impresa edile', ['edilizia', 'edile', 'costruzioni']],
    painter: ['Imbiancatura', ['imbianchino', 'edilizia']], roofer: ['Coperture e tetti', ['tetti', 'edilizia']], tiler: ['Pavimenti e rivestimenti', ['piastrelle', 'edilizia']],
    gardener: ['Giardinaggio', ['giardinaggio', 'verde']], photographer: ['Fotografia', ['fotografo', 'fotografia']], printer: ['Tipografia', ['tipografia', 'stampa']],
    winery: ['Cantina vinicola', ['vino', 'cantina', 'agroalimentare']], brewery: ['Birrificio', ['birra', 'birrificio', 'agroalimentare']],
    confectionery: ['Pasticceria', ['pasticceria', 'dolci', 'alimentare']], bakery: ['Panificio', ['panificio', 'alimentare']], caterer: ['Catering', ['catering', 'ristorazione']],
    upholsterer: ['Tappezzeria', ['tappezzeria', 'arredamento']], jeweller: ['Gioielleria artigiana', ['gioielli', 'oreficeria']], tailor: ['Sartoria', ['sartoria', 'abbigliamento']],
    shoemaker: ['Calzaturificio', ['calzature', 'scarpe']], window_construction: ['Serramenti', ['serramenti', 'infissi']], stonemason: ['Lavorazione pietra e marmo', ['marmo', 'pietra']],
    glaziery: ['Vetreria', ['vetro', 'vetreria']], key_cutter: ['Ferramenta e chiavi', ['chiavi']], blacksmith: ['Fabbro', ['fabbro', 'metallo']], electronics_repair: ['Riparazioni elettroniche', ['elettronica']]
  },
  shop: {
    car: ['Concessionaria auto', ['automobili', 'auto', 'concessionaria']], car_repair: ['Officina auto', ['officina', 'autoriparazioni', 'auto']], car_parts: ['Ricambi auto', ['ricambi', 'auto']],
    motorcycle: ['Concessionaria moto', ['moto', 'motocicli']], bicycle: ['Negozio di biciclette', ['biciclette', 'bici']], furniture: ['Arredamento', ['mobili', 'arredamento']],
    kitchen: ['Cucine', ['cucine', 'arredamento']], clothes: ['Abbigliamento', ['abbigliamento', 'moda']], shoes: ['Calzature', ['calzature', 'scarpe']], boutique: ['Abbigliamento', ['moda', 'abbigliamento']],
    jewelry: ['Gioielleria', ['gioielli', 'gioielleria']], optician: ['Ottica', ['ottica', 'occhiali']], hairdresser: ['Parrucchiere', ['parrucchiere', 'acconciature', 'bellezza']],
    beauty: ['Centro estetico', ['estetista', 'bellezza']], florist: ['Fioraio', ['fiori', 'fiorista']], bakery: ['Panificio', ['panificio', 'alimentare']], butcher: ['Macelleria', ['macelleria', 'alimentare']],
    wine: ['Enoteca', ['vino', 'enoteca']], deli: ['Gastronomia', ['gastronomia', 'alimentare']], pastry: ['Pasticceria', ['pasticceria', 'dolci']], hardware: ['Ferramenta', ['ferramenta']],
    doityourself: ['Bricolage', ['bricolage', 'ferramenta']], electronics: ['Elettronica', ['elettronica']], computer: ['Informatica', ['informatica', 'computer']],
    mobile_phone: ['Telefonia', ['telefonia', 'cellulari']], books: ['Libreria', ['libri', 'libreria']], stationery: ['Cartoleria', ['cartoleria']], toys: ['Giocattoli', ['giocattoli']],
    sports: ['Articoli sportivi', ['sport']], pet: ['Articoli per animali', ['animali']], garden_centre: ['Vivaio e giardinaggio', ['vivaio', 'giardinaggio']], travel_agency: ['Agenzia di viaggi', ['viaggi', 'turismo']],
    copyshop: ['Copisteria', ['stampa', 'copisteria']], photo: ['Fotografia', ['fotografia']], interior_decoration: ['Arredamento e decorazione', ['arredamento', 'interior design']],
    tiles: ['Pavimenti e rivestimenti', ['piastrelle', 'pavimenti']], bathroom_furnishing: ['Arredo bagno', ['arredo bagno', 'arredamento']], lighting: ['Illuminazione', ['illuminazione']],
    tyres: ['Gommista', ['pneumatici', 'gommista', 'auto']], cosmetics: ['Cosmetica', ['cosmetici', 'bellezza']], gift: ['Articoli da regalo', ['regali']], wholesale: ['Commercio all\'ingrosso', ['ingrosso', 'distribuzione']],
    trade: ['Commercio all\'ingrosso', ['ingrosso', 'distribuzione', 'materiali']], agrarian: ['Prodotti per l\'agricoltura', ['agricoltura']], farm: ['Azienda agricola', ['agricoltura', 'agroalimentare']]
  },
  amenity: {
    restaurant: ['Ristorante', ['ristorante', 'ristorazione']], cafe: ['Bar e caffetteria', ['bar', 'caffetteria', 'ristorazione']], bar: ['Bar', ['bar', 'ristorazione']],
    pub: ['Pub', ['pub', 'ristorazione']], fast_food: ['Ristorazione veloce', ['ristorazione', 'fast food']], ice_cream: ['Gelateria', ['gelateria', 'gelato']],
    dentist: ['Studio dentistico', ['dentista', 'dentisti', 'odontoiatria']], doctors: ['Studio medico', ['medico', 'medici', 'sanità']], clinic: ['Poliambulatorio', ['clinica', 'poliambulatorio', 'sanità']],
    veterinary: ['Clinica veterinaria', ['veterinario', 'veterinari']], pharmacy: ['Farmacia', ['farmacia', 'farmacie']], driving_school: ['Autoscuola', ['autoscuola', 'patente']],
    language_school: ['Scuola di lingue', ['lingue', 'formazione']], music_school: ['Scuola di musica', ['musica', 'formazione']], car_rental: ['Noleggio auto', ['noleggio', 'auto']],
    car_wash: ['Autolavaggio', ['autolavaggio', 'auto']], nightclub: ['Discoteca', ['discoteca', 'intrattenimento']], cinema: ['Cinema', ['cinema']], theatre: ['Teatro', ['teatro', 'spettacolo']],
    events_venue: ['Location per eventi', ['eventi', 'location']], coworking_space: ['Coworking', ['coworking']], childcare: ['Asilo nido', ['asilo', 'infanzia']],
    kindergarten: ['Scuola dell\'infanzia', ['asilo', 'infanzia']], prep_school: ['Doposcuola e ripetizioni', ['formazione', 'ripetizioni']], bank: ['Banca', ['banca', 'credito']]
  },
  tourism: {
    hotel: ['Hotel', ['hotel', 'albergo', 'alberghi', 'turismo', 'ricettivo']], guest_house: ['Bed and breakfast', ['b&b', 'bed and breakfast', 'turismo', 'ricettivo']],
    apartment: ['Case vacanza', ['case vacanza', 'turismo', 'ricettivo']], motel: ['Motel', ['motel', 'turismo', 'ricettivo']], hostel: ['Ostello', ['ostello', 'turismo']],
    camp_site: ['Campeggio', ['campeggio', 'turismo', 'ricettivo']], chalet: ['Case vacanza', ['turismo', 'ricettivo']], agriturismo: ['Agriturismo', ['agriturismo', 'turismo', 'ricettivo']],
    wine_cellar: ['Cantina vinicola', ['vino', 'cantina']]
  },
  healthcare: {
    dentist: ['Studio dentistico', ['dentista', 'odontoiatria']], doctor: ['Studio medico', ['medico', 'sanità']], clinic: ['Poliambulatorio', ['clinica', 'sanità']],
    physiotherapist: ['Fisioterapia', ['fisioterapia', 'fisioterapista', 'sanità']], psychotherapist: ['Psicoterapia', ['psicologo', 'psicoterapia']],
    laboratory: ['Laboratorio di analisi', ['analisi', 'laboratorio', 'sanità']], optometrist: ['Ottica', ['ottica']], podiatrist: ['Podologia', ['podologo', 'sanità']],
    speech_therapist: ['Logopedia', ['logopedia', 'sanità']], alternative: ['Medicina alternativa', ['benessere']], audiologist: ['Centro acustico', ['apparecchi acustici']]
  },
  industrial: {
    factory: ['Produzione industriale', ['manifattura', 'manifatturiero', 'industria', 'produzione']], mechanical_engineering: ['Meccanica', ['meccanica', 'metalmeccanica', 'manifattura']],
    food_industry: ['Industria alimentare', ['alimentare', 'agroalimentare', 'industria']], machine_shop: ['Officina meccanica', ['meccanica', 'metalmeccanica']],
    warehouse: ['Logistica e magazzini', ['logistica', 'magazzino']], logistics: ['Trasporti e logistica', ['logistica', 'trasporti']], printing: ['Stampa industriale', ['stampa', 'tipografia']],
    chemical: ['Industria chimica', ['chimica', 'industria']], plastic: ['Materie plastiche', ['plastica', 'industria']], textile: ['Tessile', ['tessile', 'moda']],
    wood: ['Lavorazione legno', ['legno', 'industria']], brickyard: ['Laterizi', ['edilizia', 'materiali']], concrete_plant: ['Calcestruzzo', ['edilizia', 'materiali']]
  }
};
// Categorie scartate: enti pubblici, associazioni, culto, politica, luoghi non commerciali.
const SCARTA = /^(government|association|religion|political_party|ngo|union|diplomatic|educational_institution|charity|foundation|parish|quango|administrative|vacant|disused|yes|no)$/;
const SOLO_ELENCO = new Set(['amenity', 'tourism', 'healthcare', 'industrial']); // per questi solo le categorie note
const NON_AZIENDALI = /(^|\.)(facebook|instagram|twitter|x|youtube|tiktok|linkedin|wikipedia|tripadvisor|booking|airbnb|google|goo|linktr|paginegialle|paginebianche|virgilio|subito|amazon|ebay|etsy|business\.site|wixsite|blogspot|wordpress|altervista|jimdo|weebly|webnode|github)\.[a-z.]+$|\.(gov|edu)\.it$|(^|\.)(comune|regione|provincia|asl|ausl|usl|unibo|unimore|unipr|unife)\.|(^|\.)gov\.it$/;

const dominio = (url) => String(url || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\d?\./, '').split(/[/?#:\s]/)[0];
const pulisci = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const trovate = [];
const stats = { provinces: richieste.map(r => r.provincia), elements: 0, no_name: 0, excluded_category: 0, not_company_site: 0, foreign: 0, chains: 0, duplicates: 0, saved: 0, unmapped: 0, errors: 0, failed_provinces: [] };
const TIPI = ['office', 'craft', 'industrial', 'healthcare', 'tourism', 'shop', 'amenity'];
// Sigla della provincia scritta nell'indirizzo (addr:province = «BO»): se c'è, vale quella.
const PROVINCE = Object.fromEntries((__PROVINCE__).map(([sigla, nome, regione]) => [sigla, [nome, regione]]));
$input.all().forEach((item, i) => {
  const { regione, provincia } = richieste[item.pairedItem?.item ?? i] || {};
  const elementi = item.json?.elements;
  if (!Array.isArray(elementi)) { stats.errors++; stats.failed_provinces.push(provincia); return; }
  for (const el of elementi) {
    stats.elements++;
    const t = el.tags || {};
    // Tipo di attività: il primo tra quelli noti (un ufficio dentro un negozio è un ufficio).
    const tipo = TIPI.find(k => t[k]) || '';
    const valore = String(t[tipo] || '').toLowerCase();
    if (SCARTA.test(valore) || (SOLO_ELENCO.has(tipo) && !SETTORI[tipo]?.[valore])) { stats.excluded_category++; continue; }
    const nome = pulisci(t.name || t['name:it'] || t.operator, 200);
    if (!nome) { stats.no_name++; continue; }
    const sito = String(t.website || t['contact:website'] || '').split(/[;\s]/)[0];
    const dom = dominio(sito);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/.test(dom) || NON_AZIENDALI.test(dom)) { stats.not_company_site++; continue; }
    // Niente attività estere (paese o dominio straniero).
    if ((t['addr:country'] && t['addr:country'].toUpperCase() !== 'IT') || /\.(ch|fr|at|si|de|hr|sm|va|mt|li|mc)$/.test(dom)) { stats.foreign++; continue; }
    const mappa = SETTORI[tipo]?.[valore];
    if (!mappa) stats.unmapped++;
    trovate.push({
      domain: dom, name: nome, website: /^https?:\/\//i.test(sito) ? sito.slice(0, 300) : `https://${dom}`,
      ...(() => {
        const dichiarata = PROVINCE[String(t['addr:province'] || '').trim().toUpperCase()];
        return { city: pulisci(t['addr:city'], 80), province: dichiarata ? dichiarata[0] : provincia, region: dichiarata ? dichiarata[1] : regione };
      })(),
      industry: mappa ? mappa[0] : '', keywords: mappa ? mappa[1] : [], brand: Boolean(t.brand || t['brand:wikidata'])
    });
  }
});

// Catene: stesso dominio su 3 o più punti (o marchio noto su 2 o più).
const conta = {};
for (const a of trovate) conta[a.domain] = (conta[a.domain] || 0) + 1;
const viste = new Set();
const companies = [];
for (const a of trovate) {
  if (conta[a.domain] >= 3 || (a.brand && conta[a.domain] >= 2)) { stats.chains++; continue; }
  if (viste.has(a.domain)) { stats.duplicates++; continue; }
  viste.add(a.domain);
  const { brand, ...azienda } = a;
  companies.push(azienda);
}
stats.saved = companies.length;

// Blocchi da 2.000 aziende per il salvataggio.
const blocchi = [];
for (let k = 0; k < companies.length; k += 2000) blocchi.push(companies.slice(k, k + 2000));
if (!blocchi.length) blocchi.push([]);
return blocchi.map((b, k) => ({ json: { source: 'osm', companies: b, ...(k === 0 ? { stats } : {}) } }));
