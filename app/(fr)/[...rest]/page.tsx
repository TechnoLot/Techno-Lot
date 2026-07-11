import { notFound } from "next/navigation";

/** Capture les URL françaises inconnues pour afficher la page 404 stylée. */
export default function CatchAll() {
  notFound();
}
