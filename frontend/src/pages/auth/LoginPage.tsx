import { login } from "@/api/auth";
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: data => {
      authLogin(data.access_token, data.user);
      navigate("/dashboard");
    },
    onError: () => {
      toast.error(t("errors.invalidCredentials"));
    },
  });

  const onSubmit = (data: LoginForm) => mutation.mutate(data);

  return (
    <AuthLayout>
      <div className="auth-form-header">
        <h2 className="auth-form-title">{t("auth.loginTitle")}</h2>
        <p className="auth-form-subtitle">{t("auth.loginSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
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
            autoComplete="current-password"
            className={`form-input ${errors.password ? "form-input-error" : ""}`}
            placeholder="••••••••"
          />
          {errors.password && <span className="form-error">{t("errors.required")}</span>}
        </div>

        <Button type="submit" disabled={mutation.isPending} className="auth-submit-btn">
          {mutation.isPending ? t("common.loading") : t("auth.login")}
        </Button>
      </form>

      <p className="auth-switch">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="auth-switch-link">
          {t("auth.signUp")}
        </Link>
      </p>
    </AuthLayout>
  );
};
