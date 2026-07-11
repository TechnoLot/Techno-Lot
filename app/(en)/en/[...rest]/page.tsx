import { notFound } from "next/navigation";

/** Capture les URL anglaises inconnues pour afficher la page 404 stylée. */
export default function CatchAll() {
  notFound();
}
