// Autogenerert fra Supabase — ikke rediger manuelt
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          active_from: string
          active_to: string | null
          avtale_dato: string | null
          bestillings_nummer: string | null
          contract_file_id: string | null
          created_at: string
          geofence_radius_m: number
          hourly_rate: number
          id: string
          invoice_address: Json
          invoice_day_rule: string
          invoice_email: string
          lat: number | null
          legal_name: string
          lng: number | null
          lokasjon: string | null
          notes: string | null
          org_number: string
          payment_days: number
          rekvirent: string | null
          short_name: string
          updated_at: string
          vat_status: string
          visit_address: Json | null
        }
        Insert: {
          active_from: string
          active_to?: string | null
          avtale_dato?: string | null
          bestillings_nummer?: string | null
          contract_file_id?: string | null
          created_at?: string
          geofence_radius_m?: number
          hourly_rate: number
          id?: string
          invoice_address: Json
          invoice_day_rule: string
          invoice_email: string
          lat?: number | null
          legal_name: string
          lng?: number | null
          lokasjon?: string | null
          notes?: string | null
          org_number: string
          payment_days?: number
          rekvirent?: string | null
          short_name: string
          updated_at?: string
          vat_status?: string
          visit_address?: Json | null
        }
        Update: {
          active_from?: string
          active_to?: string | null
          avtale_dato?: string | null
          bestillings_nummer?: string | null
          contract_file_id?: string | null
          created_at?: string
          geofence_radius_m?: number
          hourly_rate?: number
          id?: string
          invoice_address?: Json
          invoice_day_rule?: string
          invoice_email?: string
          lat?: number | null
          legal_name?: string
          lng?: number | null
          lokasjon?: string | null
          notes?: string | null
          org_number?: string
          payment_days?: number
          rekvirent?: string | null
          short_name?: string
          updated_at?: string
          vat_status?: string
          visit_address?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_contract_file_id_fkey"
            columns: ["contract_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_code: string
          amount_gross: number
          created_at: string
          customer_id: string | null
          description: string
          expense_date: string
          id: string
          receipt_file_id: string | null
          supplier_name: string | null
        }
        Insert: {
          account_code: string
          amount_gross: number
          created_at?: string
          customer_id?: string | null
          description: string
          expense_date: string
          id?: string
          receipt_file_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          account_code?: string
          amount_gross?: number
          created_at?: string
          customer_id?: string | null
          description?: string
          expense_date?: string
          id?: string
          receipt_file_id?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_receipt_file_id_fkey"
            columns: ["receipt_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          deleted_at: string | null
          file_size_bytes: number
          file_type: string
          id: string
          mime_type: string
          original_filename: string
          retain_until: string
          sha256_hash: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          deleted_at?: string | null
          file_size_bytes: number
          file_type: string
          id?: string
          mime_type: string
          original_filename: string
          retain_until: string
          sha256_hash: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          deleted_at?: string | null
          file_size_bytes?: number
          file_type?: string
          id?: string
          mime_type?: string
          original_filename?: string
          retain_until?: string
          sha256_hash?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string
          credited_by_id: string | null
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: number
          paid_at: string | null
          pdf_file_id: string | null
          period_from: string
          period_to: string
          sent_at: string | null
          status: string
          subtotal: number
          total: number | null
          vat_amount: number
          vat_exempt_note: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by: string
          credited_by_id?: string | null
          customer_id: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number?: number
          paid_at?: string | null
          pdf_file_id?: string | null
          period_from: string
          period_to: string
          sent_at?: string | null
          status?: string
          subtotal: number
          total?: number | null
          vat_amount?: number
          vat_exempt_note?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string
          credited_by_id?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: number
          paid_at?: string | null
          pdf_file_id?: string | null
          period_from?: string
          period_to?: string
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number | null
          vat_amount?: number
          vat_exempt_note?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_credited_by_id_fkey"
            columns: ["credited_by_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pdf_file_id_fkey"
            columns: ["pdf_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bank_account: string | null
          city: string | null
          iban: string | null
          id: string
          invoice_email: string | null
          org_number: string | null
          postal_code: string | null
          telefon: string
          tittel: string
          updated_at: string | null
          visningsnavn: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          city?: string | null
          iban?: string | null
          id: string
          invoice_email?: string | null
          org_number?: string | null
          postal_code?: string | null
          telefon?: string
          tittel?: string
          updated_at?: string | null
          visningsnavn?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bank_account?: string | null
          city?: string | null
          iban?: string | null
          id?: string
          invoice_email?: string | null
          org_number?: string | null
          postal_code?: string | null
          telefon?: string
          tittel?: string
          updated_at?: string | null
          visningsnavn?: string
        }
        Relationships: []
      }
      public_holidays: {
        Row: {
          holiday_date: string
          name: string
        }
        Insert: {
          holiday_date: string
          name: string
        }
        Update: {
          holiday_date?: string
          name?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          blocked_reason: string | null
          customer_id: string
          id: string
          is_public_holiday: boolean
          planned_duration_h: number
          planned_start_time: string | null
          scheduled_date: string
          status: string
        }
        Insert: {
          blocked_reason?: string | null
          customer_id: string
          id?: string
          is_public_holiday?: boolean
          planned_duration_h: number
          planned_start_time?: string | null
          scheduled_date: string
          status?: string
        }
        Update: {
          blocked_reason?: string | null
          customer_id?: string
          id?: string
          is_public_holiday?: boolean
          planned_duration_h?: number
          planned_start_time?: string | null
          scheduled_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_log: {
        Row: {
          actual_duration_h: number
          customer_id: string
          hourly_rate_at_time: number
          id: string
          invoice_id: string | null
          line_amount: number | null
          logged_at: string
          logged_by: string
          note: string | null
          scheduled_session_id: string | null
          session_date: string
          status: string
        }
        Insert: {
          actual_duration_h: number
          customer_id: string
          hourly_rate_at_time: number
          id?: string
          invoice_id?: string | null
          line_amount?: number | null
          logged_at?: string
          logged_by: string
          note?: string | null
          scheduled_session_id?: string | null
          session_date: string
          status?: string
        }
        Update: {
          actual_duration_h?: number
          customer_id?: string
          hourly_rate_at_time?: number
          id?: string
          invoice_id?: string | null
          line_amount?: number | null
          logged_at?: string
          logged_by?: string
          note?: string | null
          scheduled_session_id?: string | null
          session_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_log_scheduled_session_id_fkey"
            columns: ["scheduled_session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_estimates: {
        Row: {
          calculated_at: string
          estimated_annual_profit: number | null
          estimated_tax: number | null
          gap: number | null
          id: string
          next_installment_amount: number | null
          next_installment_date: string | null
          prepaid_tax: number | null
          tax_year: number
          ytd_expenses: number
          ytd_revenue: number
        }
        Insert: {
          calculated_at?: string
          estimated_annual_profit?: number | null
          estimated_tax?: number | null
          gap?: number | null
          id?: string
          next_installment_amount?: number | null
          next_installment_date?: string | null
          prepaid_tax?: number | null
          tax_year: number
          ytd_expenses?: number
          ytd_revenue?: number
        }
        Update: {
          calculated_at?: string
          estimated_annual_profit?: number | null
          estimated_tax?: number | null
          gap?: number | null
          id?: string
          next_installment_amount?: number | null
          next_installment_date?: string | null
          prepaid_tax?: number | null
          tax_year?: number
          ytd_expenses?: number
          ytd_revenue?: number
        }
        Relationships: []
      }
      vacation_periods: {
        Row: {
          created_at: string
          description: string
          from_date: string
          id: string
          to_date: string
        }
        Insert: {
          created_at?: string
          description: string
          from_date: string
          id?: string
          to_date: string
        }
        Update: {
          created_at?: string
          description?: string
          from_date?: string
          id?: string
          to_date?: string
        }
        Relationships: []
      }
      week_patterns: {
        Row: {
          customer_id: string
          duration_h: number
          id: string
          notes: string | null
          start_time: string | null
          weekday: number
        }
        Insert: {
          customer_id: string
          duration_h: number
          id?: string
          notes?: string | null
          start_time?: string | null
          weekday: number
        }
        Update: {
          customer_id?: string
          duration_h?: number
          id?: string
          notes?: string | null
          start_time?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "week_patterns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
