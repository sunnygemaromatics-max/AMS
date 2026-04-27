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
      asset_transactions: {
        Row: {
          asset_id: string
          condition_status: string | null
          created_at: string
          from_employee_id: string | null
          from_location_id: string | null
          id: string
          notes: string | null
          performed_by: string | null
          to_employee_id: string | null
          to_location_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          asset_id: string
          condition_status?: string | null
          created_at?: string
          from_employee_id?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          to_employee_id?: string | null
          to_location_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          asset_id?: string
          condition_status?: string | null
          created_at?: string
          from_employee_id?: string | null
          from_location_id?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          to_employee_id?: string | null
          to_location_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "asset_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transactions_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          amc_end: string | null
          amc_start: string | null
          amc_vendor: string | null
          asset_subtype: Database["public"]["Enums"]["asset_subtype"] | null
          asset_type: Database["public"]["Enums"]["asset_type"]
          bin_card_no: number
          brand: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          current_employee_id: string | null
          current_location_id: string | null
          department_id: string | null
          depreciation_rate: number | null
          id: string
          imei: string | null
          imei2: string | null
          is_consumable: boolean
          is_deleted: boolean
          license_key: string | null
          mobile_number: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_bill_no: string | null
          purchase_cost: number | null
          purchase_date: string | null
          sap_code: string
          serial_number: string | null
          sim_provider: string | null
          specifications: string | null
          status: Database["public"]["Enums"]["asset_status"]
          system_info: string | null
          updated_at: string
          vendor_id: string | null
          warranty_end: string | null
          warranty_start: string | null
        }
        Insert: {
          amc_end?: string | null
          amc_start?: string | null
          amc_vendor?: string | null
          asset_subtype?: Database["public"]["Enums"]["asset_subtype"] | null
          asset_type?: Database["public"]["Enums"]["asset_type"]
          bin_card_no: number
          brand?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          current_employee_id?: string | null
          current_location_id?: string | null
          department_id?: string | null
          depreciation_rate?: number | null
          id?: string
          imei?: string | null
          imei2?: string | null
          is_consumable?: boolean
          is_deleted?: boolean
          license_key?: string | null
          mobile_number?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_bill_no?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          sap_code: string
          serial_number?: string | null
          sim_provider?: string | null
          specifications?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          system_info?: string | null
          updated_at?: string
          vendor_id?: string | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Update: {
          amc_end?: string | null
          amc_start?: string | null
          amc_vendor?: string | null
          asset_subtype?: Database["public"]["Enums"]["asset_subtype"] | null
          asset_type?: Database["public"]["Enums"]["asset_type"]
          bin_card_no?: number
          brand?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          current_employee_id?: string | null
          current_location_id?: string | null
          department_id?: string | null
          depreciation_rate?: number | null
          id?: string
          imei?: string | null
          imei2?: string | null
          is_consumable?: boolean
          is_deleted?: boolean
          license_key?: string | null
          mobile_number?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_bill_no?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          sap_code?: string
          serial_number?: string | null
          sim_provider?: string | null
          specifications?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          system_info?: string | null
          updated_at?: string
          vendor_id?: string | null
          warranty_end?: string | null
          warranty_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_current_employee_id_fkey"
            columns: ["current_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          code: string
          created_at: string
          id: string
          is_consumable: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          code: string
          created_at?: string
          id?: string
          is_consumable?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          code?: string
          created_at?: string
          id?: string
          is_consumable?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string | null
          created_at: string
          department: string
          department_id: string | null
          designation: string | null
          email: string | null
          employee_code: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          created_at: string
          details: Json
          failed: number
          file_names: string[]
          id: string
          inserted: number
          inserted_ids: Json
          performed_by: string | null
          performed_by_name: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          skipped: number
          snapshot: Json
          total_rows: number
        }
        Insert: {
          created_at?: string
          details?: Json
          failed?: number
          file_names?: string[]
          id?: string
          inserted?: number
          inserted_ids?: Json
          performed_by?: string | null
          performed_by_name?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skipped?: number
          snapshot?: Json
          total_rows?: number
        }
        Update: {
          created_at?: string
          details?: Json
          failed?: number
          file_names?: string[]
          id?: string
          inserted?: number
          inserted_ids?: Json
          performed_by?: string | null
          performed_by_name?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skipped?: number
          snapshot?: Json
          total_rows?: number
        }
        Relationships: []
      }
      licenses: {
        Row: {
          assigned_asset_id: string | null
          assigned_employee_id: string | null
          company_id: string | null
          created_at: string
          current_users: number | null
          domain: string | null
          email_id: string | null
          id: string
          license_key: string | null
          license_type: string
          location_id: string | null
          max_users: number | null
          notes: string | null
          product_name: string | null
          sap_license_type: string | null
          sap_user_id: string | null
          status: string
          updated_at: string
          validity_end: string | null
          validity_start: string | null
        }
        Insert: {
          assigned_asset_id?: string | null
          assigned_employee_id?: string | null
          company_id?: string | null
          created_at?: string
          current_users?: number | null
          domain?: string | null
          email_id?: string | null
          id?: string
          license_key?: string | null
          license_type: string
          location_id?: string | null
          max_users?: number | null
          notes?: string | null
          product_name?: string | null
          sap_license_type?: string | null
          sap_user_id?: string | null
          status?: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
        }
        Update: {
          assigned_asset_id?: string | null
          assigned_employee_id?: string | null
          company_id?: string | null
          created_at?: string
          current_users?: number | null
          domain?: string | null
          email_id?: string | null
          id?: string
          license_key?: string | null
          license_type?: string
          location_id?: string | null
          max_users?: number | null
          notes?: string | null
          product_name?: string | null
          sap_license_type?: string | null
          sap_user_id?: string | null
          status?: string
          updated_at?: string
          validity_end?: string | null
          validity_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_assigned_asset_id_fkey"
            columns: ["assigned_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string
          company_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          email_alert_days_before: number
          email_alert_recipients: string[]
          email_alert_time: string
          email_alerts_enabled: boolean
          id: string
          logo_url: string | null
          org_address: string | null
          org_email: string | null
          org_name: string
          org_phone: string | null
          org_website: string | null
          pdf_footer_text: string | null
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_alert_days_before?: number
          email_alert_recipients?: string[]
          email_alert_time?: string
          email_alerts_enabled?: boolean
          id?: string
          logo_url?: string | null
          org_address?: string | null
          org_email?: string | null
          org_name?: string
          org_phone?: string | null
          org_website?: string | null
          pdf_footer_text?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_alert_days_before?: number
          email_alert_recipients?: string[]
          email_alert_time?: string
          email_alerts_enabled?: boolean
          id?: string
          logo_url?: string | null
          org_address?: string | null
          org_email?: string | null
          org_name?: string
          org_phone?: string | null
          org_website?: string | null
          pdf_footer_text?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          employee_id: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write_assets: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      next_bin_card_no: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "it" | "hr" | "viewer"
      approval_status: "pending" | "approved" | "rejected"
      asset_status:
        | "available"
        | "allocated"
        | "under_maintenance"
        | "lost"
        | "damaged"
        | "scrapped"
      asset_subtype:
        | "laptop"
        | "desktop"
        | "printer"
        | "scanner"
        | "server"
        | "mobile_device"
        | "tablet"
        | "antivirus"
        | "email_account"
        | "sap_license"
        | "software_license"
        | "networking"
        | "ups"
        | "other"
      asset_type: "tangible" | "intangible"
      transaction_type:
        | "allocation"
        | "return"
        | "transfer"
        | "maintenance_start"
        | "maintenance_end"
        | "lost"
        | "damaged"
        | "scrapped"
        | "purchase"
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
    Enums: {
      app_role: ["admin", "it", "hr", "viewer"],
      approval_status: ["pending", "approved", "rejected"],
      asset_status: [
        "available",
        "allocated",
        "under_maintenance",
        "lost",
        "damaged",
        "scrapped",
      ],
      asset_subtype: [
        "laptop",
        "desktop",
        "printer",
        "scanner",
        "server",
        "mobile_device",
        "tablet",
        "antivirus",
        "email_account",
        "sap_license",
        "software_license",
        "networking",
        "ups",
        "other",
      ],
      asset_type: ["tangible", "intangible"],
      transaction_type: [
        "allocation",
        "return",
        "transfer",
        "maintenance_start",
        "maintenance_end",
        "lost",
        "damaged",
        "scrapped",
        "purchase",
      ],
    },
  },
} as const
