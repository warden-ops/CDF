'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const attribution = require('./attribution');
const handler = require('./lead');

const MARIE = {
  leadType: 'guide',
  firstName: 'Marie',
  lastName: 'Tremblay',
  name: 'Marie Tremblay',
  email: 'marie.tremblay@exemple.ca',
  phone: '8195550142',
  consent: true,
  guide: 'acheteur',
  howFound: 'google',
  referrer: 'https://www.google.com/search?q=acheter+maison+sherbrooke',
  landingPage: 'https://chiassondefrancesco.ca/acheter.html',
  utm: {
    utm_source: 'google',
    utm_medium: 'organic',
    utm_campaign: 'estrie',
    utm_content: 'guide',
    utm_term: 'maison sherbrooke'
  }
};

function field(body, idOrKey) {
  return body.customFields.find((item) => item.id === idOrKey || item.key === idOrKey);
}

test('guide acheteur from Google organic keeps contact source and fills Source web', () => {
  assert.equal(handler.validateLead(MARIE), null);
  const body = handler.buildContactBody(MARIE);
  assert.equal(body.source, 'Guide gratuit');
  assert.equal(body.email, 'marie.tremblay@exemple.ca');
  assert.equal(body.phone, '+18195550142');
  assert.equal(body.firstName, 'Marie');
  assert.equal(body.lastName, 'Tremblay');
  const sourceWeb = field(body, attribution.SOURCE_WEB_FIELD_ID);
  assert.deepEqual(sourceWeb, {
    id: '3a2mSDkUem0ftGzy7C3a',
    fieldValue: 'Google organique (site)'
  });
  assert.equal(field(body, 'contact.utm_source').fieldValue, 'google');
  assert.equal(field(body, 'contact.utm_medium').fieldValue, 'organic');
  assert.equal(field(body, 'contact.utm_campaign').fieldValue, 'estrie');
  assert.equal(field(body, 'contact.utm_content').fieldValue, 'guide');
  assert.equal(body.customFields.some((item) => item.key === 'contact.utm_term'), false);
  const message = field(body, 'T9wpOOLRk5ACYlgPHmm5');
  assert.match(message.fieldValue, /Guide demandé : Acheter en Estrie/);
  assert.match(message.fieldValue, /Comment nous avez-vous trouvés : Google \(recherche\)/);
  assert.match(message.fieldValue, /utm_term : maison sherbrooke/);
  assert.deepEqual(handler.tagsFromPayload(MARIE), ['guide-acheteur', 'acheteur']);
  assert.equal(handler.createsOpportunity(MARIE), false);
});

test('declared Facebook maps to Autre and keeps the raw answer', () => {
  const payload = {
    ...MARIE,
    guide: 'vendeur',
    howFound: 'social',
    referrer: 'https://www.google.ca/search?q=vendre',
    phone: ''
  };
  assert.equal(handler.validateLead(payload), null);
  const body = handler.buildContactBody(payload);
  assert.equal(body.phone, undefined);
  assert.equal(field(body, attribution.SOURCE_WEB_FIELD_ID).fieldValue, 'Autre');
  assert.match(field(body, 'T9wpOOLRk5ACYlgPHmm5').fieldValue, /Facebook \/ Instagram/);
  assert.match(field(body, 'T9wpOOLRk5ACYlgPHmm5').fieldValue, /Guide demandé : Vendre en Estrie/);
  assert.deepEqual(handler.tagsFromPayload(payload), [
    'guide-vendeur',
    'vendeur',
    'trouves-facebook-instagram'
  ]);
});

test('AI referrer and Google Business Profile detection', () => {
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://chatgpt.com/c/abc', howFound: '' }),
    'IA (ChatGPT, Gemini, Perplexity)'
  );
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://chat.openai.com/', howFound: '' }),
    'IA (ChatGPT, Gemini, Perplexity)'
  );
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://www.perplexity.ai/search', howFound: '' }),
    'IA (ChatGPT, Gemini, Perplexity)'
  );
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://gemini.google.com/app', howFound: '' }),
    'IA (ChatGPT, Gemini, Perplexity)'
  );
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://copilot.microsoft.com/', howFound: '' }),
    'IA (ChatGPT, Gemini, Perplexity)'
  );
  assert.equal(
    attribution.sourceWebValue({ referrer: 'https://maps.google.com/maps?q=remax', howFound: '' }),
    'Google Business Profile'
  );
  assert.equal(
    attribution.sourceWebValue({
      referrer: 'https://www.google.com/maps/place/Sherbrooke',
      howFound: ''
    }),
    'Google Business Profile'
  );
  assert.equal(
    attribution.sourceWebValue({
      referrer: 'https://www.google.com/search?q=maison',
      utm: { gclid: 'abc' },
      howFound: ''
    }),
    'Autre'
  );
  assert.equal(attribution.detectChannel('https://www.google.com/search?q=maison', { gclid: 'abc' }), 'paid');
});

