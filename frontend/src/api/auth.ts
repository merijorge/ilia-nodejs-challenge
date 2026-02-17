import type { AuthResponse } from "../types";
import { userApi } from "./axios";

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const register = async (payload: RegisterPayload): Promise<AuthResponse> => {
  const { data } = await userApi.post<AuthResponse>("/auth/register", payload);
  return data;
};

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await userApi.post<AuthResponse>("/auth/login", payload);
  return data;
};

export const getProfile = async () => {
  const { data } = await userApi.get("/user/profile");
  return data;
};

export const updateProfile = async (payload: Partial<{ first_name: string; last_name: string }>) => {
  const { data } = await userApi.put("/user/profile", payload);
  return data;
};
