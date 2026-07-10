# Techno Lot — Site web

Site officiel de **Techno Lot**, le spécialiste de l'achat de lots informatiques et électroniques au Québec. Construit avec Next.js 14 (App Router), TypeScript, Tailwind CSS et Framer Motion.

## Lancer le projet en local

```bash
npm install
npm run dev
```

Le site est alors accessible à l'adresse [http://localhost:3000](http://localhost:3000).

Pour vérifier la version de production :

```bash
npm run build
npm run start
```

## Structure du projet

```
app/                    Pages (App Router) : /, /a-propos, /contact, /blog,
                        /faq, /soumission, /consultation,
                        /achat-de-lot-description, /prise-en-charge-complete
app/api/soumission/     Route API qui envoie les soumissions par courriel (Resend)
components/             Composants réutilisables (Header, Footer, formulaire,
                        timeline, accordéon, animations…)
lib/site.ts             Coordonnées et informations de l'entreprise
lib/posts.ts            Articles de blogue
public/logo.png         Logo officiel
```

## Ajouter un article de blogue

Ouvrez [`lib/posts.ts`](lib/posts.ts) et ajoutez un nouvel objet au tableau `posts` :

```ts
{
  slug: "mon-nouvel-article",           // deviendra /blog/mon-nouvel-article
  title: "Mon nouvel article",
  date: "2026-07-09",                    // format ISO (pour le sitemap et le SEO)
  dateLabel: "9 juillet 2026",           // affiché sur le site
  excerpt: "Résumé affiché sur la page /blog…",
  readingTime: "4 min de lecture",
  sections: [
    { paragraphs: ["Premier paragraphe…", "Deuxième paragraphe…"] },
    {
      heading: "Un sous-titre",
      level: 2,                          // 2 = grand titre, 3 = petit titre
      paragraphs: ["Texte de la section…"],
      list: [                            // optionnel : liste de points encadrés
        { title: "Point 1", text: "Description…" },
      ],
    },
  ],
}
```

L'article apparaît automatiquement sur `/blog`, dans le sitemap et obtient sa propre page avec les métadonnées SEO.

## Configurer l'envoi de courriels (Resend)

Le formulaire de soumission envoie un courriel à `info@technolot.ca` via [Resend](https://resend.com), avec les pièces jointes (inventaire et photos).

1. Créez un compte gratuit sur [resend.com](https://resend.com).
2. Générez une clé API (menu **API Keys**).
3. Ouvrez le fichier `.env.local` à la racine du projet et collez la clé :

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   CONTACT_EMAIL=info@technolot.ca
   FROM_EMAIL=onboarding@resend.dev
   ```

4. **En production**, vérifiez le domaine `technolot.ca` dans Resend (menu **Domains**) puis remplacez `FROM_EMAIL` par une adresse du domaine, par exemple `soumission@technolot.ca`. Sans domaine vérifié, l'adresse `onboarding@resend.dev` fonctionne uniquement pour des tests.
5. Redémarrez le serveur (`npm run dev`) après toute modification de `.env.local`.

Tant que la clé n'est pas configurée, le formulaire affiche un message d'erreur clair invitant à téléphoner.

## Déployer sur Vercel

1. Poussez le projet sur un dépôt GitHub, GitLab ou Bitbucket.
2. Sur [vercel.com](https://vercel.com), cliquez sur **Add New → Project** et importez le dépôt. Vercel détecte Next.js automatiquement — aucun réglage à changer.
3. Dans **Settings → Environment Variables**, ajoutez :
   - `RESEND_API_KEY`
   - `CONTACT_EMAIL` (`info@technolot.ca`)
   - `FROM_EMAIL` (adresse du domaine vérifié)
4. Cliquez sur **Deploy**.
5. Dans **Settings → Domains**, ajoutez `www.technolot.ca` et suivez les instructions DNS pour pointer le domaine vers Vercel.

## SEO

- Métadonnées françaises propres à chaque page (`title`, `description`, Open Graph)
- `sitemap.xml` et `robots.txt` générés automatiquement (`app/sitemap.ts`, `app/robots.ts`)
- Données structurées JSON-LD : `LocalBusiness` (toutes les pages), `FAQPage` (/faq), `BlogPosting` (articles)
