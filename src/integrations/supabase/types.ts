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
      bills: {
        Row: {
          created_at: string
          id: string
          item_count: number
          lines: Json
          status: string
          table_id: string
          table_label: string
          total: number
        }
        Insert: {
          created_at?: string
          id: string
          item_count: number
          lines: Json
          status?: string
          table_id: string
          table_label: string
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          item_count?: number
          lines?: Json
          status?: string
          table_id?: string
          table_label?: string
          total?: number
        }
        Relationships: []
      }
      customer_sessions: {
        Row: {
          active_order_id: string | null
          created_at: string
          customer_mobile: string | null
          customer_name: string | null
          expires_at: string
          id: string
          location_id: string | null
          qr_id: string | null
        }
        Insert: {
          active_order_id?: string | null
          created_at?: string
          customer_mobile?: string | null
          customer_name?: string | null
          expires_at?: string
          id?: string
          location_id?: string | null
          qr_id?: string | null
        }
        Update: {
          active_order_id?: string | null
          created_at?: string
          customer_mobile?: string | null
          customer_name?: string | null
          expires_at?: string
          id?: string
          location_id?: string | null
          qr_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inventory_logs: {
        Row: {
          created_at: string
          id: string
          items: Json
          note: string | null
          shift_type: string
          staff_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          note?: string | null
          shift_type: string
          staff_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          note?: string | null
          shift_type?: string
          staff_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          note: string | null
          pay_type: string | null
          quantity: number | null
          spent_at: string
          subcategory: string | null
          unit: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          id?: string
          note?: string | null
          pay_type?: string | null
          quantity?: number | null
          spent_at?: string
          subcategory?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          note?: string | null
          pay_type?: string | null
          quantity?: number | null
          spent_at?: string
          subcategory?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          low_stock_threshold: number
          name: string
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          id?: string
          low_stock_threshold?: number
          name: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          id?: string
          low_stock_threshold?: number
          name?: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      kot_items: {
        Row: {
          id: string
          kot_id: string
          name: string
          notes: string | null
          qty: number
        }
        Insert: {
          id?: string
          kot_id: string
          name: string
          notes?: string | null
          qty: number
        }
        Update: {
          id?: string
          kot_id?: string
          name?: string
          notes?: string | null
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "kot_items_kot_id_fkey"
            columns: ["kot_id"]
            isOneToOne: false
            referencedRelation: "kots"
            referencedColumns: ["id"]
          },
        ]
      }
      kot_sections: {
        Row: {
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          id: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      kots: {
        Row: {
          created_at: string
          id: string
          order_id: string
          print_status: string
          printed_at: string | null
          revision: number
          section_id: string
          section_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          print_status?: string
          printed_at?: string | null
          revision?: number
          section_id: string
          section_name: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          print_status?: string
          printed_at?: string | null
          revision?: number
          section_id?: string
          section_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kots_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active_order_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          location_type: string
          qr_id: string
          short: string
          sort_order: number
          status: string
          table_number: number | null
          updated_at: string
        }
        Insert: {
          active_order_id?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          label: string
          location_type: string
          qr_id?: string
          short: string
          sort_order?: number
          status?: string
          table_number?: number | null
          updated_at?: string
        }
        Update: {
          active_order_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          location_type?: string
          qr_id?: string
          short?: string
          sort_order?: number
          status?: string
          table_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          emoji: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          emoji?: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          is_veg: boolean | null
          kot_section: string | null
          name: string
          prep_time_min: number | null
          price: number
          sort_order: number
          visibility: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_veg?: boolean | null
          kot_section?: string | null
          name: string
          prep_time_min?: number | null
          price: number
          sort_order?: number
          visibility?: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_veg?: boolean | null
          kot_section?: string | null
          name?: string
          prep_time_min?: number | null
          price?: number
          sort_order?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          kot_section: string | null
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          price: number
          qty: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kot_section?: string | null
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          price: number
          qty?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          kot_section?: string | null
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          price?: number
          qty?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          closed_at: string | null
          created_at: string
          customer_mobile: string | null
          customer_name: string | null
          discount_amount: number
          discount_pct: number
          id: string
          location_id: string | null
          location_label: string
          location_type: string
          notes: string | null
          order_no: string
          order_type: string
          paid_at: string | null
          payment_mode: string | null
          reject_reason: string | null
          session_id: string | null
          status: string
          subtotal: number
          tax: number
          token_number: number | null
          total: number
          tracking_token: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          customer_mobile?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_pct?: number
          id?: string
          location_id?: string | null
          location_label: string
          location_type: string
          notes?: string | null
          order_no: string
          order_type: string
          paid_at?: string | null
          payment_mode?: string | null
          reject_reason?: string | null
          session_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          token_number?: number | null
          total?: number
          tracking_token?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          customer_mobile?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_pct?: number
          id?: string
          location_id?: string | null
          location_label?: string
          location_type?: string
          notes?: string | null
          order_no?: string
          order_type?: string
          paid_at?: string | null
          payment_mode?: string | null
          reject_reason?: string | null
          session_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          token_number?: number | null
          total?: number
          tracking_token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mode: string
          order_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mode?: string
          order_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mode?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          entered_at: string
          id: string
          image_url: string | null
          items: Json
          supplier: string | null
        }
        Insert: {
          entered_at?: string
          id?: string
          image_url?: string | null
          items?: Json
          supplier?: string | null
        }
        Update: {
          entered_at?: string
          id?: string
          image_url?: string | null
          items?: Json
          supplier?: string | null
        }
        Relationships: []
      }
      sales_report_bills: {
        Row: {
          created_at: string
          id: string
          item_count: number
          lines: Json
          status: string
          table_id: string
          table_label: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          item_count?: number
          lines?: Json
          status?: string
          table_id: string
          table_label: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_count?: number
          lines?: Json
          status?: string
          table_id?: string
          table_label?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      table_orders: {
        Row: {
          lines: Json
          started_at: string
          table_id: string
          table_label: string
          updated_at: string
        }
        Insert: {
          lines?: Json
          started_at?: string
          table_id: string
          table_label: string
          updated_at?: string
        }
        Update: {
          lines?: Json
          started_at?: string
          table_id?: string
          table_label?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      sales_report_items: {
        Row: {
          amount: number | null
          bill_id: string | null
          created_at: string | null
          item_name: string | null
          qty: number | null
          table_label: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_order_items: {
        Args: { p_items: Json; p_order_id: string }
        Returns: Json
      }
      generate_kots: { Args: { p_order_id: string }; Returns: number }
      get_location_by_qr: { Args: { p_qr: string }; Returns: Json }
      get_order_by_tracking: { Args: { p_token: string }; Returns: Json }
      next_bill_number: { Args: never; Returns: string }
      next_order_no: { Args: never; Returns: string }
      next_token_number: { Args: never; Returns: number }
      place_order: {
        Args: {
          p_customer_mobile: string
          p_customer_name: string
          p_discount_pct?: number
          p_items: Json
          p_location_id: string
          p_notes?: string
          p_order_type: string
          p_session_id?: string
        }
        Returns: Json
      }
      record_payment: {
        Args: { p_amount?: number; p_mode: string; p_order_id: string }
        Returns: Json
      }
      set_order_status: {
        Args: { p_note?: string; p_order_id: string; p_status: string }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
