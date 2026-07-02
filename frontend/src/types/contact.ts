export type ContactType = 'planner' | 'venue' | 'agency' | 'other';
export type ContactStatus = 'prospect' | 'active' | 'inactive';

export const CONTACT_TYPE_LABEL: Record<ContactType, string> = {
  planner: 'Organizador',
  venue: 'Venue',
  agency: 'Agencia',
  other: 'Otro',
};

export const CONTACT_TYPE_COLOR: Record<ContactType, string> = {
  planner: 'bg-brand-100 text-brand-600',
  venue: 'bg-purple-100 text-purple-700',
  agency: 'bg-blue-100 text-blue-700',
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
  instagram: string | null;
  email: string | null;
  status: ContactStatus;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFormData {
  full_name: string;
  contact_type: ContactType;
  location: string;
  phone: string;
  instagram: string;
  email: string;
  status: ContactStatus;
  notes: string;
}
