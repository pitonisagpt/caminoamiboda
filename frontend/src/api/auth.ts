import { api } from "./index";
import type { AuthUser } from "../types/auth";

export const authApi = {
  login(email: string, password: string) {
    return api.post<AuthUser>("/auth/login", { email, password });
  },
  me() {
    return api.get<AuthUser>("/auth/me");
  },
  logout() {
    return api.post("/auth/logout");
  },
};
