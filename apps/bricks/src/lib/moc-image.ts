/** Derive the Rebrickable CDN thumbnail URL from a MOC ID like "MOC-154803". */
export function mocImageUrl(mocId: string): string {
  return `https://cdn.rebrickable.com/media/mocs/${mocId.toLowerCase()}.jpg`;
}
