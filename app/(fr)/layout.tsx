import LocaleShell from "@/components/LocaleShell";

export default function FrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LocaleShell locale="fr">{children}</LocaleShell>;
}