test('a declared answer wins over a conflicting referrer', () => {
  assert.equal(
    attribution.sourceWebValue({
      howFound: 'gbp',
      referrer: 'https://chatgpt.com/'
    }),
    'Google Business Profile'
  );
  assert.equal(
    attribution.sourceWebValue({
      howFound: 'recommandation',
      referrer: 'https://www.google.com/search?q=estrie'
    }),
    'Autre'
  );
  assert.equal(attribution.HOW_FOUND_TAGS.recommandation, 'trouves-recommandation');
});

test('evaluation keeps its contact source and still records Source web', () => {
  const payload = {
    firstName: 'Jean',
    lastName: 'Côté',
    name: 'Jean Côté',
    email: 'jean.cote@exemple.ca',
    phone: '(819) 555-0199',
    consent: true,
    leadType: 'evaluation',
    source: 'Évaluation timing vente',
    howFound: 'ai',
    referrer: '',
    notes: 'Formulaire: CDF evaluation timing',
    utm: { utm_source: 'perplexity', utm_medium: 'ai-search' },
    custom: { score: 72, verdict: 'favorable' }
  };
  assert.equal(handler.validateLead(payload), null);
  const body = handler.buildContactBody(payload);
  assert.equal(body.source, 'Évaluation timing vente');
  assert.equal(field(body, attribution.SOURCE_WEB_FIELD_ID).fieldValue, 'IA (ChatGPT, Gemini, Perplexity)');
  assert.equal(field(body, 'contact.utm_source').fieldValue, 'perplexity');
  assert.equal(field(body, 'contact.utm_medium').fieldValue, 'ai-search');
  assert.match(field(body, 'T9wpOOLRk5ACYlgPHmm5').fieldValue, /Une IA \(ChatGPT, Gemini, Perplexity…\)/);
  assert.equal(field(body, '4zQR0GZQZLCMujxJyRNr').fieldValue, 'Lead Vendeur');
  const tags = handler.tagsFromPayload(payload);
  assert.ok(tags.includes('form-eval'));
  assert.ok(tags.includes('évaluation-timing'));
  assert.equal(tags.includes('guide-vendeur'), false);
  assert.equal(handler.createsOpportunity(payload), true);
});

test('guide validation rejects a missing email, consent, name or guide', () => {
  assert.equal(handler.validateLead({ ...MARIE, email: '' }).error, 'Invalid email');
  assert.equal(handler.validateLead({ ...MARIE, consent: false }).error, 'Consent required');
  assert.equal(handler.validateLead({ ...MARIE, lastName: '' }).error, 'Last name required');
  assert.equal(handler.validateLead({ ...MARIE, guide: '' }).error, 'Guide required');
  assert.equal(handler.validateLead({ ...MARIE, phone: '123' }).error, 'Invalid phone');
  assert.equal(handler.validateLead({ ...MARIE, website: 'https://spam.test' }).ignored, true);
});

test('evaluation still requires a phone', () => {
  const result = handler.validateLead({
    firstName: 'Jean',
    email: 'jean.cote@exemple.ca',
    phone: '',
    consent: true,
    leadType: 'evaluation'
  });
  assert.equal(result.error, 'Invalid phone');
});

test('UTM field ids from the environment replace the keys', () => {
  const previous = process.env.GHL_CF_UTM_SOURCE;
  process.env.GHL_CF_UTM_SOURCE = 'utmSourceFieldId';
  try {
    const body = handler.buildContactBody(MARIE);
    assert.deepEqual(field(body, 'utmSourceFieldId'), {
      id: 'utmSourceFieldId',
      fieldValue: 'google'
    });
    assert.equal(field(body, 'contact.utm_medium').key, 'contact.utm_medium');
  } finally {
    if (previous === undefined) delete process.env.GHL_CF_UTM_SOURCE;
    else process.env.GHL_CF_UTM_SOURCE = previous;
  }
});
