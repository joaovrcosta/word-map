import { Redirect, usePathname, type Href } from "expo-router";

export default function BooksIndex() {
  const pathname = usePathname();
  if (pathname !== "/books") return null;
  return <Redirect href={"/home" as Href} />;
}
