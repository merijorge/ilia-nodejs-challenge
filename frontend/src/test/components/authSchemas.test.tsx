import { describe, expect, it } from "vitest";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  first_name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/),
  last_name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/),
});

describe("Login Schema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "Password123" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "pass" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "" }).success).toBe(false);
  });

  it("only requires non-empty password — strength is enforced at registration", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "a" }).success).toBe(true);
  });
});

describe("Register Schema", () => {
  const valid = {
    email: "user@example.com",
    password: "Password1",
    first_name: "John",
    last_name: "Doe",
  };

  it("accepts valid registration data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects password without uppercase", () => {
    expect(registerSchema.safeParse({ ...valid, password: "password1" }).success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    expect(registerSchema.safeParse({ ...valid, password: "PASSWORD1" }).success).toBe(false);
  });

  it("rejects password without digit", () => {
    expect(registerSchema.safeParse({ ...valid, password: "PasswordX" }).success).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    expect(registerSchema.safeParse({ ...valid, password: "Pa1" }).success).toBe(false);
  });

  it("rejects first name with numbers", () => {
    expect(registerSchema.safeParse({ ...valid, first_name: "John123" }).success).toBe(false);
  });

  it("accepts names with accented characters", () => {
    expect(registerSchema.safeParse({ ...valid, first_name: "André", last_name: "Merino" }).success).toBe(true);
  });
});
