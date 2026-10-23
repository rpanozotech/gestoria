export type ExplicitClient = {
  id?: string;
  full_name: string;
  bsn?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  country?: string;
  nationality?: string;
  iban?: string;
  id_document_number?: string;
  dates?: string;
  notes?: string;
  status?: string;
  digid_status?: string;
  verifiedFields?: string[];
  fieldIssues?: Record<string, string>;
}

const valueAfter = (text: string, labels: string[]) => {
  const pattern = new RegExp(`(?:^|\\n)[ \\t]*(?:${labels.join('|')})[ \\t]*(?:[:#-][ \\t]*)?(?:\\n[ \\t]*)?([^\\n;|,]{1,120})`, 'im');
  return text.match(pattern)?.[1]?.trim() || '';
};

function normalizeTableText(text: string): string {
  return text.replace(/\r/g, '').replace(/^\s*\|\s*-+\s*\|\s*$/gm, '').replace(/^\s*\|\s*$/gm, '')
    .replace(/^\s*\|\s?/gm, '').replace(/\s*\|\s*$/gm, '').replace(/\n{2,}/g, '\n');
}

function parseOne(text: string): ExplicitClient {
  text = normalizeTableText(text);
  const dutchTaxName = text.match(/Persoonlijke gegevens\s+Naam\s+(.+?)\s+Geboortedatum\b/i)?.[1]?.trim() || '';
  const dutchBirthDate = text.match(/\bGeboortedatum\s+(\d{2}-\d{2}-\d{4})\b/i)?.[1] || '';
  const dutchPhone = text.match(/\bTelefoonnummer\s+([+\d][\d\s().-]{7,18}?)(?=\s+Land waarin\b)/i)?.[1]?.trim() || '';
  const dutchResidenceCountry = text.match(/\bLand waarin u op 1 januari\s+\d{4}\s+woonde\s+([A-Za-zÀ-ÿ-]+)/i)?.[1]?.trim() || '';
  const dutchNationality = text.match(/\bNationaliteit\s*\(kies het land\)\s+([A-Za-zÀ-ÿ-]+)\s+Was u\b/i)?.[1]?.trim() || '';
  const email = text.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || '';
  const bsn = text.match(/(?:bsn|burgerservicenummer)\D{0,20}(\d{8,9})/i)?.[1] || text.match(/\b\d{9}\b/)?.[0] || '';
  const phone = text.match(/(?:\+31|\+34|0031|0034|06)[\d\s().-]{7,16}/)?.[0]?.trim() || '';
  const firstName = valueAfter(text, ['nombre de pila', 'nombre', 'first name', 'voornaam']);
  const lastName = valueAfter(text, ['apellidos', 'apellido', 'surname', 'last name', 'achternaam']);
  const full_name = dutchTaxName || valueAfter(text, ['nombre completo', 'nombre y apellidos', 'full name', 'volledige naam', 'naam']) || [firstName, lastName].filter(Boolean).join(' ');
  const street = valueAfter(text, ['calle', 'straat', 'street']);
  const number = valueAfter(text, ['número', 'numero', 'huisnummer', 'number']);
  const address = valueAfter(text, ['dirección completa', 'direccion completa', 'address', 'adres']) || [street, number].filter(Boolean).join(' ');
  const city = valueAfter(text, ['ciudad', 'localidad', 'municipio', 'city', 'plaats']);
  const postal_code = text.match(/\b\d{4}[ ]?[A-Z]{2}\b/i)?.[0] || '';
  const id_document_number = valueAfter(text, ['dni', 'pasaporte', 'passport', 'id document']);
  const dates = valueAfter(text, ['fecha de nacimiento', 'fecha nacimiento', 'date of birth', 'geboortedatum']);
  const country = valueAfter(text, ['país de residencia', 'pais de residencia', 'country', 'land']) || (/domicilio registrado en países bajos/i.test(text) ? 'Países Bajos' : valueAfter(text, ['país de nacimiento', 'pais de nacimiento']));
  const nationality = valueAfter(text, ['nacionalidad', 'nationality', 'nationaliteit']);
  return { full_name, bsn, phone: dutchPhone || phone, email, address, city, postal_code, country: dutchResidenceCountry || country, nationality: dutchNationality || nationality, dates: dutchBirthDate || dates, id_document_number, notes: text.trim() };
}

export function extractExplicitClients(sources: string[]): ExplicitClient[] {
  return sources.flatMap((source) => source.split(/\n\s*\n|(?:^|\n)\s*(?:cliente|client|cliënt)\s*[:#-]/i))
    .map(parseOne)
    .filter((client) => client.full_name.length >= 3);
}
