import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";

type CtaBannerProps = {
  title: string;
  text?: string;
  buttonLabel?: string;
  href?: string;
};

export default function CtaBanner({
  title,
  text,
  buttonLabel = "Faire une soumission",
  href = "/contact",
}: CtaBannerProps) {
  return (
    <section className="container-site py-16">
      <Reveal>
        <div className="glass relative overflow-hidden p-10 text-center sm:p-14">
          <Image
            src="/photos/circuit.jpg"
            alt=""
            fill
            sizes="(min-width: 1280px) 1152px, 100vw"
            className="object-cover opacity-[0.07]"
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(ellipse 60% 90% at 50% -20%, rgba(94,203,51,0.16), transparent)",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-2xl font-bold text-white sm:text-3xl">
              {title}
            </h2>
            {text && (
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">{text}</p>
            )}
            <Link href={href} className="btn-primary mt-8">
              {buttonLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
