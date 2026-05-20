// Generert manuelt — kjør `bun db:generate` når Supabase CLI er koblet til

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          short_name: string;
          legal_name: string;
          org_number: string;
          invoice_address: Json;
          invoice_email: string;
          invoice_day_rule: string;
          payment_days: number;
          hourly_rate: string;
          vat_status: "exempt_3_8" | "exempt_3_14" | "vat_25";
          active_from: string;
          active_to: string | null;
          contract_file_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          short_name: string;
          legal_name: string;
          org_number: string;
          invoice_address: Json;
          invoice_email: string;
          invoice_day_rule: string;
          payment_days?: number;
          hourly_rate: number | string;
          vat_status?: "exempt_3_8" | "exempt_3_14" | "vat_25";
          active_from: string;
          active_to?: string | null;
          contract_file_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          short_name?: string;
          legal_name?: string;
          org_number?: string;
          invoice_address?: Json;
          invoice_email?: string;
          invoice_day_rule?: string;
          payment_days?: number;
          hourly_rate?: number | string;
          vat_status?: "exempt_3_8" | "exempt_3_14" | "vat_25";
          active_from?: string;
          active_to?: string | null;
          contract_file_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      week_patterns: {
        Row: {
          id: string;
          customer_id: string;
          weekday: number;
          duration_h: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          weekday: number;
          duration_h: number | string;
          notes?: string | null;
        };
        Update: {
          duration_h?: number | string;
          notes?: string | null;
        };
        Relationships: [];
      };
      vacation_periods: {
        Row: {
          id: string;
          from_date: string;
          to_date: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_date: string;
          to_date: string;
          description: string;
          created_at?: string;
        };
        Update: {
          from_date?: string;
          to_date?: string;
          description?: string;
        };
        Relationships: [];
      };
      scheduled_sessions: {
        Row: {
          id: string;
          customer_id: string;
          scheduled_date: string;
          planned_duration_h: string;
          status: "planned" | "completed" | "sick" | "substitute" | "holiday" | "vacation" | "cancelled";
          blocked_reason: string | null;
          is_public_holiday: boolean;
        };
        Insert: {
          id?: string;
          customer_id: string;
          scheduled_date: string;
          planned_duration_h: number | string;
          status?: "planned" | "completed" | "sick" | "substitute" | "holiday" | "vacation" | "cancelled";
          blocked_reason?: string | null;
          is_public_holiday?: boolean;
        };
        Update: {
          customer_id?: string;
          scheduled_date?: string;
          planned_duration_h?: number | string;
          status?: "planned" | "completed" | "sick" | "substitute" | "holiday" | "vacation" | "cancelled";
          blocked_reason?: string | null;
          is_public_holiday?: boolean;
        };
        Relationships: [];
      };
      session_log: {
        Row: {
          id: string;
          scheduled_session_id: string | null;
          customer_id: string;
          session_date: string;
          actual_duration_h: string;
          hourly_rate_at_time: string;
          line_amount: string;
          status: "pending_invoice" | "invoiced" | "sick" | "substitute" | "vacation";
          invoice_id: string | null;
          note: string | null;
          logged_at: string;
          logged_by: string;
        };
        Insert: {
          id?: string;
          scheduled_session_id?: string | null;
          customer_id: string;
          session_date: string;
          actual_duration_h: number | string;
          hourly_rate_at_time: number | string;
          status?: "pending_invoice" | "invoiced" | "sick" | "substitute" | "vacation";
          invoice_id?: string | null;
          note?: string | null;
          logged_at?: string;
          logged_by: string;
        };
        Update: {
          status?: "pending_invoice" | "invoiced" | "sick" | "substitute" | "vacation";
          invoice_id?: string | null;
          note?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: number;
          customer_id: string;
          invoice_date: string;
          due_date: string;
          period_from: string;
          period_to: string;
          subtotal: string;
          vat_amount: string;
          total: string;
          vat_exempt_note: string;
          status: "draft" | "awaiting_approval" | "sent" | "paid" | "overdue" | "credited";
          approved_at: string | null;
          sent_at: string | null;
          paid_at: string | null;
          pdf_file_id: string | null;
          credited_by_id: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          invoice_date: string;
          due_date: string;
          period_from: string;
          period_to: string;
          subtotal: number | string;
          vat_amount?: number | string;
          vat_exempt_note?: string;
          status?: "draft" | "awaiting_approval" | "sent" | "paid" | "overdue" | "credited";
          approved_at?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          pdf_file_id?: string | null;
          credited_by_id?: string | null;
          created_by: string;
        };
        Update: {
          status?: "draft" | "awaiting_approval" | "sent" | "paid" | "overdue" | "credited";
          approved_at?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          pdf_file_id?: string | null;
          credited_by_id?: string | null;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          expense_date: string;
          account_code: string;
          description: string;
          amount_gross: string;
          supplier_name: string | null;
          receipt_file_id: string | null;
          customer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_date: string;
          account_code: string;
          description: string;
          amount_gross: number | string;
          supplier_name?: string | null;
          receipt_file_id?: string | null;
          customer_id?: string | null;
        };
        Update: {
          description?: string;
          amount_gross?: number | string;
          supplier_name?: string | null;
          receipt_file_id?: string | null;
        };
        Relationships: [];
      };
      tax_estimates: {
        Row: {
          id: string;
          tax_year: number;
          ytd_revenue: string;
          ytd_expenses: string;
          estimated_annual_profit: string | null;
          estimated_tax: string | null;
          prepaid_tax: string | null;
          gap: string | null;
          next_installment_date: string | null;
          next_installment_amount: string | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          tax_year: number;
          ytd_revenue?: number | string;
          ytd_expenses?: number | string;
          estimated_annual_profit?: number | string | null;
          estimated_tax?: number | string | null;
          prepaid_tax?: number | string | null;
          gap?: number | string | null;
          next_installment_date?: string | null;
          next_installment_amount?: number | string | null;
        };
        Update: {
          ytd_revenue?: number | string;
          ytd_expenses?: number | string;
          estimated_annual_profit?: number | string | null;
          estimated_tax?: number | string | null;
          prepaid_tax?: number | string | null;
          gap?: number | string | null;
          next_installment_date?: string | null;
          next_installment_amount?: number | string | null;
          calculated_at?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          file_type: "contract" | "invoice_pdf" | "receipt" | "export" | "other";
          original_filename: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          sha256_hash: string;
          uploaded_at: string;
          retain_until: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          file_type: "contract" | "invoice_pdf" | "receipt" | "export" | "other";
          original_filename: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          sha256_hash: string;
          retain_until: string;
          deleted_at?: string | null;
        };
        Update: {
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      public_holidays: {
        Row: {
          holiday_date: string;
          name: string;
        };
        Insert: {
          holiday_date: string;
          name: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          action: "INSERT" | "UPDATE" | "DELETE";
          old_data: Json | null;
          new_data: Json | null;
          changed_by: string;
          changed_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          action: "INSERT" | "UPDATE" | "DELETE";
          old_data?: Json | null;
          new_data?: Json | null;
          changed_by: string;
          changed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
