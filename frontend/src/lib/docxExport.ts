import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';

export interface DocxExportOptions {
  title?: string;
  clientName?: string;
  bsn?: string;
  address?: string;
  content: string;
  language?: 'nl' | 'es';
}

export async function exportDocumentToDocx(options: DocxExportOptions): Promise<void> {
  const {
    title = 'Documento Oficial',
    clientName = 'Cliente',
    bsn = '',
    address = '',
    content,
    language = 'nl',
  } = options;

  const lines = content.split('\n');

  // Convertir líneas de texto en párrafos de Word con jerarquía visual
  const contentParagraphs = lines.map((rawLine) => {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      return new Paragraph({
        text: '',
        spacing: { before: 80, after: 80 },
      });
    }

    // Detectar encabezados o secciones clave
    const isSectionHeading =
      /^(betreft|datum|burgerservicenummer|bsn|motivering|conclusie|rechtsgronden|verzoek|geachte|hoogachtend|handtekening)/i.test(
        line.trim()
      ) || /^[A-Z0-9\s.,:-]{4,40}:$/.test(line.trim());

    if (isSectionHeading) {
      return new Paragraph({
        children: [
          new TextRun({
            text: line,
            bold: true,
            font: 'Calibri',
            size: 22, // 11pt
            color: '0F172A',
          }),
        ],
        spacing: { before: 140, after: 60 },
      });
    }

    return new Paragraph({
      children: [
        new TextRun({
          text: line,
          font: 'Calibri',
          size: 22, // 11pt
          color: '1E293B',
        }),
      ],
      spacing: { before: 40, after: 40, line: 276 }, // 1.15 line spacing
    });
  });

  const doc = new Document({
    title: `${title} - ${clientName}`,
    description: 'Documento legal oficial redactado por NexusGest Advies & Gestoría',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.54 cm / 1 pulgada
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Encabezado Corporativo Oficial
          new Paragraph({
            children: [
              new TextRun({
                text: 'NexusGest Advies & Gestoría B.V.',
                bold: true,
                font: 'Calibri',
                size: 26, // 13pt
                color: '0F172A',
              }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Fiscale Dienstverlening & Juridische Zaken · KvK: 89123847 · Eindhoven\ninfo@nexusgest.nl · www.nexusgest.nl · Postbus 142, 5600 AC Eindhoven',
                font: 'Calibri',
                size: 18, // 9pt
                color: '64748B',
              }),
            ],
            spacing: { after: 280 },
            border: {
              bottom: {
                color: 'CBD5E1',
                space: 8,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),

          // Contenido principal del documento
          ...contentParagraphs,

          // Pie formal
          new Paragraph({
            children: [
              new TextRun({
                text: '\n_________________________________________\nNexusGest Advies & Gestoría B.V. · Documento oficial emitido',
                font: 'Calibri',
                size: 16, // 8pt
                color: '94A3B8',
              }),
            ],
            spacing: { before: 300, after: 60 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanClient = (clientName || 'Cliente').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cleanClient}_${dateStr}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
