export function checkTranslationCap(
  translationsToday: number,
  dailyCap: number,
): { pauseTranslate: boolean; scrapeAllowed: boolean } {
  const atCap = translationsToday >= dailyCap;
  return {
    pauseTranslate: atCap,
    scrapeAllowed: true,
  };
}
