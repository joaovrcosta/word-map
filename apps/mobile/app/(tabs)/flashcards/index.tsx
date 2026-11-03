import { Redirect } from "expo-router";

/** Hub de Treino removido da tab bar — Review é a home. */
export default function TrainingScreen() {
  return <Redirect href="/home" />;
}
