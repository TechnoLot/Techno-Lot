export type ResearchStatus =
  | "pending"
  | "searching"
  | "found"
  | "no_it_contact"
  | "converted";

export type LeadStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "not_interested";

export type ContactStage =
  | "new"
  | "contacted"
  | "call_booked"
  | "call_done"
  | "sequence_active"
  | "converted"
  | "lost";

export type ActivityType =
  | "call_logged"
  | "intro_email_sent"
  | "followup_sent"
  | "reply_received"
  | "sequence_step"
  | "manual_note";

export type TemplateType =
  | "post_call_intro"
  | "followup_1"
  | "followup_2"
  | "followup_3";

export type Company = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employee_count: number | null;
  research_status: ResearchStatus;
  notes: string | null;
  street_address: string | null;
  region: string | null;
  size_estimate_label: string | null;
  next_action: string | null;
  buying_signal: string | null;
  is_partner_not_client: boolean;
  main_phone: string | null;
  fit_score: number | null;
  lead_status: LeadStatus;
  lead_status_changed_at: string;
};

/**
 * Délai (en jours) avant qu'un lead contacté/intéressé remonte dans les
 * rappels de suivi. Un lead « intéressé » se relance plus vite.
 */
export const FOLLOWUP_DELAY_DAYS: Partial<Record<LeadStatus, number>> = {
  interested: 3,
  contacted: 7,
};

/** Jours entiers écoulés depuis une date ISO. */
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Nombre de jours de retard de suivi d'un lead (0 = dû aujourd'hui,
 * null = aucun suivi requis pour ce statut ou pas encore dû).
 */
export function followupOverdueDays(company: {
  lead_status: LeadStatus;
  lead_status_changed_at: string;
}): number | null {
  const delay = FOLLOWUP_DELAY_DAYS[company.lead_status];
  if (delay == null) return null;
  const overdue = daysSince(company.lead_status_changed_at) - delay;
  return overdue >= 0 ? overdue : null;
}

export type Contact = {
  id: string;
  created_at: string;
  updated_at: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
  linkedin_url: string | null;
  stage: ContactStage;
  lot_id: string | null;
  source_batch_id: string | null;
  notes: string | null;
  is_fallback_contact: boolean;
  fallback_reason: string | null;
  contact_priority: number;
  priority_reason: string | null;
};

export type OutreachActivity = {
  id: string;
  created_at: string;
  contact_id: string;
  activity_type: ActivityType;
  sequence_step: number | null;
  subject: string | null;
  body_preview: string | null;
  outcome: string | null;
  occurred_at: string;
  email_template_id: string | null;
};

export type EmailTemplate = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  template_type: TemplateType;
  subject: string;
  body: string;
  is_active: boolean;
};

export const STAGE_LABELS: Record<ContactStage, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  call_booked: "Appel prévu",
  call_done: "Appel fait",
  sequence_active: "Séquence active",
  converted: "Client",
  lost: "Perdu",
};

export const STAGES: ContactStage[] = [
  "new",
  "contacted",
  "call_booked",
  "call_done",
  "sequence_active",
  "converted",
  "lost",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  not_contacted: "Non contacté",
  contacted: "Contacté",
  interested: "Intéressé",
  not_interested: "Pas intéressé",
};

export const LEAD_STATUSES: LeadStatus[] = [
  "not_contacted",
  "contacted",
  "interested",
  "not_interested",
];

export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  pending: "En attente",
  searching: "Recherche",
  found: "Contact trouvé",
  no_it_contact: "Sans contact TI",
  converted: "Converti",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call_logged: "Appel",
  intro_email_sent: "Email d'intro envoyé",
  followup_sent: "Relance envoyée",
  reply_received: "Réponse reçue",
  sequence_step: "Étape de séquence",
  manual_note: "Note",
};

/** Nom complet d'un contact, avec repli sur le courriel ou "Contact". */
export function contactName(c: Pick<Contact, "first_name" | "last_name" | "email">): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || "Contact";
}
