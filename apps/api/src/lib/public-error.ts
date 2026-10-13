const PUBLIC_AUTH_MESSAGES = new Set([
  "Todos os campos são obrigatórios",
  "A senha deve ter pelo menos 6 caracteres",
  "Este email já está em uso",
  "Email e senha são obrigatórios",
  "Email ou senha inválidos",
]);

function looksInternal(message: string): boolean {
  return /prisma|postgres|database|localhost:\d+|invocation|ECONNREFUSED|can't reach|cannot reach|sql|stack|digest/i.test(
    message
  );
}

export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  if (looksInternal(error.message)) {
    return fallback;
  }

  if (PUBLIC_AUTH_MESSAGES.has(error.message)) {
    return error.message;
  }

  return fallback;
}
