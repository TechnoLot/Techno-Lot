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
