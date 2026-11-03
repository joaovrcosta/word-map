import { Redirect } from "expo-router";

/** A busca abre como sheet no layout das tabs; esta rota só cobre deep link. */
export default function SearchScreen() {
  return <Redirect href="/home" />;
}
