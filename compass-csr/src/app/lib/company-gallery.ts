const GALLERY_KEY = "compass_company_gallery_v1";

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  fileName: string;
  caption: string;
  addedAt: string;
}

export function loadGalleryPhotos(): GalleryPhoto[] {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGalleryPhotos(photos: GalleryPhoto[]) {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(photos));
  } catch {
    // fail silently
  }
}

export function addGalleryPhotos(photos: GalleryPhoto[]): GalleryPhoto[] {
  const all = [...photos, ...loadGalleryPhotos()];
  saveGalleryPhotos(all);
  return all;
}
