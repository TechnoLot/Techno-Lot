import LocaleShell from "@/components/LocaleShell";
import AdTracker from "@/components/tracking/AdTracker";
import AdPixels from "@/components/tracking/AdPixels";

export default function FrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LocaleShell locale="fr">{children}</LocaleShell>
      <AdTracker />
      <AdPixels />
    </>
  );
}
