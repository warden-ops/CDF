/* Intent de page pour le guide gratuit. Acheteur, vendeur, ou choix. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CDFGuideIntent = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var BUYER = {
    acheter: true,
    proprietes: true,
    'courtier-acheteur-estrie': true,
    'plex-a-vendre-sherbrooke': true,
    'article-premiere-maison-estrie': true,
    'article-schl-premier-acheteur': true,
    'article-frais-caches': true,
    'article-eviter-les-pieges': true,
    'article-offre-achat-quebec': true,
    'article-inspection-maison-estrie': true,
    'article-condo-sherbrooke': true,
    'article-credit-impot-taxe-de-bienvenue': true,
    'article-contre-offre-quebec': true,
    'article-copropriete-documents-quebec': true,
    'article-droits-mutation-sherbrooke': true,
    'article-investir-sherbrooke': true
  };

  var SELLER = {
    vendre: true,
    evaluation: true,
    'article-evaluation-marchande-estrie': true,
    'article-declaration-vendeur': true,
    'article-home-staging': true,
    'article-photos-mise-en-marche': true,
    'article-prix-affiche-vs-vente': true,
    'article-delai-vente-estrie': true,
    'article-courtier-ou-vente-libre': true,
    'article-vendre-condo-sherbrooke': true,
    'article-vendre-hiver-estrie': true,
    'article-vendre-plex-sherbrooke': true,
    'article-documents-vente-maison': true,
    'article-documents-vente-plex': true,
    'article-documents-vente-terrain': true,
    'plex-sherbrooke': true
  };

  function stemOf(pathname) {
    var path = String(pathname || '/').toLowerCase().split('?')[0].split('#')[0];
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    return last.replace(/\.html$/, '');
  }

  function pageIntent(pathname) {
    var path = String(pathname || '/').toLowerCase().split('?')[0].split('#')[0];
    if (path.indexOf('/ca/qc/') !== -1) return 'acheteur';
    var stem = stemOf(path);
    if (stem.indexOf('prop-') === 0) return 'acheteur';
    if (BUYER[stem]) return 'acheteur';
    if (SELLER[stem]) return 'vendeur';
    return '';
  }

  return { pageIntent: pageIntent };
});
