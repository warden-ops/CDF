/* Pop-up du guide gratuit. Réutilise le formulaire et l'envoi de guide-lead.js. */
(function () {
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) boot(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var OPEN_DELAY_MS = 3000;
  var DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  var DONE_KEY = 'cdf_guide_done';
  var DISMISS_KEY = 'cdf_guide_popup_until';
  var SESSION_KEY = 'cdf_guide_popup_session';
  var CONSENT_KEY = 'cdf_consent';
  var MOBILE_MAX_PX = 900;

  function pageBlocked(pathname, robotsContent, hasRefresh) {
    var path = String(pathname || '').toLowerCase();
    if (/merci\.html$/.test(path) || /\/merci\/?$/.test(path)) return true;
    if (path.indexOf('remerciement') !== -1 || path.indexOf('confirmation') !== -1) return true;
    if (path.indexOf('confidentialite') !== -1) return true;
    if (path.indexOf('politique-de-confidentialite') !== -1) return true;
    if (path.indexOf('politique-confidentialite') !== -1) return true;
    if (hasRefresh) return true;
    if (/noindex/i.test(String(robotsContent || ''))) return true;
    return false;
  }

  function canShow(state, now) {
    if (!state || state.blocked || state.done || state.sessionShown || !state.consent || state.formVisible) return false;
    if (state.dismissUntil && Number(state.dismissUntil) > now) return false;
    return true;
  }

  function delayFromLoad(consentAlreadySet, loadEventEnd, now) {
    if (!consentAlreadySet) return OPEN_DELAY_MS;
    if (!loadEventEnd || loadEventEnd <= 0) return OPEN_DELAY_MS;
    var since = now - loadEventEnd;
    if (since < 0) return OPEN_DELAY_MS;
    return Math.max(0, OPEN_DELAY_MS - since);
  }

  return {
    OPEN_DELAY_MS: OPEN_DELAY_MS,
    DISMISS_MS: DISMISS_MS,
    DONE_KEY: DONE_KEY,
    DISMISS_KEY: DISMISS_KEY,
    SESSION_KEY: SESSION_KEY,
    CONSENT_KEY: CONSENT_KEY,
    MOBILE_MAX_PX: MOBILE_MAX_PX,
    pageBlocked: pageBlocked,
    canShow: canShow,
    delayFromLoad: delayFromLoad
  };
});

