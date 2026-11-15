'use strict';

/**
 * Attribution written on every lead that goes through api/lead.js.
 *
 * Contact `source` is unchanged for the evaluation pipeline
 * (« Évaluation timing vente »). Guide requests use « Guide gratuit »
 * because that form did not exist before. The channel itself is NOT
 * written to contact.source. It goes to the single-choice custom field
 * « Source web » (id 3a2mSDkUem0ftGzy7C3a, key contact.source_web).
 *
 * UTM text fields are sent by key (contact.utm_source, contact.utm_medium,
 * contact.utm_campaign, contact.utm_content) unless GHL_CF_UTM_* holds the
 * field id. utm_term has no custom field; it stays in the contact note.
 */

const SOURCE_WEB_FIELD_ID = '3a2mSDkUem0ftGzy7C3a';

const SOURCE_WEB = {
  google: 'Google organique (site)',
  gbp: 'Google Business Profile',
  ai: 'IA (ChatGPT, Gemini, Perplexity)',
  autre: 'Autre'
};

const HOW_FOUND_LABELS = {
  google: 'Google (recherche)',
  gbp: 'Fiche Google (Google Business Profile)',
  ai: 'Une IA (ChatGPT, Gemini, Perplexity…)',
  social: 'Facebook / Instagram',
  recommandation: 'Recommandation',
  autre: 'Autre'
};

const HOW_FOUND_TAGS = {
  social: 'trouves-facebook-instagram',
  recommandation: 'trouves-recommandation',
  autre: 'trouves-autre'
};

const GUIDE_TITLES = {
  acheteur: 'Acheter en Estrie',
  vendeur: 'Vendre en Estrie'
};

const GUIDE_SOURCE = 'Guide gratuit';
const EVAL_SOURCE = 'Évaluation timing vente';

const AI_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com'
];

const AI_UTM_TOKENS = ['chatgpt', 'openai', 'perplexity', 'gemini', 'copilot'];

const PAID_MEDIUMS = new Set([
  'cpc',
  'ppc',
  'paid',
  'paidsearch',
  'paid_search',
  'display',
  'cpm',
  'paidsocial',
  'paid_social'
]);

const UTM_FIELDS = [
  { param: 'utm_source', key: 'contact.utm_source', env: 'GHL_CF_UTM_SOURCE' },
  { param: 'utm_medium', key: 'contact.utm_medium', env: 'GHL_CF_UTM_MEDIUM' },
  { param: 'utm_campaign', key: 'contact.utm_campaign', env: 'GHL_CF_UTM_CAMPAIGN' },
  { param: 'utm_content', key: 'contact.utm_content', env: 'GHL_CF_UTM_CONTENT' }
];

function asUtm(utm) {
  return utm && typeof utm === 'object' ? utm : {};
}

