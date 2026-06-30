export type LocationType = 'pickup' | 'ceremony' | 'reception' | 'photoshoot' | 'other';

export interface CatalogLocation {
  id: number;
  name: string;
  location_type: LocationType;
  address?: string;
  google_maps_link?: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogLocationFormData {
  name: string;
  location_type: LocationType;
  address: string;
  google_maps_link: string;
  contact_person: string;
  contact_phone: string;
  notes: string;
}
