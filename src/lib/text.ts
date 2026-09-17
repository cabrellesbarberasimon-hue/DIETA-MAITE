/** minúsculas y sin tildes/diacríticos, para búsquedas que no dependan del acento. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