function hostname(referrer) {
  try {
    return new URL(String(referrer)).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

function urlPath(referrer) {
  try {
    return new URL(String(referrer)).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function hostIs(host, needle) {
  return host === needle || host.endsWith('.' + needle);
}

function isAiReferrer(referrer, utm) {
  const host = hostname(referrer);
  if (AI_HOSTS.some((needle) => hostIs(host, needle))) return true;
  const blob = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .map((key) => String(utm[key] || ''))
    .join(' ')
    .toLowerCase();
  return AI_UTM_TOKENS.some((token) => blob.includes(token));
}

function isPaidTraffic(utm) {
  const medium = String(utm.utm_medium || '').toLowerCase();
  if (PAID_MEDIUMS.has(medium)) return true;
  return Boolean(utm.gclid || utm.gbraid || utm.wbraid || utm.gad_source);
}

function isGoogleBusiness(referrer, utm) {
  const source = String(utm.utm_source || '').toLowerCase();
  if (source === 'gmb' || source === 'gbp' || source === 'google_business' || source === 'googlemybusiness') {
    return true;
  }
  const host = hostname(referrer);
  const path = urlPath(referrer);
  if (hostIs(host, 'maps.google.com') || host === 'maps.google.com') return true;
  if (/^(www\.)?google\.[a-z.]+$/.test(host) && path.startsWith('/maps')) return true;
  if (hostIs(host, 'google.com') && path.startsWith('/maps')) return true;
  return false;
}

function isGoogleOrganic(referrer, utm) {
  const source = String(utm.utm_source || '').toLowerCase();
  const medium = String(utm.utm_medium || '').toLowerCase();
  if ((source === 'google' || source === 'google.com') && (medium === 'organic' || medium === 'organic_search')) {
    return true;
  }
  const host = hostname(referrer);
  if (!/^(www\.)?google\.[a-z.]+$/.test(host)) return false;
  const path = urlPath(referrer);
  if (path.startsWith('/maps') || path.startsWith('/aclk')) return false;
  return true;
}

function detectChannel(referrer, utm) {
  const safe = asUtm(utm);
  if (isAiReferrer(referrer, safe)) return 'ai';
  if (isPaidTraffic(safe)) return 'paid';
  if (isGoogleBusiness(referrer, safe)) return 'gbp';
  if (isGoogleOrganic(referrer, safe)) return 'google_organic';
  return '';
}

function guideIntent(payload) {
  const value = payload.guide || payload.intent || '';
  if (value === 'acheteur' || value === 'vendeur') return value;
  return '';
}

/**
 * A declared answer wins over the referrer.
 * Facebook / Instagram, Recommandation and Autre all map to « Autre ».
 * With no answer, AI, Google Business Profile and Google organic are filled
 * from the referrer or the UTM params. Anything else is « Autre ».
 */
function sourceWebValue(payload) {
  const howFound = String(payload.howFound || '');
  const channel = detectChannel(payload.referrer, payload.utm);
  if (howFound === 'gbp') return SOURCE_WEB.gbp;
  if (howFound === 'ai') return SOURCE_WEB.ai;
  if (howFound === 'google') return SOURCE_WEB.google;
  if (howFound === 'social' || howFound === 'recommandation' || howFound === 'autre') return SOURCE_WEB.autre;
  if (channel === 'ai') return SOURCE_WEB.ai;
  if (channel === 'gbp') return SOURCE_WEB.gbp;
  if (channel === 'google_organic') return SOURCE_WEB.google;
  return SOURCE_WEB.autre;
}

function howFoundLabel(howFound) {
  if (!howFound) return 'non précisé';
  return HOW_FOUND_LABELS[howFound] || String(howFound);
}

function rawAnswerTag(howFound) {
  return HOW_FOUND_TAGS[howFound] || '';
}

function attributionTags(payload) {
  const tag = rawAnswerTag(payload.howFound);
  return tag ? [tag] : [];
}

function guideTags(payload) {
  const intent = guideIntent(payload);
  const tags = [];
  if (intent === 'acheteur') tags.push('guide-acheteur', 'acheteur');
  if (intent === 'vendeur') tags.push('guide-vendeur', 'vendeur');
  attributionTags(payload).forEach((tag) => tags.push(tag));
  return tags;
}

function contactSource(payload) {
  if (payload.leadType === 'guide') return GUIDE_SOURCE;
  return payload.source || EVAL_SOURCE;
}

function pushField(fields, spec, value) {
  if (value === undefined || value === null || value === '') return;
  const fromEnv = spec.env ? process.env[spec.env] : '';
  const id = fromEnv || spec.id || '';
  if (id) {
    fields.push({ id, fieldValue: value });
    return;
  }
  if (spec.key) fields.push({ key: spec.key, fieldValue: String(value) });
}

function attributionCustomFields(payload) {
  const fields = [];
  const utm = asUtm(payload.utm);
  pushField(fields, { id: SOURCE_WEB_FIELD_ID }, sourceWebValue(payload));
  UTM_FIELDS.forEach((spec) => pushField(fields, spec, utm[spec.param] || ''));
  return fields;
}

function attributionNoteLines(payload) {
  const utm = asUtm(payload.utm);
  const lines = [];
  const intent = guideIntent(payload);
  if (payload.leadType === 'guide' && intent) {
    lines.push(`Guide demandé : ${GUIDE_TITLES[intent]}`);
    lines.push(`Intention : ${intent}`);
  }
  lines.push(`Comment nous avez-vous trouvés : ${howFoundLabel(payload.howFound)}`);
  lines.push(`Source web : ${sourceWebValue(payload)}`);
  lines.push(`Canal détecté : ${detectChannel(payload.referrer, utm) || 'aucun'}`);
  if (payload.landingPage) lines.push(`Page : ${payload.landingPage}`);
  if (payload.referrer) lines.push(`Référent : ${payload.referrer}`);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    if (utm[key]) lines.push(`${key} : ${utm[key]}`);
  });
  if (utm.gclid) lines.push(`gclid : ${utm.gclid}`);
  if (utm.fbclid) lines.push(`fbclid : ${utm.fbclid}`);
  return lines;
}

function notesWithAttribution(payload) {
  const extra = attributionNoteLines(payload).join('\n');
  const base = String(payload.notes || '').trim();
  return base ? `${base}\n\n${extra}` : extra;
}

module.exports = {
  SOURCE_WEB_FIELD_ID,
  SOURCE_WEB,
  HOW_FOUND_LABELS,
  HOW_FOUND_TAGS,
  GUIDE_TITLES,
  GUIDE_SOURCE,
  EVAL_SOURCE,
  UTM_FIELDS,
  detectChannel,
  sourceWebValue,
  howFoundLabel,
  guideIntent,
  attributionTags,
  guideTags,
  contactSource,
  attributionCustomFields,
  attributionNoteLines,
  notesWithAttribution
};
