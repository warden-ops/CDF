'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const popup = require('./guide-popup');

test('pages exclues du pop-up', () => {
  assert.equal(popup.pageBlocked('/merci.html', '', false), true);
  assert.equal(popup.pageBlocked('/merci/', '', false), true);
  assert.equal(popup.pageBlocked('/confirmation-envoi.html', '', false), true);
  assert.equal(popup.pageBlocked('/remerciement.html', '', false), true);
  assert.equal(popup.pageBlocked('/confidentialite.html', 'index, follow', false), true);
  assert.equal(popup.pageBlocked('/politique-confidentialite/', '', false), true);
  assert.equal(popup.pageBlocked('/blog.html', 'noindex, nofollow', false), true);
  assert.equal(popup.pageBlocked('/proprietes.html', 'index, follow', true), true);
  assert.equal(popup.pageBlocked('/', 'index, follow', false), false);
  assert.equal(popup.pageBlocked('/index.html', '', false), false);
  assert.equal(popup.pageBlocked('/vendre.html', 'index, follow', false), false);
});

test('affichage selon consentement, session, fermeture et envoi', () => {
  var now = Date.parse('2026-11-17T18:00:00Z');
  var openState = {
    blocked: false,
    done: false,
    sessionShown: false,
    consent: true,
    formVisible: false,
    dismissUntil: null
  };
  assert.equal(popup.canShow(openState, now), true);
  assert.equal(popup.canShow(Object.assign({}, openState, { consent: false }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { sessionShown: true }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { done: true }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { formVisible: true }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { blocked: true }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { dismissUntil: String(now + 1000) }), now), false);
  assert.equal(popup.canShow(Object.assign({}, openState, { dismissUntil: String(now - 1000) }), now), true);
  assert.equal(popup.DISMISS_MS, 14 * 24 * 60 * 60 * 1000);
});

test('le délai de 3 s part du chargement si le consentement est déjà donné', () => {
  assert.equal(popup.delayFromLoad(true, 1000, 1500), 2500);
  assert.equal(popup.delayFromLoad(true, 1000, 5000), 0);
  assert.equal(popup.delayFromLoad(false, 1000, 5000), 3000);
  assert.equal(popup.OPEN_DELAY_MS, 3000);
  assert.equal(popup.MOBILE_MAX_PX, 900);
});
