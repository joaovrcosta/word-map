import Constants from "expo-constants";

/** Bloqueado no Expo Go; liberado em APK / development build nativo. */
export function isSpeakModeLocked() {
  return Constants.appOwnership === "expo";
}