function boot(root, api) {
  if (root.__cdfGuidePopupInit) return;
  root.__cdfGuidePopupInit = true;

  var doc = root.document;
  var open = false;
  var lastFocus = null;
  var inerted = [];
  var savedBody = null;
  var lockedScroll = 0;
  var armed = false;

  function storageGet(area, key) {
    try {
      return area.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function storageSet(area, key, value) {
    try {
      area.setItem(key, value);
    } catch (err) {}
  }

  function robotsContent() {
    var robots = doc.querySelector('meta[name="robots"]');
    return robots ? robots.getAttribute('content') || '' : '';
  }

  function hasRefresh() {
    return !!doc.querySelector('meta[http-equiv="refresh"]');
  }

  function blocked() {
    return api.pageBlocked(root.location.pathname, robotsContent(), hasRefresh());
  }

  function consentGiven() {
    var value = storageGet(root.localStorage, api.CONSENT_KEY);
    return value === 'granted' || value === 'denied';
  }

  function formOnScreen() {
    var form = doc.querySelector('#cdf-guide-inline .cdf-guide-form');
    if (!form || typeof form.getBoundingClientRect !== 'function') return false;
    var rect = form.getBoundingClientRect();
    var vh = root.innerHeight || 0;
    var vw = root.innerWidth || 0;
    if (vh <= 0 || vw <= 0) return false;
    var height = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    var width = Math.min(rect.right, vw) - Math.max(rect.left, 0);
    return height > 8 && width > 8;
  }

  function stateNow() {
    return {
      blocked: blocked(),
      done: storageGet(root.localStorage, api.DONE_KEY) === '1',
      sessionShown: storageGet(root.sessionStorage, api.SESSION_KEY) === '1',
      consent: consentGiven(),
      formVisible: formOnScreen(),
      dismissUntil: storageGet(root.localStorage, api.DISMISS_KEY)
    };
  }

  function track(name) {
    try {
      if (typeof root.gtag === 'function') {
        root.gtag('event', name);
        return;
      }
      if (root.dataLayer && typeof root.dataLayer.push === 'function') {
        root.dataLayer.push({ event: name });
      }
    } catch (err) {}
  }

  function injectStyle() {
    if (doc.getElementById('cdf-guide-popup-style')) return;
    var style = doc.createElement('style');
    style.id = 'cdf-guide-popup-style';
    style.textContent =
      '#cdf-guide-popup{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:1rem}' +
      '#cdf-guide-popup[hidden]{display:none !important}' +
      'html.cdf-guide-popup-lock,html.cdf-guide-popup-lock body{overflow:hidden}' +
      '.cdf-guide-popup-backdrop{position:absolute;inset:0;background:rgba(0,14,53,.55)}' +
      '.cdf-guide-popup-panel{position:relative;z-index:1;box-sizing:border-box;width:min(36rem,100%);max-height:calc(100vh - 2rem);max-height:calc(100dvh - 2rem);overflow:auto;overscroll-behavior:contain;background:#F7F5EE;color:#000E35;border-top:4px solid #AA1120;border-radius:16px;box-shadow:0 18px 50px rgba(0,14,53,.28);padding:1rem 1.15rem 1.2rem;font-family:Inter,"Segoe UI",sans-serif;text-transform:none;letter-spacing:normal}' +
      '#cdf-guide-popup button,#cdf-guide-popup input,#cdf-guide-popup select{font-family:inherit;text-transform:none;letter-spacing:normal;box-sizing:border-box}' +
      '.cdf-guide-popup-bar{display:flex;align-items:center;justify-content:space-between;gap:.75rem;position:sticky;top:0;z-index:1;background:#F7F5EE;padding-bottom:.35rem}' +
      '.cdf-guide-popup-bar .cdf-guide-kicker{margin:0}' +
      '#cdf-guide-popup h2{font-family:"Playfair Display",Georgia,serif;font-weight:600;font-size:clamp(1.45rem,2.4vw,2rem);line-height:1.15;color:#000E35;margin:0}' +
      '#cdf-guide-popup .cdf-guide-lead{margin:.75rem 0 1rem}' +
      '.cdf-guide-popup-close{flex:none;min-height:44px;padding:.4rem .9rem;border:2px solid #000E35;border-radius:8px;background:#fff;color:#000E35;font:inherit;font-weight:600;cursor:pointer}' +
      '.cdf-guide-popup-close:hover,.cdf-guide-popup-close:focus-visible{background:#AA1120;border-color:#AA1120;color:#fff}' +
      '#cdf-guide-popup .cdf-guide-submit{background:#000E35}' +
      '#cdf-guide-popup .cdf-guide-submit:hover,#cdf-guide-popup .cdf-guide-submit:focus-visible{background:#AA1120}' +
      '#cdf-guide-popup :focus-visible{outline:2px solid #AA1120;outline-offset:2px}' +
      '@media (max-width:899px){' +
      '#cdf-guide-popup{align-items:flex-end;padding:0}' +
      '.cdf-guide-popup-backdrop{background:rgba(0,14,53,.35)}' +
      '.cdf-guide-popup-panel{width:100%;max-height:40vh;max-height:40dvh;border-radius:16px 16px 0 0;padding-bottom:calc(1rem + env(safe-area-inset-bottom))}' +
      '.cdf-guide-popup-formhost{display:none}' +
      '.cdf-guide-popup-more{position:sticky;bottom:0;box-shadow:0 -10px 12px #F7F5EE}' +
      '#cdf-guide-popup.is-form .cdf-guide-popup-formhost{display:block}' +
      '#cdf-guide-popup.is-form .cdf-guide-popup-more{display:none}' +
      '#cdf-guide-popup.is-form .cdf-guide-popup-panel{max-height:85vh;max-height:85dvh}' +
      '}' +
      '@media (min-width:900px){.cdf-guide-popup-more{display:none}.cdf-guide-popup-formhost{display:block}}' +
      '@media (prefers-reduced-motion:reduce){#cdf-guide-popup{scroll-behavior:auto}}';
    doc.head.appendChild(style);
  }

  function popupRoot() {
    return doc.getElementById('cdf-guide-popup');
  }

  function lockPage() {
    var gap = root.innerWidth - doc.documentElement.clientWidth;
    lockedScroll = root.scrollY || doc.documentElement.scrollTop || 0;
    savedBody = {
      position: doc.body.style.position,
      top: doc.body.style.top,
      left: doc.body.style.left,
      right: doc.body.style.right,
      paddingRight: doc.body.style.paddingRight
    };
    doc.documentElement.classList.add('cdf-guide-popup-lock');
    doc.body.style.position = 'fixed';
    doc.body.style.top = (-lockedScroll) + 'px';
    doc.body.style.left = '0';
    doc.body.style.right = '0';
    if (gap > 0) doc.body.style.paddingRight = gap + 'px';
    var kids = doc.body.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (el.id === 'cdf-guide-popup' || el.hasAttribute('inert')) continue;
      el.setAttribute('inert', '');
      inerted.push(el);
    }
  }

  function unlockPage() {
    doc.documentElement.classList.remove('cdf-guide-popup-lock');
    if (savedBody) {
      doc.body.style.position = savedBody.position;
      doc.body.style.top = savedBody.top;
      doc.body.style.left = savedBody.left;
      doc.body.style.right = savedBody.right;
      doc.body.style.paddingRight = savedBody.paddingRight;
      savedBody = null;
    }
    root.scrollTo(0, lockedScroll);
    inerted.forEach(function (el) { el.removeAttribute('inert'); });
    inerted = [];
  }

  function focusables(panel) {
    var nodes = panel.querySelectorAll('button, [href], input, select, textarea');
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.disabled) continue;
      if (el.closest('[hidden]')) continue;
      var view = root.getComputedStyle(el);
      if (view.display === 'none' || view.visibility === 'hidden') continue;
      list.push(el);
    }
    return list;
  }

  function onKeydown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePopup('dismiss');
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown' || event.key === 'Home' || event.key === 'End' || event.key === ' ') {
      var scrollingPanel = doc.querySelector('#cdf-guide-popup .cdf-guide-popup-panel');
      if (!scrollingPanel || !scrollingPanel.contains(event.target)) event.preventDefault();
    }
    if (event.key !== 'Tab') return;
    var panel = doc.querySelector('#cdf-guide-popup .cdf-guide-popup-panel');
    if (!panel) return;
    var list = focusables(panel);
    if (!list.length) {
      event.preventDefault();
      return;
    }
    var first = list[0];
    var last = list[list.length - 1];
    var active = doc.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === panel)) {
      event.preventDefault();
      first.focus();
    }
  }

  function onClick(event) {
    if (!open) return;
    var target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-cdf-popup-more]')) {
      event.preventDefault();
      revealForm();
      return;
    }
    if (target.closest('[data-cdf-popup-dismiss]')) {
      event.preventDefault();
      closePopup('dismiss');
    }
  }

  function onPointerScroll(event) {
    if (!open) return;
    var panel = doc.querySelector('#cdf-guide-popup .cdf-guide-popup-panel');
    if (panel && panel.contains(event.target)) return;
    event.preventDefault();
  }

  function revealForm() {
    var rootEl = popupRoot();
    if (!rootEl) return;
    rootEl.classList.add('is-form');
    var field = rootEl.querySelector('.cdf-guide-choice input, .cdf-guide-field input');
    if (field && typeof field.focus === 'function') field.focus({ preventScroll: true });
  }

  function closePopup(reason) {
    var rootEl = popupRoot();
    if (!rootEl || rootEl.hidden) return;
    open = false;
    rootEl.hidden = true;
    bindScrollLock(false);
    unlockPage();
    if (reason === 'dismiss') {
      storageSet(root.localStorage, api.DISMISS_KEY, String(Date.now() + api.DISMISS_MS));
      track('popup_guide_close');
    }
    var back = lastFocus;
    lastFocus = null;
    if (back && typeof back.focus === 'function' && doc.contains(back)) {
      back.focus({ preventScroll: true });
    }
  }

  function showPopup() {
    if (!root.CDFGuideLead || typeof root.CDFGuideLead.content !== 'function') return false;
    var content = root.CDFGuideLead.content('cdf-gp');
    injectStyle();
    var wrap = doc.createElement('div');
    wrap.id = 'cdf-guide-popup';
    wrap.innerHTML =
      '<div class="cdf-guide-popup-backdrop" data-cdf-popup-dismiss></div>' +
      '<div class="cdf-guide-popup-panel" role="dialog" aria-modal="true" aria-labelledby="cdf-guide-popup-title" aria-describedby="cdf-guide-popup-text" tabindex="-1">' +
      '<div class="cdf-guide-popup-bar">' +
      '<p class="cdf-guide-kicker">' + content.kicker + '</p>' +
      '<button type="button" class="cdf-guide-popup-close" data-cdf-popup-dismiss>Fermer</button>' +
      '</div>' +
      '<h2 id="cdf-guide-popup-title"></h2>' +
      '<p class="cdf-guide-lead" id="cdf-guide-popup-text"></p>' +
      '<button type="button" class="cdf-guide-submit cdf-guide-popup-more" data-cdf-popup-more>Recevoir le guide</button>' +
      '<div class="cdf-guide-popup-formhost"></div>' +
      '</div>';
    wrap.querySelector('#cdf-guide-popup-title').textContent = content.title;
    wrap.querySelector('#cdf-guide-popup-text').textContent = content.text;
    wrap.querySelector('.cdf-guide-popup-formhost').innerHTML = content.formHtml;
    lastFocus = doc.activeElement;
    doc.body.appendChild(wrap);
    lockPage();
    bindScrollLock(true);
    open = true;
    storageSet(root.sessionStorage, api.SESSION_KEY, '1');
    var panel = wrap.querySelector('.cdf-guide-popup-panel');
    if (panel && typeof panel.focus === 'function') panel.focus({ preventScroll: true });
    track('popup_guide_open');
    return true;
  }

  function tryOpen() {
    if (open || popupRoot()) return;
    if (!api.canShow(stateNow(), Date.now())) return;
    if (!root.CDFGuideLead || typeof root.CDFGuideLead.content !== 'function') {
      if (!tryOpen.retried) {
        tryOpen.retried = true;
        root.setTimeout(tryOpen, 300);
      }
      return;
    }
    showPopup();
  }

  function loadEventEnd() {
    try {
      var nav = root.performance && root.performance.getEntriesByType('navigation')[0];
      return nav && nav.loadEventEnd ? nav.loadEventEnd : 0;
    } catch (err) {
      return 0;
    }
  }

  function arm(already) {
    if (armed) return;
    armed = true;
    if (already && doc.readyState !== 'complete') {
      root.addEventListener('load', function () {
        root.setTimeout(tryOpen, api.OPEN_DELAY_MS);
      });
      return;
    }
    var delay = already ? api.delayFromLoad(true, loadEventEnd(), root.performance.now()) : api.OPEN_DELAY_MS;
    root.setTimeout(tryOpen, delay);
  }

  function whenConsented() {
    if (consentGiven()) {
      arm(true);
      return;
    }
    function answered() {
      if (!consentGiven()) return;
      doc.removeEventListener('click', onChoice, true);
      arm(false);
    }
    function onChoice(event) {
      var target = event.target;
      if (!target || !target.closest || !target.closest('button[data-cdf-choice]')) return;
      root.setTimeout(answered, 0);
    }
    doc.addEventListener('click', onChoice, true);
  }

  function bindScrollLock(active) {
    if (active) {
      doc.addEventListener('wheel', onPointerScroll, { passive: false });
      doc.addEventListener('touchmove', onPointerScroll, { passive: false });
      return;
    }
    doc.removeEventListener('wheel', onPointerScroll);
    doc.removeEventListener('touchmove', onPointerScroll);
  }

  if (blocked()) return;

  doc.addEventListener('keydown', onKeydown);
  doc.addEventListener('click', onClick);
  doc.addEventListener('cdf-guide-stored', function (event) {
    var form = event.detail && event.detail.form;
    if (!form || !form.closest || !form.closest('#cdf-guide-popup')) return;
    track('popup_guide_submit');
  });
  whenConsented();
}
})();
