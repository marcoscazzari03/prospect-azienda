// Email aziendale trovata nella homepage (punto 3 del 20/10), per il workflow «Aziende | Controllo siti».
// Stesse regole del motore («Estrai email», 05-estrai-email.template.js) ridotte a «Solo azienda»:
// solo caselle d'ufficio (info@, commerciale@, segreteria.rossi@, nomeazienda@) del dominio dell'azienda
// o di un suo dominio «fratello»; mai privacy/dpo, PEC, caselle gratuite o indirizzi indovinati.
// Inserito al posto di __EMAIL_AZIENDA__ da build.mjs.
function emailAziendale(htmlGrezzo, website) {
  const cleanHost = (raw) => /[\\@]/.test(String(raw ?? '')) ? '' : String(raw ?? '').trim().toLowerCase()
    .replace(/^https?:\/\//i, '').replace(/^\/\//, '')
    .split('/')[0].split('?')[0].split('#')[0]
    .replace(/^www\./, '').replace(/:\d+$/, '');
  const dominio = cleanHost(website);
  if (!dominio) return '';
  const decodeCfEmail = (enc) => {
    try {
      if (!enc || enc.length < 4) return '';
      const key = parseInt(enc.slice(0, 2), 16);
      let e = '';
      for (let i = 2; i < enc.length; i += 2) e += String.fromCharCode(parseInt(enc.slice(i, i + 2), 16) ^ key);
      return e;
    } catch { return ''; }
  };
  const html = String(htmlGrezzo ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&commat;/gi, '@').replace(/&period;/gi, '.')
    .replace(/%40/gi, '@')
    // Espressioni lineari (22/10): con lunghe sequenze di spazi o di caratteri base64 le versioni senza (?<!…) impiegavano
    // minuti e bloccavano «Valuta siti» (Task runner unresponsive, 4 giri falliti la notte del 22/10).
    .replace(/(?<!\s)\s*\[\s*(?:at|chiocciola|arroba)\s*\]\s*/gi, '@')
    .replace(/(?<!\s)\s*\(\s*(?:at|chiocciola|arroba)\s*\)\s*/gi, '@')
    .replace(/(?<!\s)\s*\[\s*(?:dot|punto)\s*\]\s*/gi, '.');
  const tutte = [];
  let m;
  const cf = /data-cfemail=["']([0-9a-f]+)["']/gi;
  while ((m = cf.exec(html)) !== null) tutte.push(decodeCfEmail(m[1]));
  const mailto = /mailto:([^"'?#\s<>]+)/gi;
  while ((m = mailto.exec(html)) !== null) { let v = m[1]; try { v = decodeURIComponent(v); } catch {} tutte.push(v); }
  tutte.push(...(html.match(/(?<![A-Z0-9._%+-])[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,}/gi) || []));

  const SCARTA_LOCALI = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|abuse|example|test|user|email|e-mail|name|nome|your|youremail|yourname|you|tuonome|sentry|wordpress|webmaster|hostmaster|jobs?|careers?|lavora(con)?noi|recruit(ment|ing)?|cv|hr|unsubscribe|bounce)$/;
  const PEC = /(^|\.)(pec\.[a-z.]+|legalmail\.it|arubapec\.it|postacert\.[a-z.]+|pecimprese\.it|cert\.[a-z.]+)$/;
  const GRATUITE = /(^|\.)(gmail\.com|googlemail\.com|icloud\.com|me\.com|aol\.com|protonmail\.(com|ch)|proton\.me|mail\.com|(hotmail|outlook|live|yahoo|gmx|msn)\.[a-z.]+|libero\.it|virgilio\.it|tiscali\.it|alice\.it|tin\.it|fastwebnet\.it)$/;
  const GENERICHE = new Set([
    'info', 'infos', 'hello', 'ciao', 'contact', 'contacts', 'contatti', 'office', 'ufficio', 'mail', 'posta', 'admin',
    'amministrazione', 'administration', 'segreteria', 'reception', 'enquiries', 'inquiries', 'general', 'sales', 'vendite',
    'commerciale', 'business', 'marketing', 'ordini', 'orders', 'order', 'support', 'assistenza', 'service', 'servizioclienti',
    'customerservice', 'team', 'studio', 'company', 'azienda', 'direzione', 'management', 'export', 'import', 'shop', 'store',
    'booking', 'prenotazioni', 'web', 'reservations', 'reservation', 'prenota', 'prenotazione', 'ricevimento', 'accoglienza',
    'frontdesk', 'welcome', 'hotel', 'albergo', 'residence', 'camping', 'agriturismo'
  ]);
  const PREFISSI = ['segreteria', 'studio', 'ufficio', 'amministrazione', 'reception', 'info', 'contatti', 'office', 'direzione',
    'albergo', 'hotel', 'booking', 'prenota', 'reserv', 'ricevimento', 'accoglienza'];
  const privacy = (l) => /privacy|gdpr|dataprotection|datiperson/.test(l.replace(/[^a-z]/g, '')) || l.split(/[._-]+/).some(t => /^(dpo|legal|compliance)$/.test(t));
  const etichetta = (d) => {
    const p = String(d ?? '').toLowerCase().replace(/^www\./, '').split('.');
    const x = p.length >= 3 && p[p.length - 2].length <= 3 ? p[p.length - 3] : p[Math.max(p.length - 2, 0)];
    return String(x ?? '').replace(/[^a-z0-9]/g, '');
  };
  const nomeSito = etichetta(dominio);
  const fratello = (dom) => {
    const a = nomeSito, b = etichetta(dom);
    if (!a || !b || GRATUITE.test(dom)) return false;
    if (a === b) return a.length >= 4;
    const [corto, lungo] = a.length < b.length ? [a, b] : [b, a];
    return corto.length >= 6 && lungo.includes(corto);
  };
  const diUfficio = (l) => l.split(/[._-]+/).some(t => GENERICHE.has(t.replace(/[0-9]+$/, '')))
    || PREFISSI.some(x => l.startsWith(x))
    || (nomeSito.length >= 4 && l.replace(/[^a-z0-9]/g, '') === nomeSito);

  const buone = [];
  const viste = new Set();
  for (const raw of tutte) {
    const email = String(raw).toLowerCase().trim().replace(/^[^a-z0-9]+/, '').replace(/[),.;:'"]+$/g, '');
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) || viste.has(email)) continue;
    viste.add(email);
    const [local, dom] = email.split('@');
    if (SCARTA_LOCALI.test(local) || PEC.test(dom) || GRATUITE.test(dom) || dom.startsWith('www.') || privacy(local)) continue;
    if (/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(email)) continue;
    const delDominio = dom === dominio || dom.endsWith('.' + dominio) || fratello(dom);
    if (!delDominio || !diUfficio(local)) continue;
    // Prima il dominio esatto, poi info@ e simili.
    buone.push({ email, voto: (dom === dominio ? 2 : 0) + (/^(info|contatti|contact|commerciale|sales)$/.test(local) ? 1 : 0) });
  }
  buone.sort((a, b) => b.voto - a.voto);
  return buone[0]?.email ?? '';
}
