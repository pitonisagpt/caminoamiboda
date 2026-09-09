export type ContactType = 'planner' | 'venue' | 'agency' | 'photographer' | 'decorator' | 'other';
export type ContactStatus = 'prospect' | 'active' | 'inactive';

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  planner: 'Organizador',
  venue: 'Venue',
  agency: 'Agencia',
  photographer: 'Fotógrafo',
  decorator: 'Decoración',
  other: 'Otro',
};

export const CONTACT_TYPE_COLOR: Record<ContactType, string> = {
  planner: 'bg-brand-100 text-brand-600',
  venue: 'bg-purple-100 text-purple-700',
  agency: 'bg-blue-100 text-blue-700',
  photographer: 'bg-pink-100 text-pink-700',
  decorator: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-600',
};

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  inactive: 'Inactivo',
};

export const CONTACT_STATUS_COLOR: Record<ContactStatus, string> = {
  prospect: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
};

export interface Contact {
  id: number;
  full_name: string;
  contact_type: ContactType;
  location: string | null;
  phone: string | null;
  whatsapp_username: string | null;
  instagram: string | null;
  website_url: string | null;
  email: string | null;
  status: ContactStatus;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  total_events: number;
}

export interface ContactFormData {
  full_name: string;
  contact_type: ContactType;
  location: string;
  phone: string;
  whatsapp_username: string;
  instagram: string;
  website_url: string;
  email: string;
  status: ContactStatus;
  notes: string;
}
