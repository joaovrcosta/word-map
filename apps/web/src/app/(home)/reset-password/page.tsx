"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Key, CheckCircle, AlertCircle } from "lucide-react";
import {
  generateResetCode,
  verifyResetCode,
  resetPassword,
} from "@/actions/auth";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<"email" | "code" | "password" | "success">(
    "email"
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await generateResetCode(email);
      if (result.success) {
        setSuccess(result.message);
        setStep("code");
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Erro ao enviar código de reset");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await verifyResetCode(email, code);
      if (result.success) {
        setStep("password");
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(email, code, newPassword);
      if (result.success) {
        setSuccess(result.message);
        setStep("success");
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("Erro ao resetar senha");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setStep("email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset de Senha
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Recupere sua senha com um código enviado por email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === "email" && <Mail className="h-5 w-5" />}
              {step === "code" && <Key className="h-5 w-5" />}
              {step === "password" && <Lock className="h-5 w-5" />}
              {step === "success" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {step === "email" && "Enviar Código"}
              {step === "code" && "Verificar Código"}
              {step === "password" && "Nova Senha"}
              {step === "success" && "Senha Alterada"}
            </CardTitle>
            <CardDescription>
              {step === "email" &&
                "Digite seu email para receber o código de reset"}
              {step === "code" &&
                "Digite o código de 6 dígitos enviado para seu email"}
              {step === "password" && "Digite sua nova senha"}
              {step === "success" && "Sua senha foi alterada com sucesso"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email */}
            {step === "email" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Código"}
                </Button>
              </form>
            )}

            {/* Step 2: Code */}
            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <Label htmlFor="code">Código de Verificação</Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("email")}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Verificando..." : "Verificar Código"}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme sua nova senha"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("code")}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
              <div className="space-y-4 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <p className="text-gray-600">
                  Sua senha foi alterada com sucesso! Agora você pode fazer
                  login com a nova senha.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Resetar Formulário
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/login")}
                    className="flex-1"
                  >
                    Ir para Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => (window.location.href = "/login")}
          >
            Voltar para o Login
          </Button>
        </div>
      </div>
    </div>
  );
}
