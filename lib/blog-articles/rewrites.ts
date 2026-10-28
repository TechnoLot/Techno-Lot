import type { Locale } from "@/lib/i18n";

/**
 * Articles réécrits localement à la même URL qu'un article Soro.
 *
 * Un article de cette liste remplace la version Soro partout (liste du blogue,
 * page de l'article, plan du site, langue, consolidation) : voir lib/posts.ts.
 * La date de publication d'origine est conservée (isoDate de Soro) et la date
 * de mise à jour alimente dateModified (JSON-LD) et le plan du site.
 *
 * Le corps est du HTML simple (p, h2, h3, ul, ol, li, a, strong) : il passe par
 * le même assainissement que les articles Soro (ancres des h2, liens internes).
 */
export type LocalRewrite = {
  slug: string;
  lang: Locale;
  title: string;
  excerpt: string;
  /** Date de publication d'origine (article Soro). */
  isoDate: string;
  /** Date de la réécriture (ISO). */
  updatedIsoDate: string;
  image: string;
  imageAlt: string;
  html: string;
};

export const LOCAL_REWRITES: LocalRewrite[] = [
  {
    slug: "rachat-de-portable-equipements-en-lot",
    lang: "fr",
    title: "Combien vaut un lot d'ordinateurs portables usagés ?",
    excerpt:
      "Génération, état, quantité, chargeurs, verrous et données : ce qui détermine la valeur d'un lot de portables usagés, et comment obtenir une offre juste pour votre entreprise.",
    isoDate: "2026-07-26T00:09:37.763+00:00",
    updatedIsoDate: "2026-10-28",
    // La couverture Soro montrait des téléphones : photo de portables du site
    image: "/photos/bureau.jpg",
    imageAlt: "Plusieurs ordinateurs portables ouverts sur une table de travail",
    html: `
<p>Un placard rempli de portables remplacés lors du dernier renouvellement, quelques dizaines d'appareils rapportés par des employés partis, un lot complet laissé par un projet terminé : tôt ou tard, chaque entreprise se demande ce que valent ses ordinateurs portables usagés. La question est légitime, mais la réponse honnête commence toujours de la même façon : ça dépend du lot.</p>
<p>Deux lots qui semblent semblables sur papier peuvent avoir une valeur très différente une fois examinés. Ce guide explique les critères que le marché de la revente regarde en général, ce que vous pouvez faire pour obtenir une offre juste, et pourquoi aucun acheteur sérieux ne peut vous annoncer un prix avant d'avoir évalué votre matériel.</p>

<h2>Ce qui détermine la valeur d'un lot de portables</h2>
<p>La valeur de revente d'un portable d'entreprise ne se résume pas à son âge. Plusieurs facteurs s'additionnent, et c'est leur combinaison qui fait la différence. Voici les repères généraux du marché.</p>

<h3>La génération et la configuration</h3>
<p>Le processeur est souvent le premier élément regardé, parce qu'il indique la génération de l'appareil et sa capacité à faire tourner les systèmes d'exploitation et les logiciels actuels. Un portable encore pris en charge par les versions récentes de son système d'exploitation intéresse beaucoup plus d'acheteurs qu'un appareil qui ne peut plus être mis à jour.</p>
<p>Viennent ensuite la mémoire vive, le type et la capacité du stockage (un SSD est généralement plus recherché qu'un disque mécanique), la taille et la résolution de l'écran, ainsi que certaines options comme un écran tactile ou une connectivité cellulaire. Les gammes conçues pour les entreprises, plus robustes et plus faciles à réparer, se revendent en général mieux que les modèles grand public.</p>

<h3>L'état physique et fonctionnel</h3>
<p>Un appareil qui démarre, dont l'écran, le clavier, le pavé tactile et les ports fonctionnent, ne se compare pas à un appareil qui ne s'allume plus. Les marques d'usure ont aussi leur poids : rayures, coins enfoncés, charnières lâches, écran fissuré ou pixels défectueux. Une batterie qui ne tient plus la charge est un défaut courant qui influence l'offre sans rendre l'appareil invendable.</p>
<p>Les portables partiellement fonctionnels ne sont pas sans valeur pour autant. Même un appareil qui ne démarre pas peut contenir des composants réutilisables. Ce qui compte, c'est de savoir dans quel état se trouve chaque appareil, pour que l'évaluation reflète la réalité.</p>

<h3>L'homogénéité et la quantité</h3>
<p>Un lot de modèles identiques ou très proches est plus facile à tester, à reconditionner et à revendre qu'un mélange d'appareils de marques, d'âges et de configurations variés. Pour un acheteur, quarante portables du même modèle représentent un travail plus prévisible que quarante appareils tous différents.</p>
<p>La quantité joue aussi : un lot important justifie plus facilement le temps de tri et de reconditionnement. Cela dit, chez Techno Lot, il n'y a pas de minimum : un petit lot mérite lui aussi d'être évalué.</p>

<h3>Les chargeurs et les accessoires</h3>
<p>Un portable accompagné de son chargeur d'origine est prêt à être réutilisé ; sans chargeur, il faut en trouver un compatible, ce qui réduit l'intérêt pour l'acheteur. Les stations d'accueil, les sacoches et les autres accessoires peuvent aussi compter, surtout lorsqu'ils sont en bon état et en nombre suffisant pour accompagner les appareils. Regroupez-les avec le lot plutôt que de les jeter séparément.</p>

<h3>Les verrous BIOS et de gestion des appareils</h3>
<p>C'est l'un des points les plus souvent négligés, et l'un des plus lourds de conséquences. Un portable protégé par un mot de passe BIOS, encore inscrit dans une solution de gestion des appareils (MDM, inscription automatique de l'entreprise) ou lié à un compte par un verrou d'activation peut être impossible à réinitialiser pour l'acheteur. Dans bien des cas, un appareil verrouillé ne peut être revendu que pour ses pièces.</p>
<p>Avant la revente, demandez à votre équipe TI de retirer les mots de passe BIOS, de désinscrire les appareils de vos outils de gestion et de dissocier les comptes. Si ce n'est pas possible pour tout le lot, indiquez clairement quels appareils restent verrouillés.</p>

<h3>Les données et le stockage</h3>
<p>La présence du disque a aussi un effet : un portable vendu sans stockage doit être complété avant d'être remis en service. Plutôt que de retirer ou de détruire les disques vous-même, sachez que Techno Lot procède à l'effacement sécurisé des données et remet un certificat de destruction des données, sans frais. Les disques gardent ainsi leur valeur, et vos informations restent protégées.</p>

<h2>Pourquoi aucun prix ne peut être annoncé sans évaluation</h2>
<p>Il est tentant de chercher un prix par appareil sur Internet ou de demander un chiffre au téléphone. Le problème, c'est qu'un chiffre donné sans voir le lot n'engage personne et risque de décevoir. Deux portables du même modèle peuvent avoir un processeur, une mémoire ou un état très différents ; un verrou oublié ou des chargeurs manquants peuvent changer l'offre d'un lot entier.</p>
<p>La demande bouge aussi : un modèle recherché aujourd'hui peut l'être moins dans quelques mois, à mesure que de nouvelles générations arrivent sur le marché de l'occasion. C'est pourquoi, chez Techno Lot, le prix dépend toujours de l'évaluation du matériel. Une offre fondée sur une description précise vaut mieux qu'une promesse vague.</p>

<h2>Comment obtenir une offre juste pour vos portables</h2>

<h3>Préparez une liste claire</h3>
<p>Pour chaque modèle, notez la marque et le modèle exact, la quantité, le processeur, la mémoire, le stockage et l'état général. Un simple tableur suffit. Si vous ne connaissez pas tous les détails, fournissez ce que vous avez : l'important est que la liste corresponde à ce qui se trouve réellement sur place. Notre guide pour <a href="/blog/preparer-appareils-ramassage-en-lot">préparer l'inventaire de votre parc informatique</a> détaille les colonnes utiles.</p>

<h3>Décrivez l'état sans l'embellir</h3>
<p>Utilisez des termes simples et constants : fonctionnel, démarre, non testé, endommagé, pour pièces. Une description honnête évite les surprises à l'inspection et accélère le traitement du dossier.</p>

<h3>Ajoutez quelques photos</h3>
<p>Une photo de l'étiquette du modèle, une vue d'ensemble du lot et quelques gros plans des défauts visibles aident à préciser l'évaluation, surtout pour les lots importants.</p>

<h3>Rassemblez ce qui accompagne les appareils</h3>
<p>Chargeurs, stations d'accueil et accessoires : mettez-les avec le lot et indiquez leur nombre dans votre liste.</p>

<h2>Comment se déroule le rachat avec Techno Lot</h2>
<p>Techno Lot rachète le matériel informatique des entreprises, qu'il soit neuf, usagé ou partiellement fonctionnel. Le processus est simple :</p>
<ul>
<li><strong>Une offre dans les 24 heures</strong> après réception de la description de votre lot, établie selon l'évaluation du matériel.</li>
<li><strong>Un ramassage sans frais et sans minimum</strong> partout au Québec : notre équipe emballe, charge et transporte les appareils.</li>
<li><strong>Un paiement en deux temps</strong> : la moitié au ramassage, le solde après l'inspection (15 jours ouvrables au maximum). Si l'état réel diffère de la description, l'offre est ajustée.</li>
<li><strong>L'effacement sécurisé des données</strong> avec certificat de destruction, sans frais.</li>
<li><strong>Le réemploi ou le recyclage</strong> : les appareils revendables trouvent une seconde vie, et les composants des autres sont réemployés ou recyclés.</li>
</ul>
<p>Pour en savoir plus, consultez notre page sur le <a href="/rachat-ordinateurs-portables-en-lot">rachat d'ordinateurs portables en lot</a>, ou <a href="/soumission">faites une soumission</a> avec la liste de vos appareils.</p>

<h2>En résumé</h2>
<p>La valeur d'un lot de portables usagés dépend de la génération et de la configuration des appareils, de leur état, de l'homogénéité du lot, des chargeurs et accessoires fournis, de l'absence de verrous et de la présence du stockage. Personne ne peut vous donner un prix fiable sans évaluer le matériel. Une liste claire, quelques photos et des appareils déverrouillés restent la meilleure façon d'obtenir une offre juste.</p>
`,
  },
  {
    slug: "preparer-appareils-ramassage-en-lot",
    lang: "fr",
    title: "Préparer l'inventaire de votre parc informatique avant la revente",
    excerpt:
      "Type, modèle, quantité, état, numéros de série, verrous, accessoires et photos : comment préparer un inventaire clair de votre parc informatique avant de le revendre en lot.",
    isoDate: "2026-10-06T02:01:33.379+00:00",
    updatedIsoDate: "2026-10-28",
    image:
      "https://afocirmbqdxnkyescnev.supabase.co/storage/v1/object/public/featured-images/4d0c16ae-f3cd-4be3-9396-246512892dca/workflows/9f97c35b-c4eb-4e08-b26d-b73362c038f6.webp",
    imageAlt: "Ordinateur portable, tablette, téléphone et chargeur préparés sur un bureau à côté de boîtes",
    html: `
<p>Un renouvellement de parc informatique laisse souvent derrière lui une salle pleine d'appareils : portables, tours, écrans, serveurs, équipements réseau, câbles. Avant de vendre ce matériel, une étape fait toute la différence : savoir exactement ce que vous avez. Un inventaire clair vous donne une vue d'ensemble, permet à l'acheteur de préparer une offre plus précise et évite qu'un appareil soit oublié au moment du ramassage.</p>
<p>Pas besoin d'un logiciel de gestion des actifs pour y arriver. Pour la plupart des entreprises, un tableur bien structuré, quelques photos et une vérification sur place suffisent. Voici comment vous y prendre.</p>

<h2>Définir le but de l'inventaire</h2>
<p>Une liste tenue pour le soutien informatique contient souvent l'utilisateur assigné, la garantie ou les logiciels installés. Pour la revente, ces détails sont inutiles. Ce qui compte, c'est l'identité de l'appareil, son état, la quantité, l'emplacement et tout ce qui influence la valeur ou la manutention.</p>
<p>Fixez une date de fin pour la liste et confiez-la à une seule personne. Ainsi, un appareil réaffecté, déplacé ou jeté entre-temps ne restera pas dans le tableur par erreur.</p>

<h2>Quoi noter pour chaque appareil</h2>
<p>Prévoyez une ligne par modèle (ou par appareil lorsque c'est utile), avec les colonnes suivantes :</p>
<ul>
<li><strong>Type</strong> : portable, ordinateur de bureau, écran, serveur, stockage, switch, téléphone IP, tablette, imprimante, etc.</li>
<li><strong>Marque et modèle</strong> : le nom exact inscrit sur l'étiquette plutôt qu'une description vague. « Portable 14 pouces » ne dit pas grand-chose ; le numéro de modèle complet, oui.</li>
<li><strong>Quantité</strong> : surtout pour les appareils identiques et les accessoires.</li>
<li><strong>Configuration</strong> : processeur, mémoire et stockage pour les ordinateurs ; nombre de disques, alimentations et rails pour les serveurs ; nombre et type de ports pour les switchs.</li>
<li><strong>État</strong> : fonctionnel, démarre, non testé, endommagé ou pour pièces.</li>
<li><strong>Emplacement</strong> : étage, local, entrepôt ou succursale.</li>
<li><strong>Données</strong> : stockage présent ou non.</li>
</ul>

<h3>Les numéros de série, au besoin</h3>
<p>Pour un lot de quelques écrans ou d'accessoires, une quantité suffit. Pour les appareils de plus grande valeur (portables, serveurs, stockage, équipements réseau), ou si votre politique interne exige un suivi appareil par appareil, notez aussi le numéro de série ou l'étiquette d'inventaire. Beaucoup de systèmes de gestion permettent d'exporter directement cette liste : inutile de tout retaper.</p>

<h3>Des termes constants</h3>
<p>Si une personne écrit le nom de la gamme et une autre « portable gris 14 pouces », le lot devient difficile à trier. Choisissez une convention (la marque, puis le modèle) et un vocabulaire d'état commun, puis tenez-vous-y du début à la fin.</p>

<h2>Regrouper le matériel de façon logique</h2>
<p>Une fois la liste faite, regroupez physiquement les appareils par famille : les portables ensemble, les écrans empilés par taille et par modèle, les équipements réseau dans une même zone, les serveurs et le stockage à part. Inutile de tout mettre en boîte : chez Techno Lot, l'équipe emballe, charge et transporte le matériel. Un regroupement de base facilite simplement l'évaluation et réduit les risques d'erreur.</p>
<p>Profitez-en pour faire une vérification rapide : les quantités du tableur correspondent-elles à ce qui se trouve sur place ? Après un déménagement ou la fermeture d'un service, des appareils traînent souvent dans des bureaux, des locaux d'entreposage ou des succursales.</p>

<h2>Libérer les verrous avant la revente</h2>
<p>Un appareil encore lié à votre entreprise peut être impossible à réutiliser. Avant le ramassage, demandez à votre équipe TI de :</p>
<ul>
<li>retirer les mots de passe BIOS ou UEFI des ordinateurs ;</li>
<li>désinscrire les appareils de votre solution de gestion des appareils (MDM) et de l'inscription automatique ;</li>
<li>dissocier les comptes et désactiver les verrous d'activation des tablettes et des téléphones ;</li>
<li>remettre les équipements réseau à leurs paramètres d'usine lorsque c'est possible.</li>
</ul>
<p>Si certains appareils ne peuvent pas être déverrouillés, indiquez-le dans la liste. Cette information influence l'évaluation, et il vaut mieux la connaître dès le départ.</p>
<p>Ne mettez jamais de mots de passe, d'identifiants d'administrateur ou de clés de chiffrement dans le tableur destiné à l'acheteur. Une colonne de statut (« déverrouillé », « verrou présent ») suffit amplement.</p>

<h2>Ne pas oublier les accessoires</h2>
<p>Chargeurs, stations d'accueil, câbles d'alimentation, pieds d'écran, rails de serveur, modules et alimentations : ces éléments font partie de la valeur des appareils. Rassemblez-les avec le lot et indiquez leur nombre. Un portable avec son chargeur ou un serveur avec ses rails est plus facile à remettre en service, donc à revendre.</p>

<h2>Jusqu'où aller dans le détail ?</h2>
<p>Le bon niveau de détail dépend de la taille et de la nature du lot. Pour une vingtaine d'appareils courants, une liste concise et quelques photos suffisent généralement. Pour la fermeture d'une salle de serveurs ou le renouvellement complet d'un parc, une exportation de votre système de gestion des actifs fait gagner beaucoup de temps aux deux parties.</p>
<p>Dans tous les cas, mieux vaut envoyer l'information que vous avez déjà que de retarder la démarche pour retrouver chaque détail. Une ligne « 12 portables, modèle à confirmer, état non testé » est plus utile qu'une liste parfaite qui n'arrive jamais. L'évaluation se précise ensuite au besoin.</p>

<h2>Les photos qui aident vraiment</h2>
<p>Quelques photos bien choisies valent mieux qu'une centaine prises au hasard :</p>
<ul>
<li>l'étiquette du modèle et du numéro de série des appareils de plus grande valeur ;</li>
<li>une vue d'ensemble de chaque groupe (palette d'écrans, pile de portables, rack) ;</li>
<li>l'avant et l'arrière des serveurs et des équipements réseau ;</li>
<li>les défauts visibles : écran fissuré, boîtier abîmé, pièces manquantes.</li>
</ul>

<h2>Les données : ce que Techno Lot prend en charge</h2>
<p>Repérez tous les appareils qui contiennent du stockage : ordinateurs, serveurs, stockage réseau, disques externes, tablettes, téléphones, imprimantes multifonctions. Indiquez simplement dans la liste si un stockage est présent.</p>
<p>Vous n'avez pas à retirer ni à détruire les disques vous-même. Techno Lot procède à l'effacement sécurisé des données et remet un certificat de destruction des données, sans frais. Les disques conservent ainsi leur valeur, et vous gardez une preuve pour vos dossiers. Si votre politique interne exige un traitement particulier, mentionnez-le dès votre demande.</p>

<h2>Après le ramassage : garder une trace</h2>
<p>Conservez la version finale de l'inventaire, avec la date du ramassage et les écarts constatés. Le paiement se fait en deux temps : la moitié au ramassage, le solde après l'inspection (15 jours ouvrables au maximum). Si l'état réel d'un appareil diffère de sa description, l'offre est ajustée en conséquence : une raison de plus de décrire l'état avec honnêteté. Ce dossier vous servira aussi pour vos rapprochements internes, vos vérifications et la radiation des actifs.</p>
<p>Prêt à passer à l'étape suivante ? Selon votre matériel, consultez nos pages sur le <a href="/rachat-ordinateurs-portables-en-lot">rachat d'ordinateurs portables en lot</a> ou le <a href="/rachat-serveurs-et-stockage">rachat de serveurs et de stockage</a>, puis <a href="/soumission">envoyez votre liste par la soumission</a> : vous recevrez une offre dans les 24 heures.</p>

<h2>En résumé</h2>
<p>Un bon inventaire de revente indique le type, le modèle, la quantité, la configuration et l'état de chaque appareil, avec les numéros de série au besoin. Regroupez le matériel par famille, libérez les verrous, rassemblez les accessoires et prenez quelques photos utiles. Pour le reste (emballage, transport, effacement des données et certificat), Techno Lot s'en charge.</p>
`,
  },
  {
    slug: "qui-rachete-equipements-reseau-quebec",
    lang: "fr",
    title: "Vendre des équipements réseau en lot au Québec",
    excerpt:
      "Switchs, routeurs, pare-feu, points d'accès et téléphonie IP : ce qui influence l'offre, comment réinitialiser les configurations et comment se déroule le rachat de votre lot réseau au Québec.",
    isoDate: "2026-08-12T00:03:27.33+00:00",
    updatedIsoDate: "2026-10-28",
    image:
      "https://afocirmbqdxnkyescnev.supabase.co/storage/v1/object/public/featured-images/c91b1b83-1942-40e1-892c-5db39ec7969e/045291d6-36a8-47d3-b3d5-2af08f4c0303.webp",
    imageAlt: "Routeur, switchs et câbles réseau sur une table, devant une fenêtre donnant sur la ville de Québec",
    html: `
<p>Une migration réseau, un déménagement ou la fermeture d'une salle de serveurs laisse souvent derrière elle des étagères de switchs, de routeurs, de pare-feu, de points d'accès et de téléphones IP. Ce matériel garde souvent de la valeur sur le marché de la revente, à condition d'être bien préparé. Voici ce qu'il faut savoir pour vendre vos équipements réseau en lot au Québec, et ce qui influence l'offre que vous recevrez.</p>

<h2>Quels équipements réseau peuvent être revendus ?</h2>
<p>Techno Lot rachète le matériel informatique et électronique des entreprises, qu'il soit neuf, usagé ou partiellement fonctionnel. Du côté du réseau, cela comprend généralement :</p>
<ul>
<li><strong>Les switchs</strong> : commutateurs d'accès, de distribution ou de cœur, administrables ou non, avec ou sans PoE ;</li>
<li><strong>Les routeurs</strong> de succursale ou de périphérie ;</li>
<li><strong>Les pare-feu</strong> et les appareils de sécurité réseau ;</li>
<li><strong>Les points d'accès sans fil</strong> et leurs contrôleurs ;</li>
<li><strong>La téléphonie IP</strong> : téléphones de bureau, passerelles, équipements de conférence ;</li>
<li><strong>Les modules et accessoires</strong> : modules optiques, cartes d'extension, alimentations, rails et supports.</li>
</ul>
<p>Pour un aperçu de ce service, consultez notre page sur le <a href="/rachat-equipements-reseau-telecom">rachat d'équipements réseau et télécom</a>.</p>

<h2>Ce qui influence l'offre</h2>
<p>Comme pour tout matériel informatique, le prix dépend de l'évaluation du lot. Quelques repères généraux du marché permettent toutefois de comprendre ce qui pèse dans la balance.</p>

<h3>La génération et les capacités</h3>
<p>Les appareils qui prennent en charge des vitesses et des normes encore recherchées (ports multigigabit, liaisons montantes rapides, normes Wi-Fi récentes, PoE suffisant) intéressent plus d'acheteurs. Un appareil dont le fabricant a cessé le soutien et les mises à jour de sécurité trouve moins facilement preneur pour un réemploi en production.</p>

<h3>L'état et le fonctionnement</h3>
<p>Un switch qui démarre sans erreur, dont les ports et les ventilateurs fonctionnent, ne se compare pas à un appareil qui ne s'allume plus. Les boîtiers abîmés, les oreilles de montage manquantes ou les ports endommagés comptent aussi. Un appareil partiellement fonctionnel peut néanmoins garder une valeur pour ses composants.</p>

<h3>La quantité et l'homogénéité</h3>
<p>Un lot de modèles identiques, par exemple une série de switchs d'accès retirés d'un même bâtiment, est plus simple à tester et à revendre qu'un assortiment hétéroclite. Les lots mixtes sont tout de même évalués, et il n'y a pas de minimum.</p>

<h3>La complétude des appareils</h3>
<p>Les modules, les alimentations et les accessoires font partie de la valeur. Un appareil complet se remet en service plus facilement qu'un châssis nu : nous y revenons plus bas.</p>

<h2>Réinitialiser les configurations avant la vente</h2>
<p>Un équipement réseau contient bien plus que du matériel : configurations, adresses IP internes, comptes d'administration, clés partagées, certificats, journaux. Avant la revente, il est préférable de :</p>
<ul>
<li>sauvegarder les configurations dont vous avez besoin pour vos archives ;</li>
<li>effacer les configurations et remettre les appareils à leurs paramètres d'usine ;</li>
<li>retirer les appareils de vos consoles de gestion infonuagique et de vos contrôleurs, pour qu'ils ne restent pas liés à votre compte ;</li>
<li>noter les appareils que vous n'avez pas pu réinitialiser (mot de passe perdu, appareil hors service).</li>
</ul>
<p>Un appareil encore rattaché à une console de gestion peut être difficile, voire impossible, à réutiliser pour un nouvel acheteur. Le dissocier fait partie des gestes qui préservent la valeur du lot. Pour les appareils qui contiennent du stockage, Techno Lot procède à l'effacement sécurisé des données et remet un certificat de destruction des données, sans frais.</p>

<h2>Modules, alimentations et accessoires</h2>
<p>Les modules optiques (SFP, SFP+ et autres), les cartes d'extension, les alimentations redondantes, les ventilateurs, les câbles d'empilement et les trousses de montage accompagnent souvent les appareils. Un châssis livré avec ses alimentations et ses modules est plus facile à remettre en service.</p>
<p>Laissez ces éléments dans les appareils ou regroupez-les dans des boîtes identifiées, et indiquez leur nombre dans votre liste. Ne les jetez pas séparément : une boîte de modules optiques oubliée dans un tiroir peut faire partie de la valeur du lot.</p>

<h2>Les licences : à discuter au cas par cas</h2>
<p>Beaucoup d'équipements réseau fonctionnent avec des licences logicielles, des abonnements de gestion ou des contrats de soutien. Leur transférabilité dépend des conditions propres à chaque fabricant et à chaque contrat ; elle n'est jamais acquise d'avance. Si vos équipements sont accompagnés de licences, mentionnez-le dans votre demande : la situation sera examinée au cas par cas, sans promesse quant à leur prise en compte dans l'offre.</p>

<h2>Planifier le retrait sans interrompre vos activités</h2>
<p>Dans un réseau en production, le retrait des anciens équipements se fait souvent par étapes : les nouveaux appareils sont installés, le trafic est migré, puis les anciens sont débranchés. Quelques précautions simplifient la suite :</p>
<ul>
<li>identifiez clairement les appareils retirés, par exemple avec une étiquette « à revendre », pour éviter qu'un équipement encore en service parte avec le lot ;</li>
<li>regroupez le matériel retiré dans un même local plutôt que de le laisser dispersé dans les placards techniques de chaque étage ;</li>
<li>si le retrait s'étale sur plusieurs semaines, tenez la liste à jour au fil des étapes, puis envoyez-la lorsque le lot est complet ou presque.</li>
</ul>
<p>Rien ne vous oblige à attendre la fin du projet pour demander une offre : un premier lot peut être évalué, puis un second plus tard. Comme il n'y a pas de minimum, chaque étape peut faire l'objet de son propre ramassage.</p>

<h2>Préparer votre liste</h2>
<p>Pour une offre plus précise, préparez une liste simple : type d'appareil, marque et modèle exacts, quantité, état, modules et alimentations inclus, appareils réinitialisés ou non. Quelques photos des étiquettes, ainsi que de l'avant et de l'arrière des appareils, complètent bien la description. Si votre lot comprend aussi des serveurs ou des baies de stockage, notre page sur le <a href="/rachat-serveurs-et-stockage">rachat de serveurs et de stockage</a> précise ce qu'il faut noter.</p>

<h2>Comment se déroule le rachat avec Techno Lot</h2>
<ol>
<li><strong>Vous décrivez votre lot</strong> par la <a href="/soumission">soumission en ligne</a>, avec votre liste et vos photos.</li>
<li><strong>Vous recevez une offre dans les 24 heures</strong>, établie selon l'évaluation du matériel.</li>
<li><strong>Nous ramassons le lot sans frais et sans minimum</strong>, partout au Québec : notre équipe emballe, charge et transporte les équipements.</li>
<li><strong>Vous êtes payé en deux temps</strong> : la moitié au ramassage, le solde après l'inspection (15 jours ouvrables au maximum). Si l'état réel diffère de la description, l'offre est ajustée.</li>
<li><strong>Le matériel trouve une seconde vie</strong> : les équipements sont réemployés, et les composants qui ne peuvent pas l'être sont recyclés.</li>
</ol>

<h2>En résumé</h2>
<p>Switchs, routeurs, pare-feu, points d'accès et téléphonie IP peuvent se revendre en lot au Québec. L'offre dépend de la génération, de l'état, de la quantité et de la complétude des appareils. Réinitialisez les configurations, dissociez vos consoles de gestion, gardez les modules et les alimentations avec le lot et signalez vos licences pour qu'elles soient examinées au cas par cas. Techno Lot s'occupe du reste : une offre dans les 24 heures, un ramassage sans frais et un paiement rapide et garanti.</p>
`,
  },
];

const bySlug = new Map(LOCAL_REWRITES.map((r) => [r.slug, r]));

/** Réécriture locale de ce slug, ou undefined. */
export function getLocalRewrite(slug: string): LocalRewrite | undefined {
  return bySlug.get(slug);
}
