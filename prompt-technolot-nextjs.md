# PROMPT POUR CLAUDE CODE — Refonte de Technolot.ca en Next.js

> Copie tout ce qui suit dans Claude Code, depuis un dossier vide (ex: `technolot-site`).

---

Crée un site web complet, moderne et digne d'un prix Awwwards pour **Techno Lot**, une entreprise québécoise spécialisée dans le rachat de lots informatiques et électroniques. Le site remplace l'actuel https://www.technolot.ca/. Tout le contenu est en **français québécois**. Ne me pose pas de questions : exécute tout, puis lance `npm run dev` pour que je puisse voir le résultat.

## 1. Stack technique

- **Next.js 14+ (App Router)** avec TypeScript
- **Tailwind CSS** pour le style
- **Framer Motion** pour les animations
- **lucide-react** pour les icônes
- Composants réutilisables dans `/components`
- Site 100% responsive (mobile-first), optimisé Lighthouse 95+
- SEO complet : metadata française par page, sitemap.xml, robots.txt, JSON-LD `LocalBusiness`

## 2. Logo — OBLIGATOIRE

Télécharge le logo officiel et place-le dans `/public/logo.png` :
```
https://primary.jwwb.nl/public/n/w/v/temp-zfugtfgllutshactjfof/color-logo-no-background-high.png
```
Utilise ce logo tel quel dans le header (cliquable vers l'accueil), le footer et le favicon. Ne le modifie pas, ne le recrée pas.

## 3. Direction artistique — Sombre high-tech premium

- Fond très sombre (#0A0F1C ou similaire), cartes en verre dépoli (glassmorphism subtil)
- Couleur d'accent : **vert émeraude/lime lumineux** (rappel écologique + techno) avec dégradés vers le cyan. Assure-toi que l'accent s'harmonise avec les couleurs du logo
- Typographie : titres en police display moderne (ex: Space Grotesk), texte en Inter — via next/font
- Effets « award winning » : hero avec dégradé animé ou particules subtiles, reveal au scroll (Framer Motion), compteurs animés, hover 3D léger sur les cartes, barre de progression de scroll, curseur des CTA avec glow, marquee de logos/catégories d'équipements
- Micro-interactions partout mais performance d'abord : animations GPU, `prefers-reduced-motion` respecté
- Header sticky avec fond translucide au scroll + menu mobile plein écran animé

## 4. Navigation (garder TOUS les onglets actuels)

Header : **Accueil | À Propos | Contact | Blog | FAQ | SOUMISSION**
- « SOUMISSION » = bouton CTA distinctif (pill lumineux)
- À droite : « Contactez-nous : 514-944-3939 » cliquable (tel:)
- Pages secondaires conservées avec les mêmes URLs : `/consultation`, `/achat-de-lot-description`, `/prise-en-charge-complete`

## 5. Pages et contenu (conserver TOUTES les informations, corriger seulement l'orthographe)

### 5.1 Accueil `/`
- **Hero** : « Techno Lot — Le spécialiste de l'achat de lots informatiques et électroniques au Québec. » + sous-titre « Nous donnons une seconde vie à votre matériel high-tech usagé — et on vous paie pour ça. » + 2 CTA : « Faire une soumission » (→ /contact) et « Comment ça marche » (→ /consultation)
- **Bandeau de confiance animé** (compteurs) : Réponse en 24 h • Ramassage gratuit inclus • Paiement avant notre départ • Unique au Québec
- **Section « Notre service clé en main »** — 3 cartes interactives :
  1. **Rachat de lots électroniques** — Spécialiste de la reprise des produits informatiques et électroniques. Techno Lot offre une seconde vie au matériel high-tech usagé. → lien « Faire une demande » vers `/consultation`
  2. **Soumission personnalisée** — Pour obtenir une soumission de reprise de votre parc informatique ou de tout lot d'équipement électronique neuf ou usagé. → lien « En savoir davantage » vers `/achat-de-lot-description`
  3. **Prise en charge complète** — Lorsque notre offre est acceptée, notre équipe se rend sur place pour emballer, charger et transporter le matériel. → lien « Processus d'achat de votre lot » vers `/prise-en-charge-complete`
- **Section « Qui sommes-nous ? »** : Techno Lot est une entreprise unique au Québec, spécialisée dans le rachat de lots de produits électroniques et informatiques. Nous travaillons main dans la main avec vous pour allonger les cycles de vie de vos équipements afin d'intégrer la durabilité dans votre gestion de matériel électronique. Nous prenons notre responsabilité dans la lutte climatique en sensibilisant nos partenaires et clients et en œuvrant activement à développer des solutions numériques plus vertes, durables et moins gourmandes en énergie et en ressources naturelles.
- **Formulaire de contact** (voir section 6) + **Localisation** avec carte Google Maps intégrée : 3235 Av. de la Gare, Mascouche, QC J7K 3C1

### 5.2 À Propos `/a-propos`
- Titre : « À Propos de Techno Lot »
- Texte : Chez Techno Lot, notre passion pour la technologie et notre engagement envers nos clients nous démarquent de la concurrence. Notre entreprise, unique au Québec, a commencé avec la vision de fournir des solutions de rachat de matériel électronique et informatique de tout genre pour les entreprises. Grâce à notre expertise, notre service personnalisé et notre attention aux détails, nous sommes fiers de devenir la référence en matière de rachat de lots au Québec.
- Le rachat de matériel électronique permet aux entreprises de **vendre à Techno Lot leurs équipements TI obsolètes ou inutilisés**. Ce processus valorise vos actifs informatiques et vos anciens équipements. Qu'il s'agisse de serveurs, d'ordinateurs ou de périphériques, ils peuvent encore avoir une valeur résiduelle. Le rachat vous permet de **récupérer une partie de votre investissement initial** plutôt que de laisser ces actifs s'accumuler et perdre toute valeur.
- Bloc CTA : « Besoin de nos services ? Contactez-nous dès aujourd'hui pour en savoir plus sur nos offres d'achat de lots, de réparation d'appareils électroniques et de recyclage de matériel informatique. » → bouton vers /contact

### 5.3 Contact `/contact`
- Titre : « Soumission » — « Pour une estimation sur mesure du rachat de votre matériel technologique, veuillez remplir ce formulaire ! »
- Formulaire complet (section 6) + coordonnées + carte Google Maps

### 5.4 Blog `/blog`
- Grille de cartes d'articles. Structure en fichiers Markdown ou constantes TS pour faciliter l'ajout d'articles
- Inclure l'article existant `/blog/l-impact-ecologique` (publié le 22 octobre 2024) avec TOUT son contenu :
  - Intro : le rachat de matériel informatique joue un rôle clé dans la réduction de l'empreinte écologique des entreprises. L'industrie technologique génère une quantité importante de déchets électroniques, difficiles à recycler et polluants. Revendre votre matériel TI plutôt que le jeter contribue à diminuer ces déchets en prolongeant la durée de vie des équipements via réutilisation ou reconditionnement. Logique d'économie circulaire : les équipements sont réintégrés dans le cycle de consommation, ce qui réduit la demande de production, la consommation de ressources naturelles et d'énergie. Fabriquer de nouveaux équipements requiert des matières premières (métaux rares, plastiques) et émet du CO2 ; l'exploitation minière a un fort impact environnemental — prolonger la vie des équipements préserve les écosystèmes.
  - Section « Les points négatifs » (les 4 points : valorisation inférieure aux attentes, processus parfois complexe, risques liés à la sécurité des données, rachat limité à certains types d'équipements — reprendre les descriptions complètes du site actuel)
  - Section « Pourquoi choisir Techno Lot pour le rachat de votre matériel électronique ? » (évaluation précise et prix juste, service complet : audit, collecte, effacement sécurisé des données, revalorisation ; économie circulaire ; protection des données avec effacement certifié ; projets pour entreprises de toutes tailles partout au Québec) — **remplace la mention « Evernex » du texte original par « Techno Lot »**
  - Section « Les bonnes pratiques pour optimiser son équipement TI » avec les 4 sous-sections : Faire un audit de vos équipements / Effacer les données de manière sécurisée / Choisir un prestataire de qualité / Préparer vos équipements pour la revente (contenus complets du site actuel)

### 5.5 FAQ `/faq`
- Intro : « Bienvenue sur la page FAQ de Techno Lot, la seule entreprise dans le domaine de l'achat de lots au Québec. Découvrez les réponses aux questions fréquemment posées sur nos services de rachat. »
- **Accordéon animé** avec ces 6 questions/réponses exactes :
  1. Quels types de produits achetez-vous ? → Nous rachetons tout matériel électronique, qu'il soit neuf, usagé et même partiellement fonctionnel.
  2. Quelle est la particularité de Techno Lot ? → Nous sommes la seule entreprise dans le domaine de l'achat de lots électroniques au Québec.
  3. Est-ce que vous venez récupérer le matériel ? → Oui, dans notre offre de rachat, le ramassage de votre lot est inclus.
  4. Quel est le délai de paiement lorsque vous achetez un lot ? → Le paiement sera fait avant que notre équipe quitte le lieu de ramassage.
  5. Où êtes-vous situés ? → Nous sommes situés à Mascouche, Québec, Canada.
  6. Comment puis-je vous contacter ? → Par téléphone au 514-944-3939 ou par courriel à info@technolot.ca.
- Ajoute le JSON-LD `FAQPage` + bloc CTA « Besoin de plus d'informations ? » → /contact

### 5.6 Soumission `/soumission`
- Titre : « Soumission pour rachat de matériel informatique et électronique » — « Nous sommes fiers d'être la seule entreprise dans le domaine au Québec à offrir ce service. Obtenez une estimation gratuite avec une réponse dans un délai de 24 heures. »
- 3 blocs : **Satisfaction garantie** (connaissance approfondie des infrastructures technologiques, évaluation précise, prix juste et compétitif, délai de réponse ultra rapide) / **Estimation gratuite** (sans engagement, remplissez le formulaire et laissez-nous vous faire une offre) / **Rachat de matériel électronique** (téléphones, tablettes, appareils audio et vidéo — confiez-nous votre équipement et recevez une offre juste)
- CTA final « Obtenez une estimation gratuite dès aujourd'hui » → /contact

### 5.7 Consultation `/consultation`
- Titre : « Estimation de votre lot » — **timeline animée en 3 étapes** :
  1. Contactez-nous en remplissant la soumission, décrivez le lot de matériel électronique concerné et joignez des photos et un inventaire complet (ex. document Excel).
  2. Vous recevez notre offre par courriel dans les 24 heures.
  3. Si vous êtes d'accord, nous prenons rendez-vous pour la récupération du lot sans aucuns frais.
- Paragraphe : « Pas le temps de procéder à un inventaire ? Pour les volumes importants, nous pouvons envoyer un expert sur place pour estimer le lot. Il est aussi possible de convenir des modalités pratiques directement sur place. »
- Lien vers « Ce que nous rachetons » (/achat-de-lot-description) + CTA soumission

### 5.8 Ce que nous rachetons `/achat-de-lot-description`
- **Grille de 8 cartes avec icônes** : Ordinateurs et portables / Serveurs / Périphériques de réseau (routeurs, switchs, pare-feu) / Stockage (disques durs, baies, SSD — avec effacement sécurisé des données sensibles) / Équipements de télécommunication (téléphones d'entreprise, visioconférence) / Matériel de bureautique (imprimantes, scanneurs, photocopieurs) / Écrans et moniteurs / + carte spéciale : « Votre lot n'entre dans aucune catégorie ? Pas d'inquiétude : nous rachetons TOUT type de matériel électronique. » (reprendre les descriptions complètes du site actuel pour chaque carte)
- Section « Pourquoi revendre son matériel informatique ? » avec les 4 arguments complets : Optimisation des coûts / Gestion efficace du cycle de vie TI / Sécurisation des données / Adaptation à l'évolution technologique (textes complets du site actuel)

### 5.9 Prise en charge complète `/prise-en-charge-complete`
- Titre : « Prise en charge complète — On s'occupe de tout ! »
- **Timeline verticale animée en 6 étapes** : Validation de l'offre (accord confirmé par le client) → Planification (coordination des dates et logistique) → Visite sur site (déplacement de l'équipe à vos locaux) → Emballage sécurisé (protection du matériel électronique) → Chargement (manipulation et mise en sécurité dans les véhicules) → Transport (acheminement sécurisé vers la destination)
- CTA soumission

## 6. Formulaire de soumission (composant réutilisé sur Accueil et Contact)

Champs : Nom* / Adresse courriel* / Numéro de téléphone* / Message / Inventaire (upload fichier : Excel, PDF, CSV) / Photos (upload multiple d'images) + champ honeypot anti-spam caché
- Validation côté client (messages d'erreur en français) + états de chargement et de succès animés
- Envoi via une API route `/api/soumission` qui envoie un courriel à **info@technolot.ca** avec **Resend** (mets la clé dans `.env.local` avec un placeholder `RESEND_API_KEY=` et documente-le dans le README). Prévoir la gestion des pièces jointes.

## 7. Footer (sur toutes les pages)

- Logo + slogan
- Siège social : 3235 Av. de la Gare, Mascouche, QC J7K 3C1 (lien Google Maps : https://maps.app.goo.gl/stDBgbHi1GQzjWdV6)
- Courriel : info@technolot.ca • Téléphone : 514-944-3939
- Lien Facebook : https://facebook.com/people/Techno-Lot/61568955368416/
- Liens rapides vers toutes les pages
- « © 2024 - 2026 Techno Lot »

## 8. Finition

- Page 404 personnalisée dans le même style
- Images : utilise next/image avec des placeholders de qualité (dégradés/illustrations abstraites tech) — je remplacerai par nos vraies photos ensuite ; garde les images actuelles du site quand les URLs sont disponibles
- Bouton flottant discret « Appelez-nous » sur mobile (tel:514-944-3939)
- README.md en français : comment lancer le projet, ajouter un article de blog, configurer Resend et déployer sur Vercel
- À la fin : vérifie que le build passe (`npm run build`), corrige toute erreur, puis lance `npm run dev`
