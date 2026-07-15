import axios from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 15000 });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // The auth bootstrap probe (AuthContext calling /auth/me on mount) 401s
    // for every anonymous visitor by design — public pages (catalog, blog,
    // event share links, contact form) render for logged-out users and
    // already handle this via their own .catch(). Only a *real* session
    // expiring mid-use on an authenticated page should force a redirect.
    const isAuthProbe = typeof err.config?.url === "string" && err.config.url.includes("/auth/me");
    if (err.response?.status === 401 && !isAuthProbe && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
