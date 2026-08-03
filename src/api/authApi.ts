import { ForgotPasswordRequest, ForgotPasswordResponse } from "@/types/password-reset";
import { RegisterRequest, RegisterResponse } from "../types/auth";
import { apiClient } from "./apiClient";

export async function loginApi(email: string, password: string) {
  const response = await apiClient.post("/api/auth/login", {
    email,
    password,
  });

  return response.data;
}
export async function registerApi(
  data: RegisterRequest
): Promise<RegisterResponse> {
  const response = await apiClient.post("/api/auth/register", data);
  return response.data;
}

export async function reenviarVerificacionEmailApi(email: string) {
  const response = await apiClient.post("/api/auth/reenviar-verificacion-email", {
    email,
  });

  return response.data;
}

export async function forgotPassword(
  request: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post<ForgotPasswordResponse>(
    "/api/auth/forgot-password",
    {
      email: request.email.trim().toLowerCase(),
    }
  );

  return response.data;
}

