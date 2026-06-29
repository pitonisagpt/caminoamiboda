export type UserRole = "admin" | "operations";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}
