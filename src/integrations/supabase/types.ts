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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          animal_id: string | null
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          quantity: number
          scheduled_date: string
          scheduled_time: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["activity_status"]
          total_price: number | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          quantity?: number
          scheduled_date: string
          scheduled_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["activity_status"]
          total_price?: number | null
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          animal_id?: string | null
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          quantity?: number
          scheduled_date?: string
          scheduled_time?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["activity_status"]
          total_price?: number | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          allergies: string | null
          birth_date: string | null
          breed: string | null
          client_id: string
          created_at: string
          id: string
          microchip_number: string | null
          name: string
          notes: string | null
          species: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id: string
          created_at?: string
          id?: string
          microchip_number?: string | null
          name: string
          notes?: string | null
          species?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          birth_date?: string | null
          breed?: string | null
          client_id?: string
          created_at?: string
          id?: string
          microchip_number?: string | null
          name?: string
          notes?: string | null
          species?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      canirando_events: {
        Row: {
          capacity: number
          created_at: string
          day: Database["public"]["Enums"]["work_day"]
          description: string | null
          duration_hours: number
          event_date: string
          id: string
          location: string | null
          price_per_dog: number | null
          start_block: Database["public"]["Enums"]["time_block"]
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          day: Database["public"]["Enums"]["work_day"]
          description?: string | null
          duration_hours?: number
          event_date: string
          id?: string
          location?: string | null
          price_per_dog?: number | null
          start_block: Database["public"]["Enums"]["time_block"]
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          day?: Database["public"]["Enums"]["work_day"]
          description?: string | null
          duration_hours?: number
          event_date?: string
          id?: string
          location?: string | null
          price_per_dog?: number | null
          start_block?: Database["public"]["Enums"]["time_block"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      canirando_participants: {
        Row: {
          animal_id: string
          canirando_id: string
          created_at: string
          id: string
          is_confirmed: boolean
          user_id: string
        }
        Insert: {
          animal_id: string
          canirando_id: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          user_id: string
        }
        Update: {
          animal_id?: string
          canirando_id?: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canirando_participants_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canirando_participants_canirando_id_fkey"
            columns: ["canirando_id"]
            isOneToOne: false
            referencedRelation: "canirando_events"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dog_routines: {
        Row: {
          animal_id: string
          behavior_notes: string | null
          created_at: string
          id: string
          is_active: boolean
          preferred_days: Database["public"]["Enums"]["work_day"][] | null
          routine_type: Database["public"]["Enums"]["routine_type"]
          sector: Database["public"]["Enums"]["geographic_sector"] | null
          special_requirements: string | null
          time_preference: Database["public"]["Enums"]["time_preference"]
          updated_at: string
          user_id: string
          walk_type_preference: Database["public"]["Enums"]["walk_type"]
        }
        Insert: {
          animal_id: string
          behavior_notes?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          preferred_days?: Database["public"]["Enums"]["work_day"][] | null
          routine_type?: Database["public"]["Enums"]["routine_type"]
          sector?: Database["public"]["Enums"]["geographic_sector"] | null
          special_requirements?: string | null
          time_preference?: Database["public"]["Enums"]["time_preference"]
          updated_at?: string
          user_id: string
          walk_type_preference?: Database["public"]["Enums"]["walk_type"]
        }
        Update: {
          animal_id?: string
          behavior_notes?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          preferred_days?: Database["public"]["Enums"]["work_day"][] | null
          routine_type?: Database["public"]["Enums"]["routine_type"]
          sector?: Database["public"]["Enums"]["geographic_sector"] | null
          special_requirements?: string | null
          time_preference?: Database["public"]["Enums"]["time_preference"]
          updated_at?: string
          user_id?: string
          walk_type_preference?: Database["public"]["Enums"]["walk_type"]
        }
        Relationships: [
          {
            foreignKeyName: "dog_routines_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: true
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          date: string
          description: string
          id: string
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          date?: string
          description?: string
          id?: string
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_assignments: {
        Row: {
          animal_id: string
          created_at: string
          group_id: string
          id: string
          is_completed: boolean
          is_confirmed: boolean
          notes: string | null
          updated_at: string
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          animal_id: string
          created_at?: string
          group_id: string
          id?: string
          is_completed?: boolean
          is_confirmed?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          animal_id?: string
          created_at?: string
          group_id?: string
          id?: string
          is_completed?: boolean
          is_confirmed?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_assignments_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "walk_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          activity_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number | null
          unit_price: number
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number | null
          unit_price?: number
          user_id: string
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subtotal: number
          tax_amount: number | null
          tax_rate: number
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          company_name: string | null
          company_notes: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          first_name: string | null
          iban: string | null
          id: string
          invoice_prefix: string | null
          last_name: string | null
          payment_delay_days: number | null
          phone: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          company_notes?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          first_name?: string | null
          iban?: string | null
          id: string
          invoice_prefix?: string | null
          last_name?: string | null
          payment_delay_days?: number | null
          phone?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          company_notes?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          first_name?: string | null
          iban?: string | null
          id?: string
          invoice_prefix?: string | null
          last_name?: string | null
          payment_delay_days?: number | null
          phone?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      walk_groups: {
        Row: {
          block: Database["public"]["Enums"]["time_block"]
          created_at: string
          day: Database["public"]["Enums"]["work_day"]
          default_capacity: number
          default_sector:
            | Database["public"]["Enums"]["geographic_sector"]
            | null
          end_time: string
          id: string
          notes: string | null
          pickup_duration_minutes: number
          return_duration_minutes: number
          start_time: string
          updated_at: string
          user_id: string
          walk_duration_minutes: number
        }
        Insert: {
          block: Database["public"]["Enums"]["time_block"]
          created_at?: string
          day: Database["public"]["Enums"]["work_day"]
          default_capacity?: number
          default_sector?:
            | Database["public"]["Enums"]["geographic_sector"]
            | null
          end_time: string
          id: string
          notes?: string | null
          pickup_duration_minutes?: number
          return_duration_minutes?: number
          start_time: string
          updated_at?: string
          user_id: string
          walk_duration_minutes?: number
        }
        Update: {
          block?: Database["public"]["Enums"]["time_block"]
          created_at?: string
          day?: Database["public"]["Enums"]["work_day"]
          default_capacity?: number
          default_sector?:
            | Database["public"]["Enums"]["geographic_sector"]
            | null
          end_time?: string
          id?: string
          notes?: string | null
          pickup_duration_minutes?: number
          return_duration_minutes?: number
          start_time?: string
          updated_at?: string
          user_id?: string
          walk_duration_minutes?: number
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: {
          block_reason: string | null
          capacity: number
          created_at: string
          group_id: string
          id: string
          is_blocked: boolean
          notes: string | null
          sector: Database["public"]["Enums"]["geographic_sector"] | null
          updated_at: string
          user_id: string
          walk_type: Database["public"]["Enums"]["walk_type"]
          week_number: number
          year: number
        }
        Insert: {
          block_reason?: string | null
          capacity?: number
          created_at?: string
          group_id: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          sector?: Database["public"]["Enums"]["geographic_sector"] | null
          updated_at?: string
          user_id: string
          walk_type?: Database["public"]["Enums"]["walk_type"]
          week_number: number
          year: number
        }
        Update: {
          block_reason?: string | null
          capacity?: number
          created_at?: string
          group_id?: string
          id?: string
          is_blocked?: boolean
          notes?: string | null
          sector?: Database["public"]["Enums"]["geographic_sector"] | null
          updated_at?: string
          user_id?: string
          walk_type?: Database["public"]["Enums"]["walk_type"]
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "walk_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      owns_client: { Args: { _client_id: string }; Returns: boolean }
    }
    Enums: {
      activity_status: "planned" | "done" | "invoiced" | "cancelled"
      expense_category:
        | "fuel"
        | "vehicle_maintenance"
        | "dog_equipment"
        | "insurance"
        | "phone"
        | "accounting"
        | "training"
        | "other"
      geographic_sector: "S1" | "S2" | "S3"
      payment_status: "draft" | "sent" | "paid" | "overdue"
      routine_type: "R1" | "R2" | "R3" | "ROUTINE_PLUS" | "PONCTUEL"
      service_type:
        | "individual_walk"
        | "group_walk"
        | "education"
        | "dog_sitting"
        | "transport"
        | "other"
        | "custom_walk"
      time_block: "B1" | "B2" | "B3"
      time_preference: "MATIN" | "MIDI" | "APRESMIDI" | "INDIFFERENT"
      walk_type: "COLLECTIVE" | "INDIVIDUELLE" | "CANIRANDO" | "SUR_MESURE"
      work_day: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi"
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
      activity_status: ["planned", "done", "invoiced", "cancelled"],
      expense_category: [
        "fuel",
        "vehicle_maintenance",
        "dog_equipment",
        "insurance",
        "phone",
        "accounting",
        "training",
        "other",
      ],
      geographic_sector: ["S1", "S2", "S3"],
      payment_status: ["draft", "sent", "paid", "overdue"],
      routine_type: ["R1", "R2", "R3", "ROUTINE_PLUS", "PONCTUEL"],
      service_type: [
        "individual_walk",
        "group_walk",
        "education",
        "dog_sitting",
        "transport",
        "other",
        "custom_walk",
      ],
      time_block: ["B1", "B2", "B3"],
      time_preference: ["MATIN", "MIDI", "APRESMIDI", "INDIFFERENT"],
      walk_type: ["COLLECTIVE", "INDIVIDUELLE", "CANIRANDO", "SUR_MESURE"],
      work_day: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    },
  },
} as const
