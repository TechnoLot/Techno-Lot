export type LotStatus =
  | "negotiating"
  | "purchased"
  | "sold"
  | "cancelled";

export type LotSource = "manual" | "email" | "form";

export type Lot = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;

  client_name: string;
  client_email: string | null;
  client_phone: string | null;

  purchase_price: number;
  sale_price: number | null;

  status: LotStatus;
  purchased_at: string; // date "YYYY-MM-DD"
  sold_at: string | null;

  description: string | null;
  notes: string | null;

  source: LotSource;
  soumission_id: string | null;
};

export type NewLot = Omit<
  Lot,
  "id" | "created_at" | "updated_at" | "created_by"
>;

export type PeriodKey =
  | "7d"
  | "30d"
  | "month"
  | "lastmonth"
  | "3m"
  | "6m"
  | "ytd"
  | "all";

export type PeriodDef = {
  key: PeriodKey;
  label: string;
  labelEn: string;
  days: number | null; // null = pas de plancher (mois/ytd/all → calculé)
};

export const PERIODS: PeriodDef[] = [
  { key: "7d", label: "7 jours", labelEn: "7 days", days: 7 },
  { key: "30d", label: "30 jours", labelEn: "30 days", days: 30 },
  { key: "month", label: "Ce mois", labelEn: "This month", days: null },
  { key: "lastmonth", label: "Mois dernier", labelEn: "Last month", days: null },
  { key: "3m", label: "3 mois", labelEn: "3 months", days: 90 },
  { key: "6m", label: "6 mois", labelEn: "6 months", days: null },
  { key: "ytd", label: "Cette année", labelEn: "This year", days: null },
  { key: "all", label: "Tout", labelEn: "All", days: null },
];
