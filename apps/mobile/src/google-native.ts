import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

let configured = false;

export async function signInWithGoogleNative(): Promise<string | null> {
  if (!webClientId) {
    throw new Error("Login com Google não está configurado.");
  }
  if (!configured) {
    GoogleSignin.configure({ webClientId });
    configured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== "success") return null;
  if (!response.data.idToken) {
    throw new Error("Não foi possível entrar com o Google");
  }
  return response.data.idToken;
}

export function googleNativeErrorMessage(error: unknown) {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) return "";
    if (error.code === statusCodes.IN_PROGRESS) return "O login com Google já está em andamento.";
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return "O Google Play Services não está disponível neste aparelho.";
    }
    if (error.code === "10") {
      return "O Google recusou este app. No cliente Android, o pacote precisa ser app.wordmap e o SHA-1 E5:AC:84:91:A0:BE:A7:6D:18:F0:35:F6:98:5A:DB:BE:BF:52:39:25.";
    }
  }
  const message = error instanceof Error ? error.message : "";
  if (/RNGoogleSignin|could not be found|TurboModule/i.test(message)) {
    return "O Expo Go não entra com o Google. Feche o Expo Go e abra o app Word Map instalado no emulador.";
  }
  return message || "Não foi possível entrar com o Google";
}
