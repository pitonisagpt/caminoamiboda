import type { AuthUser } from "../types/auth";
import { api } from "./index";

export interface UserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "operations";
}

export interface UserUpdatePayload {
  full_name?: string;
  role?: "admin" | "operations";
  is_active?: boolean;
  password?: string;
}

export const usersApi = {
  list() {
    return api.get<AuthUser[]>("/users");
  },
  create(data: UserCreatePayload) {
    return api.post<AuthUser>("/users", data);
  },
  update(id: number, data: UserUpdatePayload) {
    return api.put<AuthUser>(`/users/${id}`, data);
  },
};
