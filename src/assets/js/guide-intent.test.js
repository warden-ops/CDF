'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pageIntent } = require('./guide-intent');

test('buyer, seller and unknown pages', () => {
  assert.equal(pageIntent('/acheter.html'), 'acheteur');
  assert.equal(pageIntent('/proprietes.html'), 'acheteur');
  assert.equal(pageIntent('/courtier-acheteur-estrie.html'), 'acheteur');
  assert.equal(pageIntent('/plex-a-vendre-sherbrooke.html'), 'acheteur');
  assert.equal(pageIntent('/prop-800-rue-tessier-20828105.html'), 'acheteur');
  assert.equal(pageIntent('/ca/qc/sherbrooke/mont-bellevue/800-rue-tessier/'), 'acheteur');
  assert.equal(pageIntent('/vendre.html'), 'vendeur');
  assert.equal(pageIntent('/evaluation.html'), 'vendeur');
  assert.equal(pageIntent('/plex-sherbrooke.html'), 'vendeur');
  assert.equal(pageIntent('/article-documents-vente-maison.html'), 'vendeur');
  assert.equal(pageIntent('/'), '');
  assert.equal(pageIntent('/index.html'), '');
  assert.equal(pageIntent('/blog.html'), '');
  assert.equal(pageIntent('/regions/sherbrooke.html'), '');
  assert.equal(pageIntent('/article-vendre-acheter-sherbrooke.html'), '');
  assert.equal(pageIntent('/courtier-commercial.html'), '');
  assert.equal(pageIntent('/confidentialite.html'), '');
});
