import type { Config } from "tailwindcss";
import config, { adminContent } from "./tailwind.config";

/* ------------------------------------------------------------------ */
/* Feuille de l'admin (app/admin/admin.css, directive @config) : même   */
/* thème que le site, mais analyse seulement les fichiers de l'admin et */
/* ce qu'ils affichent du reste du code (layout racine, logo). Elle     */
/* reprend donc toutes les classes de l'admin, même celles que le CSS   */
/* public contient déjà : chargée après lui, elle garde leur ordre.     */
/* ------------------------------------------------------------------ */
const adminConfig: Config = {
  ...config,
  content: [...adminContent, "./app/layout.tsx", "./components/site/Logo.tsx", "./lib/site.ts"],
};

export default adminConfig;
