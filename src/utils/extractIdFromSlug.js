/**
 * Extracts the ID from a slug string.
 * A slug is typically in the format "some-text-id".
 *
 * @param {string} slug - The slug string.
 * @returns {string} - The extracted ID.
 */

function extractIdFromSlug(slug) {
  const parts = slug.split("-");
  return parts[parts.length - 1];
}
export default extractIdFromSlug;
