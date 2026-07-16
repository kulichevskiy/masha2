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
      admin_emails: {
        Row: {
          added_at: string
          email: string
        }
        Insert: {
          added_at?: string
          email: string
        }
        Update: {
          added_at?: string
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      booking_faq: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_visible: boolean
          position: number
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string | null
          tier_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          tier_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string | null
          tier_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "booking_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_tiers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_accent: boolean
          is_active: boolean
          name: string
          position: number
          price_text: string
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_accent?: boolean
          is_active?: boolean
          name: string
          position?: number
          price_text: string
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_accent?: boolean
          is_active?: boolean
          name?: string
          position?: number
          price_text?: string
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gift_certificate: {
        Row: {
          amounts: Json
          body: string | null
          created_at: string
          gallery: Json
          id: string
          is_visible: boolean
          updated_at: string
        }
        Insert: {
          amounts?: Json
          body?: string | null
          created_at?: string
          gallery?: Json
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Update: {
          amounts?: Json
          body?: string | null
          created_at?: string
          gallery?: Json
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      gift_certificate_requests: {
        Row: {
          amount: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          amount?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          amount?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      photos: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          id: string
          pages: string[]
          position: number
          storage_path: string
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pages?: string[]
          position?: number
          storage_path: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pages?: string[]
          position?: number
          storage_path?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workshop: {
        Row: {
          apply_heading: string | null
          apply_intro: string | null
          closed_heading: string | null
          closed_intro: string | null
          created_at: string
          dates: string | null
          days: Json
          faq: Json
          gallery: Json
          hero_photo_path: string | null
          id: string
          intro: string | null
          location: string | null
          price: string | null
          program: Json
          sales_open: boolean
          seats: string | null
          tagline: string | null
          tariffs: Json
          tariffs_intro: string | null
          the_idea_heading: string | null
          the_idea_quote: string | null
          title: string | null
          updated_at: string
          workshop_number: string | null
        }
        Insert: {
          apply_heading?: string | null
          apply_intro?: string | null
          closed_heading?: string | null
          closed_intro?: string | null
          created_at?: string
          dates?: string | null
          days?: Json
          faq?: Json
          gallery?: Json
          hero_photo_path?: string | null
          id?: string
          intro?: string | null
          location?: string | null
          price?: string | null
          program?: Json
          sales_open?: boolean
          seats?: string | null
          tagline?: string | null
          tariffs?: Json
          tariffs_intro?: string | null
          the_idea_heading?: string | null
          the_idea_quote?: string | null
          title?: string | null
          updated_at?: string
          workshop_number?: string | null
        }
        Update: {
          apply_heading?: string | null
          apply_intro?: string | null
          closed_heading?: string | null
          closed_intro?: string | null
          created_at?: string
          dates?: string | null
          days?: Json
          faq?: Json
          gallery?: Json
          hero_photo_path?: string | null
          id?: string
          intro?: string | null
          location?: string | null
          price?: string | null
          program?: Json
          sales_open?: boolean
          seats?: string | null
          tagline?: string | null
          tariffs?: Json
          tariffs_intro?: string | null
          the_idea_heading?: string | null
          the_idea_quote?: string | null
          title?: string | null
          updated_at?: string
          workshop_number?: string | null
        }
        Relationships: []
      }
      workshop_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          instagram: string | null
          intake: string | null
          ip_hash: string | null
          message: string | null
          name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instagram?: string | null
          intake?: string | null
          ip_hash?: string | null
          message?: string | null
          name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instagram?: string | null
          intake?: string | null
          ip_hash?: string | null
          message?: string | null
          name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      workshop_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
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
