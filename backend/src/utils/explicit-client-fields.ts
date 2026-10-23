export type ExplicitClient = Record<string, any> & { full_name: string };

const valueAfter = (text: string, labels: string[]) => {
  const pattern = new RegExp(`(?:^|\\n)[ \\t]*(?:${labels.join('|')})[ \\t]*(?:[:#-][ \\t]*)?(?:\\n[ \\t]*)?([^\\n;|,]{1,120})`, 'im');
  return text.match(pattern)?.[1]?.trim() || null;
};

function normalizeTableText(text: string): string {
  return text.replace(/\r/g, '').replace(/^\s*\|\s*-+\s*\|\s*$/gm, '').replace(/^\s*\|\s*$/gm, '')
    .replace(/^\s*\|\s?/gm, '').replace(/\s*\|\s*$/gm, '').replace(/\n{2,}/g, '\n');
}

function parseOne(text: string): ExplicitClient {
  text = normalizeTableText(text);
  const dutchTaxName = text.match(/Persoonlijke gegevens\s+Naam\s+(.+?)\s+Geboortedatum\b/i)?.[1]?.trim() || null;
  const dutchBirthDate = text.match(/\bGeboortedatum\s+(\d{2}-\d{2}-\d{4})\b/i)?.[1] || null;
  const dutchPhone = text.match(/\bTelefoonnummer\s+([+\d][\d\s().-]{7,18}?)(?=\s+Land waarin\b)/i)?.[1]?.trim() || null;
  const dutchResidenceCountry = text.match(/\bLand waarin u op 1 januari\s+\d{4}\s+woonde\s+([A-Za-zÀ-ÿ-]+)/i)?.[1]?.trim() || null;
  const dutchNationality = text.match(/\bNationaliteit\s*\(kies het land\)\s+([A-Za-zÀ-ÿ-]+)\s+Was u\b/i)?.[1]?.trim() || null;
  const email = text.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || null;
  const bsn = text.match(/(?:bsn|burgerservicenummer)\D{0,20}(\d{8,9})/i)?.[1] || text.match(/\b\d{9}\b/)?.[0] || null;
  const phone = text.match(/(?:\+31|\+34|0031|0034|06)[\d\s().-]{7,16}/)?.[0]?.trim() || null;
  const firstName = valueAfter(text, ['nombre de pila', 'nombre', 'first name', 'voornaam']);
  const lastName = valueAfter(text, ['apellidos', 'apellido', 'surname', 'last name', 'achternaam']);
  const street = valueAfter(text, ['calle', 'straat', 'street']);
  const number = valueAfter(text, ['número', 'numero', 'huisnummer', 'number']);
  const dates = valueAfter(text, ['fecha de nacimiento', 'fecha nacimiento', 'date of birth', 'geboortedatum']);
  const country = valueAfter(text, ['país de residencia', 'pais de residencia', 'country', 'land']) || (/domicilio registrado en países bajos/i.test(text) ? 'Países Bajos' : valueAfter(text, ['país de nacimiento', 'pais de nacimiento']));
  const nationality = valueAfter(text, ['nacionalidad', 'nationality', 'nationaliteit']);
  return {
    full_name: dutchTaxName || valueAfter(text, ['nombre completo', 'nombre y apellidos', 'full name', 'volledige naam', 'naam']) || [firstName, lastName].filter(Boolean).join(' '),
    bsn, phone: dutchPhone || phone, email,
    address: valueAfter(text, ['dirección completa', 'direccion completa', 'address', 'adres']) || [street, number].filter(Boolean).join(' ') || null,
    city: valueAfter(text, ['ciudad', 'localidad', 'municipio', 'city', 'plaats']),
    postal_code: text.match(/\b\d{4}[ ]?[A-Z]{2}\b/i)?.[0] || null,
    country: dutchResidenceCountry || country, nationality: dutchNationality || nationality, iban: text.match(/\b[A-Z]{2}\d{2}(?:[ ]?\d{4}){3,6}\b/)?.[0] || null,
    preferred_language: 'nl', client_type: null, organism: 'Belastingdienst', dates: dutchBirthDate || dates, status: null,
    id_document_number: valueAfter(text, ['dni', 'pasaporte', 'passport', 'id document', 'documento registrado']),
    service_title: null, fee: null, notes: text.trim(), source: 'Extractor determinista',
  };
}

export function extractExplicitClients(sources: string[]): ExplicitClient[] {
  return sources.flatMap((source) => source.split(/(?=(?:^|\n)\s*(?:cliente|client|cliënt)\s*[:#-])/i))
    .map(parseOne).filter((client) => client.full_name.length >= 3);
}

export function reconcileExplicitClientFields<T extends Record<string, any>>(clients: T[], sources: string[]): T[] {
  const extracted = extractExplicitClients(sources);
  return clients.map((client) => {
    const match = extracted.find((candidate) => candidate.full_name.toLowerCase() === String(client.full_name || '').toLowerCase());
    return match ? { ...client, ...Object.fromEntries(Object.entries(match).filter(([, value]) => value !== null && value !== '')) } : client;
  });
}
