import { api } from "./index";
import type { AuthUser, TokenResponse } from "../types/auth";

export const authApi = {
  login(email: string, password: string) {
    return api.post<TokenResponse>("/auth/login", { email, password });
  },
  me() {
    return api.get<AuthUser>("/auth/me");
  },
};
