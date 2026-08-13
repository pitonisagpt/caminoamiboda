export type VehicleType = "car" | "motorcycle";
export type VehicleStatus = "active" | "inactive" | "pending";
export type VehicleLocation = "medellin" | "rionegro" | "carmen_de_viboral";
export type VehicleCategory = "clasico" | "vintage" | "moderno";

export interface VehiclePhoto {
  id: number;
  vehicle_id: number;
  file_name: string;
  original_name: string;
  display_order: number;
  is_visible: boolean;
  url: string;
  created_at: string;
}

export interface VehicleListItem {
  id: number;
  license_plate: string;
  sku: string;
  brand: string;
  model_line: string | null;
  color: string | null;
  year: number | null;
  vehicle_type: VehicleType;
  body_type: string | null;
  category: VehicleCategory | null;
  capacity: number | null;
  display_order: number;
  location: VehicleLocation;
  status: VehicleStatus;
  price_medellin: number | null;
  price_rionegro: number | null;
  score_elegance: number | null;
  score_exclusivity: number | null;
  score_photogeny: number | null;
  score_comfort: number | null;
  score_romance: number | null;
  score_total: number | null;
  pico_y_placa_day: string | null;
  owner_id: number | null;
  owner_name: string | null;
  owner_contact: string | null;
  is_company_owned: boolean;
  is_featured: boolean;
  allowed_locations: string[] | null;
  bride_description: string | null;
  photos: VehiclePhoto[];
}

// Public catalog shape — never carries the license plate or the vehicle
// owner's name/contact info (a real person's phone number). Use this for
// anything rendered on /catalogo or fed by the unauthenticated
// GET /api/vehicles endpoint.
export interface PublicVehicleListItem {
  id: number;
  sku: string;
  brand: string;
  model_line: string | null;
  color: string | null;
  year: number | null;
  vehicle_type: VehicleType;
  body_type: string | null;
  category: VehicleCategory | null;
  capacity: number | null;
  display_order: number;
  location: VehicleLocation;
  status: VehicleStatus;
  price_medellin: number | null;
  price_rionegro: number | null;
  score_elegance: number | null;
  score_exclusivity: number | null;
  score_photogeny: number | null;
  score_comfort: number | null;
  score_romance: number | null;
  score_total: number | null;
  pico_y_placa_day: string | null;
  is_company_owned: boolean;
  is_featured: boolean;
  allowed_locations: string[] | null;
  bride_description: string | null;
  photos: VehiclePhoto[];
}

export interface Vehicle extends VehicleListItem {
  pico_y_placa_hours: string | null;
  pyp_day_override: string | null;
  pyp_valid_from: string | null;
  pyp_valid_to: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleFormData {
  license_plate: string;
  brand: string;
  model_line: string;
  color: string;
  year: string;
  vehicle_type: VehicleType;
  body_type: string;
  category: VehicleCategory | "";
  capacity: string;
  location: VehicleLocation;
  status: VehicleStatus;
  owner_id: string;
  is_company_owned: boolean;
  is_featured: boolean;
  price_medellin: string;
  price_rionegro: string;
  score_elegance: string;
  score_exclusivity: string;
  score_photogeny: string;
  score_comfort: string;
  score_romance: string;
  description: string;
  bride_description: string;
  photo_urls: string; // kept for form register compatibility, not submitted
  pyp_day_override: string;
  pyp_valid_from: string;
  pyp_valid_to: string;
}
