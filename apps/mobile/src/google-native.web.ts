export async function signInWithGoogleNative(): Promise<string | null> {
  throw new Error("Não foi possível entrar com o Google");
}

export function googleNativeErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Não foi possível entrar com o Google";
}
