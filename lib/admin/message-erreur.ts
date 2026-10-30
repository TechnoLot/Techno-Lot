/**
 * Message d'erreur d'une route admin à afficher dans le navigateur : le
 * message générique du serveur (`error`) et sa référence (`ref`, à donner pour
 * retrouver le détail dans le journal). Jamais de détail technique : le
 * serveur ne l'envoie plus (check 20). Partagé serveur / client (aucun
 * `"use client"`, aucun secret).
 */
export function messageErreurApi(corps: unknown, statut: number): string {
  const c = (corps && typeof corps === "object" ? corps : {}) as { error?: unknown; ref?: unknown };
  const message = typeof c.error === "string" && c.error.trim() ? c.error.trim() : `Erreur ${statut}.`;
  return typeof c.ref === "string" && c.ref && !message.includes(c.ref) ? `${message} (réf. ${c.ref})` : message;
}
