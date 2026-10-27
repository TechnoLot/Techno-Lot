import type { Locale } from "@/lib/i18n";

/**
 * Questions-réponses de la FAQ, regroupées par thèmes (FR / EN).
 * Les 6 questions historiques sont conservées mot pour mot ; les ajouts ne
 * reprennent que des faits confirmés (aucun minimum, partout au Québec,
 * paiement en deux temps, certificat sans frais, réponse en 24 h, emballage,
 * chargement et transport par l'équipe).
 */

export type FaqItem = { question: string; answer: string };
export type FaqGroupe = { id: string; title: string; items: FaqItem[] };

const fr: FaqGroupe[] = [
  {
    id: "rachat",
    title: "Le rachat",
    items: [
      {
        question: "Quels types de produits achetez-vous ?",
        answer:
          "Nous rachetons tout matériel électronique, qu'il soit neuf, usagé et même partiellement fonctionnel.",
      },
      {
        question: "Quelle est la particularité de Techno Lot ?",
        answer:
          "Nous sommes la seule entreprise dans le domaine de l'achat de lots électroniques au Québec.",
      },
      {
        question: "Y a-t-il une quantité minimum ?",
        answer: "Non, il n'y a aucun minimum : nous évaluons chaque lot, peu importe sa taille.",
      },
      {
        question: "Recevrai-je un certificat de destruction des données ?",
        answer: "Oui. Nous vous remettons un certificat de destruction des données, sans frais.",
      },
    ],
  },
  {
    id: "ramassage",
    title: "Ramassage",
    items: [
      {
        question: "Est-ce que vous venez récupérer le matériel ?",
        answer: "Oui, dans notre offre de rachat, le ramassage de votre lot est inclus.",
      },
      {
        question: "Vous déplacez-vous partout au Québec ?",
        answer: "Oui. Le ramassage est gratuit partout au Québec.",
      },
      {
        question: "Qui s'occupe d'emballer et de charger le matériel ?",
        answer:
          "Notre équipe. Elle se rend sur place pour emballer, charger et transporter votre matériel.",
      },
    ],
  },
  {
    id: "paiement",
    title: "Paiement",
    items: [
      {
        question: "Quel est le délai de paiement lorsque vous achetez un lot ?",
        answer:
          "Nous vous payons rapidement : le paiement est garanti et effectué dès la validation finale de votre lot.",
      },
      {
        question: "Comment le paiement est-il versé ?",
        answer:
          "En deux temps. La moitié du paiement est versée au ramassage. Nous disposons ensuite d'un maximum de 15 jours ouvrables pour inspecter la fonctionnalité et la condition esthétique du matériel. Le solde vous est versé sans délai après l'inspection ; sinon, l'offre est ajustée en conséquence.",
      },
    ],
  },
  {
    id: "soumission",
    title: "Soumission et contact",
    items: [
      {
        question: "En combien de temps recevrai-je une réponse ?",
        answer: "Nous répondons à chaque demande dans un délai de 24 heures.",
      },
      {
        question: "Comment obtenir une offre pour mon lot ?",
        answer:
          "Remplissez le formulaire de soumission : choisissez vos catégories de matériel, ajoutez une description, un inventaire ou des photos si vous en avez, puis vos coordonnées. Vous pouvez aussi nous appeler au 514-944-3939.",
      },
      {
        question: "Où êtes-vous situés ?",
        answer: "Nous sommes situés à Mascouche, Québec, Canada.",
      },
      {
        question: "Comment puis-je vous contacter ?",
        answer: "Par téléphone au 514-944-3939 ou par courriel à info@technolot.ca.",
      },
    ],
  },
];

const en: FaqGroupe[] = [
  {
    id: "rachat",
    title: "The buyback",
    items: [
      {
        question: "What types of products do you buy?",
        answer: "We buy all electronic equipment, whether new, used or even partially functional.",
      },
      {
        question: "What makes Techno Lot unique?",
        answer: "We are the only company in the electronic lot purchasing business in Québec.",
      },
      {
        question: "Is there a minimum quantity?",
        answer: "No, there is no minimum: we appraise every lot, whatever its size.",
      },
      {
        question: "Will I receive a data destruction certificate?",
        answer: "Yes. We provide a data destruction certificate at no charge.",
      },
    ],
  },
  {
    id: "ramassage",
    title: "Pickup",
    items: [
      {
        question: "Do you pick up the equipment?",
        answer: "Yes — pickup of your lot is included in our buyback offer.",
      },
      {
        question: "Do you travel anywhere in Québec?",
        answer: "Yes. Pickup is free anywhere in Québec.",
      },
      {
        question: "Who packs and loads the equipment?",
        answer: "Our team. They come on site to pack, load and transport your equipment.",
      },
    ],
  },
  {
    id: "paiement",
    title: "Payment",
    items: [
      {
        question: "How quickly do you pay when you buy a lot?",
        answer:
          "We pay you quickly: payment is guaranteed and issued as soon as your lot passes final validation.",
      },
      {
        question: "How is the payment made?",
        answer:
          "In two parts. Half of the payment is issued at pickup. We then have up to 15 business days to inspect the functionality and cosmetic condition of the equipment. The balance is paid without delay after inspection; otherwise, the offer is adjusted accordingly.",
      },
    ],
  },
  {
    id: "soumission",
    title: "Quotes and contact",
    items: [
      {
        question: "How soon will I get a response?",
        answer: "We answer every request within 24 hours.",
      },
      {
        question: "How do I get an offer for my lot?",
        answer:
          "Fill out the quote form: pick your equipment categories, add a description, an inventory or photos if you have them, then your contact details. You can also call us at 514-944-3939.",
      },
      {
        question: "Where are you located?",
        answer: "We are located in Mascouche, Québec, Canada.",
      },
      {
        question: "How can I reach you?",
        answer: "By phone at 514-944-3939 or by email at info@technolot.ca.",
      },
    ],
  },
];

export function getFaq(locale: Locale): FaqGroupe[] {
  return locale === "en" ? en : fr;
}
