import {
  create,
  isCancel,
} from "axios";
import {
  emitUnauthorized,
} from "../auth/authEvents";
import { getToken } from "../auth/authStorage";
import { ENV } from "../constants/env";

export const apiClient = create({
  baseURL: ENV.API_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    } else if (config.headers.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  async (error) => {
    return await Promise.reject(error);
  }
);

function isAuthPublicEndpoint(
  url?: string
): boolean {
  if (!url) {
    return false;
  }

  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes(
      "/api/auth/reenviar-verificacion-email"
    ) ||
    url.includes("/api/auth/verify-email") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password")
  );
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (isCancel(error)) {
      return await Promise.reject(error);
    }

    const status =
      error?.response?.status;

    const url =
      error?.config?.url;

    const data =
      error?.response?.data;

    if (
      status === 401 &&
      !isAuthPublicEndpoint(url) &&
      !data?.requiereVerificacionEmail
    ) {
      await emitUnauthorized();
    }

    return await Promise.reject(error);
  }
);