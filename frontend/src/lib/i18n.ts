'use client';

export type Language = 'ES' | 'EN' | 'NL' | 'RO' | 'PT' | 'PL';

export const translations = {
  ES: {
    // Hero Section
    hero_title: '¿Acabas de llegar a Holanda?',
    hero_subtitle: 'Tus trámites en Holanda, fáciles',
    cta_get_started: 'Empezar mi trámite',
    cta_book_appointment: 'Reservar una cita',
    services_badge: 'Especialistas en recién llegados & expatriados en Países Bajos',
    value_spanish: '100% en Español',
    value_direct: 'Trámite Directo',
    value_whatsapp: 'Online & WhatsApp',

    // Step Process
    step_process_title: '¿Acabas de llegar a Holanda? Así de fácil trabajamos',
    step_process_subtitle: 'Nos encargamos de la burocracia holandesa para que tú solo disfrutes de tu nueva etapa en Países Bajos.',
    step_1: 'Cuéntanos tu situación',
    step_2: 'Te indicamos qué necesitas',
    step_3: 'Sube tus documentos',
    step_4: 'Nos encargamos de todo',

    // Services Section
    services_title: 'Todos tus trámites en un único lugar',
    services_subtitle: 'Soluciones claras, tarifas transparentes y gestión directa ante los organismos oficiales holandeses.',
    service_mform_title: 'Declaración de la Renta (M-Form / P-Form)',
    service_mform_badge: 'Más Solicitado',
    service_digid_title: 'DigiD (Identidad Digital)',
    service_digid_badge: 'Esencial',
    service_zorgtoeslag_title: 'Zorgtoeslag (Subsidio de Salud)',
    service_zorgtoeslag_badge: 'Hasta 154€/mes',

    // Login Page
    login_title: 'Acceder al Área Cliente',
    login_description: 'Ingresa tus credenciales para acceder al panel personalizado',
    login_email_placeholder: 'email@ejemplo.com',
    login_password_placeholder: 'Contraseña',
    login_remember_me: 'Recordarme',
    login_forgot_password: '¿Olvidaste tu contraseña?',
    login_sign_in: 'Iniciar sesión',

    // FAQ
    faq_title: 'Preguntas Frecuentes',
    faq_search_placeholder: 'Buscar preguntas...',

    // Footer
    footer_rights: '© {year} NexusGest. Todos los derechos reservados.',
    footer_privacy: 'Política de Privacidad',
    footer_terms: 'Términos de Servicio',
    footer_contact: 'Contacto',
  },

  NL: {
    // Hero Section
    hero_title: 'Ben jij net aangekomen in Nederland?',
    hero_subtitle: 'Jouw zaken in Nederland, gemakkelijk',
    cta_get_started: 'Mijn traject starten',
    cta_book_appointment: 'Afspraak maken',
    services_badge: 'Specialisten voor nieuwkomers en expats in Nederland',
    value_dutch: '100% in Nederlands',
    value_direct: 'Direct traject',
    value_whatsapp: 'Online & WhatsApp',

    // Step Process
    step_process_title: 'Ben jij net aangekomen in Nederland? Zo werken we',
    step_process_subtitle: 'We nemen de Nederlandse administratieve rompsloddigheid uit handen, zodat jij alleen maar kunt genieten van je nieuwe fase in Nederland.',
    step_1: 'Vertel ons je situatie',
    step_2: 'Wij vertellen jou wat je nodig hebt',
    step_3: 'Upload je documenten',
    step_4: 'We nemen alles voor je uit handen',

    // Services Section
    services_title: 'Al je zaken op één plek',
    services_subtitle: 'Duidelijke oplossingen, transparante tarieven en directe afhandeling via de Nederlandse instanties.',
    service_mform_title: 'Inkomstenbelasting (M-Form / P-Form)',
    service_mform_badge: 'Meest gevraagd',
    service_digid_title: 'DigiD (Digitale Identiteit)',
    service_digid_badge: 'Essentieel',
    service_zorgtoeslag_title: 'Zorgtoeslag (Gezondheidszorgtoelage)',
    service_zorgtoeslag_badge: 'Tot €154/maand',

    // Login Page
    login_title: 'Toegang tot het klantenportaal',
    login_description: 'Vul uw inloggegevens in om toegang te krijgen tot het persoonlijke dashbord',
    login_email_placeholder: 'email@voorbeeld.nl',
    login_password_placeholder: 'Wachtwoord',
    login_remember_me: 'Onthoud mij',
    login_forgot_password: 'Wachtwoord vergeten?',
    login_sign_in: 'Inloggen',

    // FAQ
    faq_title: 'Veelgestelde vragen',
    faq_search_placeholder: 'Zoek op vraag...',

    // Footer
    footer_rights: '© {year} NexusGest. Alle rechten voorbehouden.',
    footer_privacy: 'Privacybeleid',
    footer_terms: 'Servicevoorwaarden',
    footer_contact: 'Contact',
  },
};

export type TranslationKey = keyof typeof translations.ES;

export const getTranslation = (language: Language, key: TranslationKey, defaultValue?: string): string => {
  const translationsForLang = translations[language];
  return translationsForLang[key] || defaultValue || key;
};

export const languageLabels: Record<Language, string> = {
  ES: 'Español 🇪🇸',
  EN: 'English 🇬🇧',
  NL: 'Nederlands 🇳🇱',
  RO: 'Română 🇷🇴',
  PT: 'Português 🇵🇹',
  PL: 'Polski 🇵🇱',
};
