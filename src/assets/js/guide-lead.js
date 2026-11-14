/* Offre du guide gratuit. Section dans la page, et une carte affichée une seule fois. */
(function () {
  if (window.__cdfGuideInit) return;
  window.__cdfGuideInit = true;

  var CARD_KEY = 'cdf_guide_card';
  var DONE_KEY = 'cdf_guide_done';
  var ENDPOINT = 'https://leads.devis-expert.ca/cdf/api/lead';
  var startedAt = Date.now();
  var cardOpened = false;

  var COPY = {
    acheteur: {
      title: 'Recevez le guide Acheter en Estrie',
      text: "L'équipe Chiasson De Francesco vous l'envoie par courriel. Le guide couvre la recherche, les visites, l'inspection et l'offre pour un achat à Sherbrooke et en Estrie. Sans engagement.",
      card: 'Le guide gratuit Acheter en Estrie, envoyé par courriel.'
    },
    vendeur: {
      title: 'Recevez le guide Vendre en Estrie',
      text: "L'équipe Chiasson De Francesco vous l'envoie par courriel. Le guide couvre le prix, les documents et la mise en marché pour une vente en Estrie. Sans engagement.",
      card: 'Le guide gratuit Vendre en Estrie, envoyé par courriel.'
    },
    choix: {
      title: 'Quel guide souhaitez-vous recevoir?',
      text: 'Dites-nous si vous souhaitez acheter ou vendre. Nous vous envoyons par courriel le guide qui correspond : Acheter en Estrie ou Vendre en Estrie.',
      card: 'Dites-nous si vous souhaitez acheter ou vendre. Le guide correspondant vous est envoyé par courriel.'
    }
  };

  var HOW_FOUND = [
    ['', 'Je préfère ne pas répondre'],
    ['google', 'Google (recherche)'],
    ['gbp', 'Fiche Google (Google Business Profile)'],
    ['ai', 'Une IA (ChatGPT, Gemini, Perplexity…)'],
    ['social', 'Facebook / Instagram'],
    ['recommandation', 'Recommandation'],
    ['autre', 'Autre']
  ];

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function shouldSkip() {
    var path = String(location.pathname || '').toLowerCase();
    if (/merci\.html$/.test(path) || /\/merci\/?$/.test(path)) return true;
    if (path.indexOf('demo-webinaire') !== -1) return true;
    if (document.querySelector('meta[http-equiv="refresh" i], meta[http-equiv="refresh"]')) return true;
    return false;
  }

  function pageIntent() {
    if (!window.CDFGuideIntent || typeof window.CDFGuideIntent.pageIntent !== 'function') return '';
    return window.CDFGuideIntent.pageIntent(location.pathname) || '';
  }

  function previewOpen() {
    try {
      return new URLSearchParams(location.search).get('cdf-guide') === 'open';
    } catch (err) {
      return false;
    }
  }

  function readParams() {
    var params;
    try {
      params = new URLSearchParams(location.search);
    } catch (err) {
      params = new URLSearchParams();
    }
    function pick(name) {
      return params.get(name) || '';
    }
    return {
      utm_source: pick('utm_source'),
      utm_medium: pick('utm_medium'),
      utm_campaign: pick('utm_campaign'),
      utm_content: pick('utm_content'),
      utm_term: pick('utm_term'),
      gclid: pick('gclid'),
      fbclid: pick('fbclid'),
      referrer: document.referrer || ''
    };
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function endpoint() {
    return window.CDF_LEAD_ENDPOINT || ENDPOINT;
  }

  function copyFor(intent) {
    if (intent === 'acheteur' || intent === 'vendeur') return COPY[intent];
    return COPY.choix;
  }

  function howFoundOptions(selected) {
    return HOW_FOUND.map(function (pair) {
      var sel = pair[0] === selected ? ' selected' : '';
      return '<option value="' + escapeHtml(pair[0]) + '"' + sel + '>' + escapeHtml(pair[1]) + '</option>';
    }).join('');
  }

  function hiddenFields(captured) {
    var names = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'referrer'];
    return names.map(function (name) {
      return '<input type="hidden" name="' + name + '" value="' + escapeHtml(captured[name]) + '">';
    }).join('');
  }

  function formHtml(prefix, intent, captured) {
    var choice = '';
    if (intent === 'acheteur' || intent === 'vendeur') {
      var title = intent === 'acheteur' ? 'Acheter en Estrie' : 'Vendre en Estrie';
      choice =
        '<input type="hidden" name="guide" value="' + intent + '">' +
        '<p class="cdf-guide-known">Guide : ' + title + '</p>';
    } else {
      choice =
        '<fieldset class="cdf-guide-choice">' +
        '<legend>Votre projet</legend>' +
        '<label><input type="radio" name="guide" value="acheteur" required><span><strong>Acheter</strong><small>Guide Acheter en Estrie</small></span></label>' +
        '<label><input type="radio" name="guide" value="vendeur" required><span><strong>Vendre</strong><small>Guide Vendre en Estrie</small></span></label>' +
        '</fieldset>';
    }

    return (
      '<form class="cdf-guide-form" data-cdf-guide-form="' + prefix + '" novalidate>' +
      '<div class="cdf-guide-hp" aria-hidden="true">' +
      '<label>Site web<input type="text" name="website" tabindex="-1" autocomplete="off"></label>' +
      '</div>' +
      hiddenFields(captured) +
      choice +
      '<p class="cdf-guide-required">Les champs marqués d’une étoile sont obligatoires.</p>' +
      '<div class="cdf-guide-grid">' +
      field(prefix, 'firstName', 'Prénom', 'text', 'given-name', true) +
      field(prefix, 'lastName', 'Nom', 'text', 'family-name', true) +
      field(prefix, 'email', 'Courriel', 'email', 'email', true) +
      field(prefix, 'phone', 'Téléphone', 'tel', 'tel', false) +
      '<label class="cdf-guide-field" for="' + prefix + '-howFound">' +
      '<span>Comment nous avez-vous trouvés? <span class="cdf-guide-opt">(optionnel)</span></span>' +
      '<select id="' + prefix + '-howFound" name="howFound">' + howFoundOptions('') + '</select>' +
      '</label>' +
      '</div>' +
      '<div class="cdf-guide-check">' +
      '<input id="' + prefix + '-consent" type="checkbox" name="consent" value="1" required>' +
      '<label for="' + prefix + '-consent">J’accepte que l’Équipe Chiasson De Francesco utilise mon prénom, mon nom, mon courriel et, si je le fournis, mon téléphone pour m’envoyer le guide demandé et pour me recontacter au sujet de mon projet immobilier. Ces renseignements sont inscrits dans notre outil de suivi (Lead Connector). Ils ne sont pas vendus. Je peux retirer mon consentement en tout temps. <a href="/confidentialite.html">Politique de confidentialité</a>.</label>' +
      '</div>' +
      '<p class="cdf-guide-error" id="' + prefix + '-error" role="alert" hidden></p>' +
      '<button type="submit" class="cdf-guide-submit">Recevoir le guide</button>' +
      '</form>'
    );
  }

  function field(prefix, name, label, type, auto, required) {
    var id = prefix + '-' + name;
    var star = required ? ' <span aria-hidden="true">*</span>' : ' <span class="cdf-guide-opt">(optionnel)</span>';
    return (
      '<label class="cdf-guide-field" for="' + id + '">' +
      '<span>' + label + star + '</span>' +
      '<input id="' + id + '" name="' + name + '" type="' + type + '" autocomplete="' + auto + '"' +
      (type === 'tel' ? ' inputmode="tel"' : '') +
      (required ? ' required aria-required="true"' : '') +
      ' maxlength="120">' +
      '</label>'
    );
  }

  function injectStyle() {
    if (document.getElementById('cdf-guide-style')) return;
    var style = document.createElement('style');
    style.id = 'cdf-guide-style';
    style.textContent =
      '#cdf-guide-inline,#cdf-guide-card{font-family:Inter,"Segoe UI",sans-serif;text-transform:none;letter-spacing:normal}' +
      '#cdf-guide-inline button,#cdf-guide-card button,#cdf-guide-inline input,#cdf-guide-card select{font-family:inherit;text-transform:none;letter-spacing:normal;box-sizing:border-box}' +
      '#cdf-guide-inline{background:#F7F5EE;color:#0c2749;border-top:4px solid #AA1120;padding:3rem 1.25rem 3.5rem;scroll-margin-top:5.5rem}' +
      '#cdf-guide-inline .cdf-guide-inner{max-width:42rem;margin:0 auto}' +
      '.cdf-guide-kicker{margin:0 0 .6rem;font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#AA1120}' +
      '#cdf-guide-inline h2,.cdf-guide-card h2{font-family:"Playfair Display",Georgia,serif;font-weight:600;line-height:1.15;color:#0c2749;margin:0}' +
      '#cdf-guide-inline h2{font-size:clamp(1.7rem,3vw,2.3rem)}' +
      '.cdf-guide-lead{margin:.85rem 0 1.25rem;line-height:1.55;color:#24344a}' +
      '.cdf-guide-known{margin:0 0 1rem;font-weight:600}' +
      '.cdf-guide-required{margin:0 0 .8rem;font-size:.82rem;color:#5c6b7a}' +
      '.cdf-guide-grid{display:grid;gap:.85rem}' +
      '.cdf-guide-field{display:grid;gap:.35rem;font-size:.92rem;font-weight:600}' +
      '.cdf-guide-field input,.cdf-guide-field select{font:inherit;font-weight:400;min-height:48px;padding:.55rem .75rem;border:1px solid #8792A5;border-radius:8px;background:#fff;color:#0c2749;width:100%}' +
      '.cdf-guide-opt{font-weight:400;color:#5c6b7a}' +
      '.cdf-guide-choice{border:0;margin:0 0 1rem;padding:0;display:grid;gap:.6rem}' +
      '.cdf-guide-choice legend{font-weight:600;margin-bottom:.35rem;padding:0}' +
      '.cdf-guide-choice label{display:flex;gap:.75rem;align-items:flex-start;padding:.75rem .85rem;border:1px solid #8792A5;border-radius:10px;background:#fff;cursor:pointer}' +
      '.cdf-guide-choice input{width:1.15rem;height:1.15rem;margin-top:.2rem;accent-color:#0c2749}' +
      '.cdf-guide-choice strong{display:block}' +
      '.cdf-guide-choice small{display:block;font-weight:400;color:#5c6b7a}' +
      '.cdf-guide-check{display:flex;gap:.75rem;align-items:flex-start;margin:1rem 0;font-size:.88rem;line-height:1.45;font-weight:400}' +
      '.cdf-guide-check input{width:1.2rem;height:1.2rem;margin-top:.15rem;flex:none;accent-color:#0c2749}' +
      '.cdf-guide-check a{color:#0c2749}' +
      '.cdf-guide-submit{appearance:none;width:100%;min-height:48px;border:0;border-radius:8px;background:#0c2749;color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
      '.cdf-guide-submit:hover,.cdf-guide-submit:focus-visible{background:#AA1120}' +
      '.cdf-guide-submit:disabled{opacity:.7;cursor:progress}' +
      '.cdf-guide-error{margin:.75rem 0 0;color:#7d1020;background:#fff4f4;border-radius:8px;padding:.65rem .75rem}' +
      '.cdf-guide-thanks{margin:0;font-size:1.05rem;line-height:1.5}' +
      '.cdf-guide-hp{position:absolute;left:-9999px;height:0;width:0;overflow:hidden}' +
      '.cdf-guide-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
      '#cdf-guide-inline :focus-visible,#cdf-guide-card :focus-visible{outline:2px solid #AA1120;outline-offset:2px}' +
      '#cdf-guide-card{position:fixed;z-index:35;left:1rem;bottom:1rem;width:min(24rem,calc(100vw - 2rem));max-height:min(70vh,36rem);overflow:auto;background:#fff;color:#0c2749;border:1px solid #e4e0d6;border-radius:16px;box-shadow:0 18px 50px rgba(12,39,73,.18);padding:1rem 1rem 1.1rem;font-family:Inter,"Segoe UI",sans-serif}' +
      '#cdf-guide-card[hidden]{display:none}' +
      '#cdf-guide-card h2{font-size:1.35rem;padding-right:2.5rem}' +
      '.cdf-guide-card-top{display:flex;justify-content:space-between;gap:.5rem;align-items:flex-start}' +
      '.cdf-guide-x,.cdf-guide-later{background:transparent;border:0;color:#0c2749;cursor:pointer;font:inherit}' +
      '.cdf-guide-x{width:44px;height:44px;margin:-.4rem -.4rem 0 0;font-size:1.5rem;line-height:1}' +
      '.cdf-guide-later{display:block;margin:.7rem auto 0;text-decoration:underline;min-height:44px}' +
      '@media (min-width:960px){body.eval-body #cdf-guide-inline .cdf-guide-inner{margin-left:0;margin-right:27rem;max-width:40rem}}' +
      'body.eval-body #cdf-guide-inline{padding-bottom:9rem}' +
      '@media (max-width:640px){#cdf-guide-card{left:.75rem;right:.75rem;width:auto}body.eval-body #cdf-guide-inline{padding-bottom:12rem}}' +
      '@media (prefers-reduced-motion:reduce){#cdf-guide-card{scroll-behavior:auto}}';
    document.head.appendChild(style);
  }

  function thanksHtml() {
    return '<p class="cdf-guide-thanks" role="status" tabindex="-1">Merci. Vous recevrez le guide par courriel.</p>';
  }

  function mountInline(intent, captured) {
    var copy = copyFor(intent);
    var section = document.createElement('section');
    section.id = 'cdf-guide-inline';
    section.setAttribute('aria-labelledby', 'cdf-guide-inline-title');
    section.dataset.intent = intent || 'choix';
    section.innerHTML =
      '<div class="cdf-guide-inner">' +
      '<p class="cdf-guide-kicker">Guide gratuit</p>' +
      '<h2 id="cdf-guide-inline-title">' + escapeHtml(copy.title) + '</h2>' +
      '<p class="cdf-guide-lead">' + escapeHtml(copy.text) + '</p>' +
      formHtml('cdf-gi', intent, captured) +
      '</div>';
    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(section, footer);
    else document.body.appendChild(section);
  }

  function mountCard(intent, captured) {
    var copy = copyFor(intent);
    var card = document.createElement('aside');
    card.id = 'cdf-guide-card';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-labelledby', 'cdf-guide-card-title');
    card.dataset.intent = intent || 'choix';
    card.innerHTML =
      '<div class="cdf-guide-card-top">' +
      '<p class="cdf-guide-kicker">Guide gratuit</p>' +
      '<button type="button" class="cdf-guide-x" data-cdf-guide-dismiss aria-label="Fermer la proposition de guide">×</button>' +
      '</div>' +
      '<h2 id="cdf-guide-card-title">' + escapeHtml(copy.title) + '</h2>' +
      '<p class="cdf-guide-lead">' + escapeHtml(copy.card) + '</p>' +
      '<p class="cdf-guide-live" aria-live="polite"></p>' +
      '<button type="button" class="cdf-guide-submit" data-cdf-guide-jump>Recevoir le guide</button>' +
      '<button type="button" class="cdf-guide-later" data-cdf-guide-dismiss>Non, merci</button>';
    document.body.appendChild(card);
  }

  function syncOffsets() {
    var banner = document.getElementById('cdf-consent');
    var bannerHeight = banner && !banner.hidden ? banner.offsetHeight : 0;
    var section = document.getElementById('cdf-guide-inline');
    if (section) section.style.paddingBottom = (56 + bannerHeight) + 'px';
    var card = document.getElementById('cdf-guide-card');
    if (!card) return;
    var bottom = 16 + bannerHeight;
    var narrow = window.matchMedia('(max-width: 639px)').matches;
    if (document.body.classList.contains('eval-body') && narrow) bottom += 96;
    card.style.bottom = bottom + 'px';
  }

  function openCard(persist) {
    var card = document.getElementById('cdf-guide-card');
    if (!card || cardOpened || storageGet(DONE_KEY) === '1') return;
    if (!previewOpen() && (storageGet(CARD_KEY) === 'shown' || storageGet(CARD_KEY) === 'dismissed')) return;
    card.hidden = false;
    cardOpened = true;
    syncOffsets();
    var live = card.querySelector('.cdf-guide-live');
    if (live) live.textContent = 'Proposition de guide affichée. Vous pouvez la fermer.';
    if (persist !== false && !previewOpen()) storageSet(CARD_KEY, 'shown');
  }

  function dismissCard() {
    var card = document.getElementById('cdf-guide-card');
    if (!card || card.hidden) return;
    card.hidden = true;
    storageSet(CARD_KEY, 'dismissed');
  }

  function jumpToForm() {
    var inline = document.getElementById('cdf-guide-inline');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (inline) {
      inline.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      var focusable = inline.querySelector('.cdf-guide-choice input, .cdf-guide-field input');
      if (focusable) window.setTimeout(function () { focusable.focus(); }, reduce ? 0 : 350);
    }
    dismissCard();
  }

  function phoneOk(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return true;
    if (digits.length === 10) return true;
    if (digits.length === 11 && digits.charAt(0) === '1') return true;
    if (String(raw).trim().charAt(0) === '+' && digits.length >= 10) return true;
    return false;
  }

  function showError(form, message, field) {
    var box = form.querySelector('.cdf-guide-error');
    if (box) {
      box.hidden = !message;
      box.textContent = message || '';
    }
    if (field && typeof field.focus === 'function') field.focus();
  }

  function payloadFrom(form) {
    var data = new FormData(form);
    function val(name) {
      return String(data.get(name) || '').trim();
    }
    var firstName = val('firstName');
    var lastName = val('lastName');
    var utm = {
      utm_source: val('utm_source'),
      utm_medium: val('utm_medium'),
      utm_campaign: val('utm_campaign'),
      utm_content: val('utm_content'),
      utm_term: val('utm_term'),
      gclid: val('gclid'),
      fbclid: val('fbclid')
    };
    return {
      leadType: 'guide',
      firstName: firstName,
      lastName: lastName,
      name: (firstName + ' ' + lastName).trim(),
      email: val('email'),
      phone: val('phone'),
      consent: data.get('consent') === '1',
      guide: val('guide'),
      howFound: val('howFound'),
      referrer: val('referrer'),
      landingPage: location.href.split('#')[0].split('?')[0],
      utm: utm,
      website: val('website')
    };
  }

  function validate(payload, form) {
    if (payload.website) return { ok: false, bot: true };
    var guide = form.querySelector('[name="guide"]:checked') || form.querySelector('[name="guide"]');
    if (!payload.guide) return { ok: false, message: 'Choisissez Acheter ou Vendre.', field: guide };
    if (!payload.firstName) return { ok: false, message: 'Le prénom est requis.', field: form.querySelector('[name="firstName"]') };
    if (!payload.lastName) return { ok: false, message: 'Le nom est requis.', field: form.querySelector('[name="lastName"]') };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return { ok: false, message: 'Indiquez un courriel valide.', field: form.querySelector('[name="email"]') };
    }
    if (!phoneOk(payload.phone)) {
      return { ok: false, message: 'Le téléphone semble incomplet. Vous pouvez aussi le laisser vide.', field: form.querySelector('[name="phone"]') };
    }
    if (!payload.consent) {
      return { ok: false, message: 'Cochez la case de consentement pour recevoir le guide.', field: form.querySelector('[name="consent"]') };
    }
    return { ok: true };
  }

  function markDone(form) {
    storageSet(DONE_KEY, '1');
    storageSet(CARD_KEY, 'dismissed');
    var host = form.parentNode;
    if (host) {
      form.insertAdjacentHTML('beforebegin', thanksHtml());
      var thanks = host.querySelector('.cdf-guide-thanks');
      form.remove();
      if (thanks) thanks.focus();
    }
    document.querySelectorAll('.cdf-guide-form').forEach(function (other) {
      if (other === form) return;
      var parent = other.parentNode;
      if (!parent || parent.querySelector('.cdf-guide-thanks')) {
        other.remove();
        return;
      }
      other.insertAdjacentHTML('beforebegin', thanksHtml());
      other.remove();
    });
    var later = document.querySelector('.cdf-guide-later');
    if (later) later.remove();
  }

  async function submitForm(form) {
    var payload = payloadFrom(form);
    var check = validate(payload, form);
    if (check.bot) return;
    if (!check.ok) {
      showError(form, check.message, check.field);
      return;
    }
    showError(form, '', null);
    var button = form.querySelector('.cdf-guide-submit');
    if (button) {
      button.disabled = true;
      button.textContent = 'Envoi en cours…';
    }
    try {
      var response = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = {};
      try {
        data = await response.json();
      } catch (err) {
        data = {};
      }
      if (data.ignored) {
        markDone(form);
        return;
      }
      if (!response.ok || !data.stored) throw new Error('lead');
      if (typeof window.cdfTrackLead === 'function') window.cdfTrackLead('guide-' + payload.guide);
      markDone(form);
    } catch (err) {
      if (button) {
        button.disabled = false;
        button.textContent = 'Recevoir le guide';
      }
      showError(form, 'L’envoi n’a pas abouti. Réessayez dans un moment, ou appelez-nous.', null);
    }
  }

  function armCard() {
    if (storageGet(DONE_KEY) === '1') return;
    if (previewOpen()) {
      openCard(false);
      return;
    }
    if (storageGet(CARD_KEY) === 'shown' || storageGet(CARD_KEY) === 'dismissed') return;

    function onScroll() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var y = window.scrollY || doc.scrollTop || 0;
      var deep = scrollable > 480 && y / scrollable >= 0.4;
      if (y >= 700 || deep) {
        openCard(true);
        window.removeEventListener('scroll', onScroll);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', function (event) {
      if (Date.now() - startedAt < 8000) return;
      if (window.matchMedia('(pointer: coarse)').matches) return;
      if (event.clientY > 8) return;
      if (event.relatedTarget || event.toElement) return;
      var active = document.activeElement;
      if (active && active.closest && active.closest('#cdf-guide-inline')) return;
      openCard(true);
    });
  }

  function start() {
    if (shouldSkip()) return;
    if (storageGet(DONE_KEY) === '1' && !previewOpen()) return;
    injectStyle();
    var intent = pageIntent();
    var captured = readParams();
    mountInline(intent, captured);
    mountCard(intent, captured);
    syncOffsets();
    window.addEventListener('resize', syncOffsets);
    var banner = document.getElementById('cdf-consent');
    if (banner && window.MutationObserver) {
      new MutationObserver(syncOffsets).observe(banner, { attributes: true, attributeFilter: ['hidden'] });
    }
    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.classList || !form.classList.contains('cdf-guide-form')) return;
      event.preventDefault();
      submitForm(form);
    });
    document.addEventListener('click', function (event) {
      var jump = event.target && event.target.closest ? event.target.closest('[data-cdf-guide-jump]') : null;
      if (jump) {
        jumpToForm();
        return;
      }
      var btn = event.target && event.target.closest ? event.target.closest('[data-cdf-guide-dismiss]') : null;
      if (!btn) return;
      dismissCard();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var active = document.activeElement;
      if (active && active.closest && active.closest('#cdf-guide-inline')) return;
      dismissCard();
    });
    armCard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
