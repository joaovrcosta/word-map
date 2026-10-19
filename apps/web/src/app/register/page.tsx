"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithGoogle, registerUser, type RegisterData } from "@/actions/auth";
import {
  GoogleSignIn,
  UsernameField,
  UsernameStep,
} from "@/components/google-sign-in";
import { publicErrorMessage } from "@/lib/public-error";
import { User, Mail, Lock } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterData>({
    name: "",
    email: "",
    password: "",
    username: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleSignup, setGoogleSignup] = useState<{
    credential: string;
    email: string;
  } | null>(null);

  const finishGoogle = async (credential: string, chosenUsername?: string) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await loginWithGoogle(credential, chosenUsername);
      if (!result.success) {
        if ("needsUsername" in result) {
          setGoogleSignup({ credential, email: result.email });
          setFormData((prev) => ({
            ...prev,
            username:
              prev.username ||
              result.email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 20),
          }));
          return;
        }
        setError(result.error);
        return;
      }
      router.push("/home");
    } catch (cause) {
      setError(
        publicErrorMessage(
          cause,
          "Não foi possível criar a conta com o Google. Tente novamente em instantes."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await registerUser(formData);
      if (!result.success) {
        setError(
          "error" in result ? result.error : "Não foi possível criar a conta."
        );
        return;
      }
      router.push(
        "/login?message=Conta criada com sucesso! Faça login para continuar."
      );
    } catch (error) {
      setError(
        publicErrorMessage(
          error,
          "Não foi possível criar a conta. Tente novamente em instantes."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-[#e7f8ee] dark:bg-[#143022]">
            <User className="h-6 w-6 text-[#14804a] dark:text-[#7ddea8]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Crie sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Ou{" "}
            <button
              onClick={() => router.push("/login")}
              className="font-medium text-[#14804a] hover:text-[#1eaf68] dark:text-[#7ddea8] dark:hover:text-[#7ddea8]"
            >
              faça login se já tiver uma conta
            </button>
          </p>
          <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
            Escolha um @. É assim que você aparece para as outras pessoas na
            plataforma.
          </p>
        </div>

        {googleSignup ? (
          <UsernameStep
            email={googleSignup.email}
            value={formData.username}
            onChange={(value) => handleInputChange("username", value)}
            pending={isLoading}
            error={error}
            onSubmit={() => finishGoogle(googleSignup.credential, formData.username)}
          />
        ) : (
          <>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div className="mt-8 space-y-4">
            <GoogleSignIn
              text="signup_with"
              disabled={isLoading}
              onCredential={(credential) =>
              finishGoogle(credential, formData.username || undefined)
            }
            />
            <p className="text-center text-xs font-bold uppercase tracking-wide text-gray-400">
              ou cadastre com email
            </p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nome completo
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="pl-10"
                  placeholder="Seu nome completo"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <UsernameField
              value={formData.username}
              onChange={(value) => handleInputChange("username", value)}
              disabled={isLoading}
            />

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Senha
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="pl-10"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="group relative w-full flex justify-center"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                "Criar Conta"
              )}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ao criar uma conta, você concorda com nossos termos de uso e
              política de privacidade.
            </p>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
