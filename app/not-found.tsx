import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import HeroBackground from "@/components/HeroBackground";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="container-site relative flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <SearchX className="h-14 w-14 text-accent" strokeWidth={1.5} aria-hidden />
        <p className="mt-6 font-display text-7xl font-bold text-gradient sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
          Cette page est introuvable
        </h1>
        <p className="mt-4 max-w-md text-slate-300">
          La page que vous cherchez a peut-être été déplacée ou n&apos;existe
          plus. Mais bonne nouvelle : votre matériel électronique, lui, a
          toujours de la valeur !
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link href="/" className="btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l&apos;accueil
          </Link>
          <Link href="/contact" className="btn-secondary">
            Faire une soumission
          </Link>
        </div>
      </div>
    </section>
  );
}
