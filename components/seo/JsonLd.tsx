/**
 * Bloc de données structurées (composant serveur). Les « < » sont échappés en
 * < pour qu'aucun texte ne puisse fermer la balise <script>.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
