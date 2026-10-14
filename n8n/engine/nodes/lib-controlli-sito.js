// Controlli tecnici sul sito (regole in docs/07-segnali.md), condivisi dal motore
// («Valuta segnali sito», «Controlli tecnici sito») e dal workflow «Aziende | Controllo siti».
// Inserito al posto di __CONTROLLI_SITO__ da build.py / build.mjs.
//   html: homepage; website: URL del sito; oggi: AAAA-MM-GG; richiesti: codici da controllare;
//   https: esito della richiesta HTTPS ({ https_body } o { error }), solo per no_https.
// Ogni esito: pass (presente, con la prova), fail (assente), undetermined (non dimostrabile).
function controlliSito({ html, website, oggi, richiesti, https }) {
  const testo = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&copy;|&#169;/gi, '©').replace(/\s+/g, ' ').trim();
  const leggibile = html.length > 200 && /<html|<body|<head/i.test(html);
  const contenuto = testo.length >= 200;
  const anno = Number(oggi.slice(0, 4));

  // Tabella delle versioni (da src/lib/domain/cms-releases.json, inserita dalla build).
  const RILASCI = __CMS_RELEASES__;
  const v2n = (v) => String(v).split('.').map(x => parseInt(x, 10) || 0);
  const cmp = (a, b) => { const x = v2n(a), y = v2n(b); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const limite = `${anno - 2}${oggi.slice(4)}`; // oggi meno 2 anni (AAAA-MM-GG)
  const vecchia = (cms, versione) => {
    const tab = RILASCI[cms] || [];
    const mm = versione.split('.').slice(0, 2).join('.');
    const nota = tab.find(([v]) => v === mm);
    if (nota && nota[1] <= limite) return nota[1];
    const dopo = tab.find(([v, d]) => cmp(v, versione) > 0 && d <= limite);
    return dopo ? `prima del ${dopo[1]}` : '';
  };

  const esiti = {};
  const metti = (code, status, detail = '') => {
    esiti[code] = { code, status, evidence: { detail, url: website, checked_at: oggi } };
  };

  // Tecnologie (filtro di segmentazione, sempre calcolate quando si valutano segnali).
  const tecnologie = [];
  if (/wp-content|wp-includes|name=["']generator["'][^>]*wordpress/i.test(html)) tecnologie.push('wordpress');
  if (/woocommerce/i.test(html)) tecnologie.push('woocommerce');
  if (/name=["']generator["'][^>]*joomla|\/media\/jui\/|\/components\/com_/i.test(html)) tecnologie.push('joomla');
  if (/static\.wixstatic\.com|wix\.com|_wixCIDX|X-Wix/i.test(html)) tecnologie.push('wix');
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(html)) tecnologie.push('shopify');

  if (richiesti.includes('no_mobile')) {
    if (!leggibile) metti('no_mobile', 'undetermined');
    else if (/<meta[^>]+name=["']?viewport/i.test(html)) metti('no_mobile', 'fail');
    else if (/<link[^>]+rel=["']alternate["'][^>]+media=["'][^"']*max-width/i.test(html) || /href=["']https?:\/\/m\./i.test(html)) metti('no_mobile', 'fail', 'versione mobile separata');
    else metti('no_mobile', 'pass', 'Homepage senza impostazione per dispositivi mobili');
  }

  if (richiesti.includes('outdated_cms')) {
    const versioni = [];
    for (const m of html.matchAll(/name=["']generator["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*name=["']generator["']/gi)) {
      const g = m[1] || m[2] || '';
      const wp = g.match(/WordPress\s+(\d+\.\d+(?:\.\d+)?)/i); if (wp) versioni.push(['wordpress', wp[1]]);
      const jo = g.match(/Joomla!?\s*(?:-\s*Open Source Content Management\s*)?(\d+\.\d+(?:\.\d+)?)/i); if (jo) versioni.push(['joomla', jo[1]]);
      const wc = g.match(/WooCommerce\s+(\d+\.\d+(?:\.\d+)?)/i); if (wc) versioni.push(['woocommerce', wc[1]]);
    }
    if (!versioni.some(([c]) => c === 'wordpress')) {
      // Solo i file che portano la versione di WordPress: le librerie in wp-includes hanno la
      // propria (jquery.min.js?ver=3.7.1 è jQuery 3.7.1, non WordPress 3.7.1).
      const ver = html.match(/\/wp-includes\/(?:js\/(?:wp-emoji-release|wp-embed|comment-reply)(?:\.min)?\.js|css\/(?:dist\/block-library\/style|dashicons|admin-bar)(?:\.min)?\.css)\?ver=(\d+\.\d+(?:\.\d+)?)/i);
      if (ver) versioni.push(['wordpress', ver[1]]);
    }
    const NOMI = { wordpress: 'WordPress', joomla: 'Joomla', woocommerce: 'WooCommerce' };
    const vecchie = versioni.map(([c, v]) => [c, v, vecchia(c, v)]).filter(x => x[2]);
    if (!leggibile || !versioni.length) metti('outdated_cms', 'undetermined');
    else if (vecchie.length) metti('outdated_cms', 'pass', vecchie.map(([c, v, d]) => `${NOMI[c]} ${v} (${/^\d/.test(d) ? `versione del ${d}` : d})`).join(', '));
    else metti('outdated_cms', 'fail', versioni.map(([c, v]) => `${NOMI[c]} ${v}`).join(', '));
  }

  if (richiesti.includes('single_language')) {
    const LINGUE = 'en|de|fr|es|it|pt|nl|pl|cs|ru|zh|ja';
    const altre = /hreflang=["'](?!x-default)[a-z]{2}/i.test(html)
      || new RegExp(`href=["'](?:https?://[^"'/]+)?/(?:${LINGUE})(?:[-_][a-z]{2})?/?["'/?#]`, 'i').test(html)
      || /[?&](?:lang|language|lng)=[a-z]{2}/i.test(html)
      || new RegExp(`href=["']https?://(?:${LINGUE})\\.`, 'i').test(html)
      || new RegExp(`>\\s*(?:${LINGUE.toUpperCase()})\\s*</a>`).test(html);
    const lingua = (html.match(/<html[^>]+lang=["']([a-z]{2})/i) || [])[1] || '';
    if (!leggibile || !contenuto) metti('single_language', 'undetermined');
    else if (altre) metti('single_language', 'fail');
    else metti('single_language', 'pass', `Nessuna versione in altre lingue${lingua ? ` (lingua: ${lingua})` : ''}`);
  }

  if (richiesti.includes('stale_copyright')) {
    const anni = [...testo.matchAll(/(?:©|copyright)[^0-9]{0,30}((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/gi)]
      .map(m => Number(m[2] || m[1])).filter(y => y >= 1995 && y <= anno + 1);
    if (!contenuto || !anni.length) metti('stale_copyright', 'undetermined');
    else {
      const ultimo = Math.max(...anni);
      if (anno - ultimo >= 3) metti('stale_copyright', 'pass', `Copyright fermo al ${ultimo}`);
      else metti('stale_copyright', 'fail', `Copyright ${ultimo}`);
    }
  }

  if (richiesti.includes('under_construction')) {
    const provvisoria = /in costruzione|coming soon|under construction|en construcci[oó]n|en construction|bient[oô]t en ligne|in k[uü]rze|im aufbau|sito in manutenzione|maintenance mode|torneremo presto online/i;
    if (!leggibile) metti('under_construction', 'undetermined');
    else if (provvisoria.test(testo) && testo.length < 800) metti('under_construction', 'pass', 'Homepage provvisoria');
    else metti('under_construction', 'fail');
  }

  if (richiesti.includes('no_booking_engine')) {
    const MOTORI = /simplebooking|vertical-?booking|octorate|bedzzle|ericsoft|cloudbeds|synxis|booking-?expert|passepartout|bookingsuite|hotelinone|blastness|5stelle|scrigno|wubook|bookassist|d-edge|availpro|smartbooking|roiback|mirai\.com|siteminder|thebookingbutton|littlehotelier|beds24|hotelrunner|guestcentric|travelclick|ihotelier|bookingengine/i;
    if (!leggibile) metti('no_booking_engine', 'undetermined');
    else if (MOTORI.test(html)) metti('no_booking_engine', 'fail');
    else if (!contenuto) metti('no_booking_engine', 'undetermined');
    else metti('no_booking_engine', 'pass', 'Nessun booking engine riconosciuto nella homepage');
  }

  if (richiesti.includes('no_https')) {
    // Esito della richiesta HTTPS: presente solo se eseguita.
    const h = https;
    const eseguito = h && (h.https_body !== undefined || h.error !== undefined);
    const msg = String(h?.error?.message ?? h?.error ?? '');
    if (!eseguito) metti('no_https', 'undetermined');
    else if (!h.error) metti('no_https', 'fail');
    else if (/certificate|self.signed|CERT_|ERR_TLS|SSL|unable to verify|altname|expired/i.test(msg)) metti('no_https', 'pass', 'Certificato HTTPS non valido o scaduto');
    else if (/ECONNREFUSED/i.test(msg) && /^http:\/\//i.test(website) && leggibile) metti('no_https', 'pass', 'Il sito non risponde in HTTPS');
    else metti('no_https', 'undetermined');
  }

  return { testo, esiti, tecnologie };
}
