// ─── Union Types ─────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'New Lead'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Negotiation'
  | 'Post Demo Follow-Up'
  | 'Post Commercial Follow-Up'
  | 'Parked'
  | 'Won'
  | 'Lost';

export type LeadSource =
  | 'Agent'
  | 'Broker'
  | 'IMF'
  | 'Advisor'
  | 'MF Distributor'
  | 'CA'
  | 'NBFC'
  | 'Other';

export type LostReason = 'Not Eligible' | 'Budget Constraint';

export type ActivityType =
  | 'Call'
  | 'Meeting'
  | 'Note'
  | 'Status Update'
  | 'Follow-up Update';

// ─── Data Model Interfaces ────────────────────────────────────────────────────

export interface FollowupNote {
  id: string;           // nanoid or timestamp-based
  note: string;
  date?: string;        // optional follow-up date
  time?: string;        // optional follow-up time (HH:MM)
  added_by_uid: string;
  added_by_name: string;
  created_at: string;   // ISO timestamp
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  company: string;
  lead_source: LeadSource;
  assigned_to: string;
  status: LeadStatus;
  followup_date: string | null;
  notes: string;
  created_at: string;
  lost_reason?: LostReason | null;
  website_link?: string;
  business_type?: string;
  location?: string;
  followup_status?: 'Ongoing' | 'Completed';
  followup_time?: string;
  followup_notes?: FollowupNote[];  // follow-up history
  assigned_to_uid?: string; // UID of the assigned user for reliable filtering
  created_by_uid?: string;  // UID of the user who created this lead
}

export interface Activity {
  id: string;                      // nanoid()
  lead_id: string;                 // foreign key to Lead.id
  activity_type: ActivityType;
  description: string;
  created_at: string;              // ISO timestamp
  performed_by_uid?: string;
  performed_by_name?: string;
  performed_by_role?: 'admin' | 'team_lead' | 'employee';
}

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface CRMStore {
  // State
  leads: Lead[];
  activities: Activity[];
  openDrawerLeadId: string | null;

  // Lead actions
  addLead: (data: Omit<Lead, 'id' | 'created_at'>) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;

  // Activity actions
  addActivity: (data: Omit<Activity, 'id' | 'created_at'>) => void;

  // Drawer control
  openDrawer: (leadId: string) => void;
  closeDrawer: () => void;
}

// ─── Helper Types ─────────────────────────────────────────────────────────────

export type LeadFormData = Omit<Lead, 'id' | 'created_at'>;

export interface LeadFilters {
  searchTerm: string;
  status: LeadStatus | '';
  source: LeadSource | '';
  assignedTo: string;
  followupDate: string;
}

export interface SortConfig {
  column: keyof Lead;
  direction: 'asc' | 'desc';
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'New Lead',
  'Contacted',
  'Interested',
  'Follow-up',
  'Negotiation',
  'Post Demo Follow-Up',
  'Post Commercial Follow-Up',
  'Parked',
  'Won',
  'Lost',
] as const;

export const LEAD_SOURCES: readonly LeadSource[] = [
  'Agent',
  'Broker',
  'IMF',
  'Advisor',
  'MF Distributor',
  'CA',
  'NBFC',
  'Other',
] as const;

export const LOST_REASONS: readonly LostReason[] = [
  'Not Eligible',
  'Budget Constraint',
] as const;

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'Call',
  'Meeting',
  'Note',
  'Status Update',
  'Follow-up Update',
] as const;

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string }> = {
  'New Lead':                    { bg: 'bg-slate-100',  text: 'text-slate-700'  },
  'Contacted':                   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'Interested':                  { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Follow-up':                   { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  'Negotiation':                 { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Post Demo Follow-Up':         { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  'Post Commercial Follow-Up':   { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  'Parked':                      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'Won':                         { bg: 'bg-green-100',  text: 'text-green-700'  },
  'Lost':                        { bg: 'bg-red-100',    text: 'text-red-700'    },
};
