'use client';

import React, { useState } from 'react';

export default function DocumentosIAPage() {
  const [template, setTemplate] = useState('Belastingdienst - Recurso / Bezwaarschrift');
  const [clientName, setClientName] = useState('Maria Popescu');
  const [bsn, setBsn] = useState('982145672');
  const [address, setAddress] = useState('Strijpsestraat 142, Eindhoven');
  const [details, setDetails] = useState('Solicitamos la revisión del cálculo de ingresos computables para el subsidio Zorgtoeslag correspondiente al ejercicio fiscal anterior.');
  const [language, setLanguage] = useState<'nl' | 'es'>('nl');

  const [generatedLetter, setGeneratedLetter] = useState<string>(`Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: 10 maart 2026
Betreft: Bezwaarschrift / Verzoek tot herziening beschikking Zorgtoeslag
Burgerservicenummer (BSN): 982145672

Geachte heer/mevrouw,

Namens mijn cliënt(e), Maria Popescu, geboren te Roemenië en thans woonachtig aan de Strijpsestraat 142, 5616 GP te Eindhoven, dien ik hierbij een formeel verzoek tot herziening in aangaande de toegekende zorgtoeslag.

Cliënt(e) heeft geconstateerd dat het door uw dienst gehanteerde toetsingsinkomen niet in overeenstemming is met de daadwerkelijk genoten inkomsten uit tegenwoordige arbeid. Bijgaand treft u de relevante jaaropgaven en salarisstroken ter staving van dit standpunt.

Op grond van vorenstaande verzoeken wij u vriendelijk doch dringend de beschikking te herzien en het recht op zorgtoeslag opnieuw vast te stellen met inachtneming van het gecorrigeerde verzamelinkomen.

Wij zien een schriftelijke bevestiging van goede ontvangst van dit schrijven met belangstelling tegemoet.

Met vriendelijke groet,

NexusGest Advies & Gestoría
Rony P. - Senior Consultant Fiscaliteit
KvK: 89123847 · Eindhoven`);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          client_name: clientName,
          bsn,
          address,
          case_details: details,
          language,
        }),
      });
      const data = await res.json();
      if (data.letter) {
        setGeneratedLetter(data.letter);
      }
    } catch {
      // Si falla, el fallback ya está visible
    } finally {
      setIsGenerating(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Asistente y Generador de Cartas Oficiales IA</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Redacción legal neerlandesa para Belastingdienst, HollandZorg, CAK y autorizaciones DigiD.
          </p>
        </div>
        <span className="px-3 py-1 bg-secondary text-white text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-sm">
          <span className="material-symbols-outlined text-[16px]">edit_document</span>
          <span>Plantillas Neerlandesas Oficiales</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings / Controls (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tune</span>
            <span>Parámetros del Documento</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Tipo de Plantilla Oficial</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
              >
                <option>Belastingdienst - Recurso / Bezwaarschrift</option>
                <option>HollandZorg / CAK - Exención Seguro Médico</option>
                <option>Belastingdienst - Cambio de Cuenta Bancaria (Rekeningnummer)</option>
                <option>Autorización de Representación y DigiD Machtiging</option>
              </select>
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Idioma del Escrito</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('nl')}
                  className={`flex-1 h-8 rounded font-semibold transition-all ${
                    language === 'nl' ? 'bg-secondary text-white' : 'bg-surface border border-outline-variant text-outline'
                  }`}
                >
                  Neerlandés Formal (Oficial)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('es')}
                  className={`flex-1 h-8 rounded font-semibold transition-all ${
                    language === 'es' ? 'bg-secondary text-white' : 'bg-surface border border-outline-variant text-outline'
                  }`}
                >
                  Español (Copia Cliente)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">BSN</label>
                <input
                  type="text"
                  value={bsn}
                  onChange={(e) => setBsn(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Dirección NL</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Motivo / Hechos del Caso</label>
              <textarea
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full p-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-10 mt-2 bg-primary text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">
              {isGenerating ? 'hourglass_top' : 'auto_awesome'}
            </span>
            <span>{isGenerating ? 'Redactando con IA...' : 'Generar Carta con IA'}</span>
          </button>
        </div>

        {/* Live Document Preview (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-container mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-lg">description</span>
                <span className="font-bold text-xs text-on-surface">Vista Previa del Documento</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="h-8 px-3 rounded border border-outline-variant hover:bg-surface text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'content_copy'}</span>
                  <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 rounded bg-secondary hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Imprimir / PDF</span>
                </button>
              </div>
            </div>

            <div className="p-8 bg-white border border-surface-container rounded-lg shadow-inner font-mono-data text-xs text-slate-800 leading-relaxed whitespace-pre-line min-h-[420px]">
              {generatedLetter}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs text-outline">
            <span>Formato oficial conforme a la legislación neerlandesa (Algemene wet bestuursrecht - Awb)</span>
            <span className="font-mono-data">NexusGest v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
