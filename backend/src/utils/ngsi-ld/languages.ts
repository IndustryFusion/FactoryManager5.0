// IFX stores translation languages by name ("English"); NGSI-LD and every
// consumer downstream expect BCP 47 codes ("en").
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en',
  german: 'de',
  deutsch: 'de',
  french: 'fr',
  spanish: 'es',
  italian: 'it',
  dutch: 'nl',
  portuguese: 'pt',
  polish: 'pl',
  czech: 'cs',
  danish: 'da',
  swedish: 'sv',
  norwegian: 'no',
  finnish: 'fi',
  turkish: 'tr',
  russian: 'ru',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  arabic: 'ar',
  hindi: 'hi',
  kannada: 'kn',
};

// A two- or three-letter code (optionally with a region, "en-GB") is already BCP 47.
const BCP47 = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

// Returns the code, or undefined when the name is unknown so the caller can warn.
export const languageCode = (language: unknown): string | undefined => {
  if (typeof language !== 'string' || language === '') return undefined;
  if (BCP47.test(language)) return language;
  return LANGUAGE_CODES[language.trim().toLowerCase()];
};

export const languageName = (code: string): string => {
  const name = Object.keys(LANGUAGE_CODES).find((n) => LANGUAGE_CODES[n] === code);
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : code;
};
