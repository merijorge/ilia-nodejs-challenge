import { register as registerUser } from "@/api/auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password strength"),
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

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: data => {
      authLogin(data.access_token, data.user);
      navigate("/dashboard");
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 409) {
        toast.error(t("errors.emailTaken"));
      } else {
        toast.error(t("errors.generic"));
      }
    },
  });

  const onSubmit = (data: RegisterForm) => mutation.mutate(data);

  return (
    <AuthLayout>
      <div className="auth-form-header">
        <h2 className="auth-form-title">{t("auth.registerTitle")}</h2>
        <p className="auth-form-subtitle">{t("auth.registerSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">{t("auth.firstName")}</label>
            <input
              {...register("first_name")}
              type="text"
              autoComplete="given-name"
              className={`form-input ${errors.first_name ? "form-input-error" : ""}`}
              placeholder="John"
            />
            {errors.first_name && <span className="form-error">{t("errors.required")}</span>}
          </div>

          <div className="form-field">
            <label className="form-label">{t("auth.lastName")}</label>
            <input
              {...register("last_name")}
              type="text"
              autoComplete="family-name"
              className={`form-input ${errors.last_name ? "form-input-error" : ""}`}
              placeholder="Doe"
            />
            {errors.last_name && <span className="form-error">{t("errors.required")}</span>}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">{t("auth.email")}</label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className={`form-input ${errors.email ? "form-input-error" : ""}`}
            placeholder="you@example.com"
          />
          {errors.email && <span className="form-error">{t("errors.invalidEmail")}</span>}
        </div>

        <div className="form-field">
          <label className="form-label">{t("auth.password")}</label>
          <input
            {...register("password")}
            type="password"
            autoComplete="new-password"
            className={`form-input ${errors.password ? "form-input-error" : ""}`}
            placeholder="••••••••"
          />
          {errors.password && <span className="form-error">{t("errors.passwordStrength")}</span>}
        </div>

        <Button type="submit" disabled={mutation.isPending} className="auth-submit-btn">
          {mutation.isPending ? t("common.loading") : t("auth.register")}
        </Button>
      </form>

      <p className="auth-switch">
        {t("auth.hasAccount")}{" "}
        <Link to="/login" className="auth-switch-link">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthLayout>
  );
};
