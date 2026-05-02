/**
 * Normalizes text by converting to lowercase and removing accents/diacritics.
 * @param {string} text - The text to normalize.
 * @returns {string} - The normalized text.
 */
export const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

/**
 * Checks if a search term is included in a target text, ignoring accents and case.
 * @param {string} target - The text to search within.
 * @param {string} searchTerm - The term to search for.
 * @returns {boolean} - True if match found.
 */
export const matchSearch = (target, searchTerm) => {
  if (!searchTerm) return true;
  return normalizeText(target).includes(normalizeText(searchTerm));
};
