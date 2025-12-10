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
      leads: {
        Row: {
          annual_revenue: string | null
          apollo_not_found: boolean | null
          category: string
          city: string | null
          company: string | null
          company_contacts: Json | null
          company_industry: string | null
          confirm_vehicles_50_plus: string | null
          contact_email: string | null
          contact_email_personal: boolean | null
          created_at: string | null
          description: string | null
          diagnosed_at: string | null
          diagnosis_category: string | null
          diagnosis_confidence: string | null
          diagnosis_explanation: string | null
          diagnosis_recommendation: string | null
          distance_confidence: string | null
          distance_miles: number | null
          dma: string | null
          domain: string | null
          domain_relevance_explanation: string | null
          domain_relevance_score: number | null
          email: string | null
          email_domain_validated: boolean | null
          enriched_at: string | null
          enrichment_confidence: number | null
          enrichment_logs: Json | null
          enrichment_source: string | null
          enrichment_status: string | null
          facebook: string | null
          facebook_confidence: number | null
          facebook_source_url: string | null
          facebook_validated: boolean | null
          features: string | null
          founded_date: string | null
          full_name: string
          id: string
          industry_relevance_explanation: string | null
          industry_relevance_score: number | null
          instagram: string | null
          instagram_confidence: number | null
          instagram_source_url: string | null
          instagram_validated: boolean | null
          latitude: number | null
          linkedin: string | null
          linkedin_confidence: number | null
          linkedin_source_url: string | null
          linkedin_validated: boolean | null
          logo_url: string | null
          longitude: number | null
          match_score: number | null
          match_score_source: string | null
          mics_sector: string | null
          mics_segment: string | null
          mics_subsector: string | null
          news: string | null
          phone: string | null
          products_services: string | null
          scraped_data_log: Json | null
          short_summary: string | null
          size: string | null
          social_validation_log: Json | null
          source_url: string | null
          state: string | null
          tech_stack: string | null
          truck_types: string | null
          updated_at: string | null
          user_id: string
          vehicle_tracking_interest_explanation: string | null
          vehicle_tracking_interest_score: number | null
          vehicles_count: string | null
          zipcode: string | null
        }
        Insert: {
          annual_revenue?: string | null
          apollo_not_found?: boolean | null
          category?: string
          city?: string | null
          company?: string | null
          company_contacts?: Json | null
          company_industry?: string | null
          confirm_vehicles_50_plus?: string | null
          contact_email?: string | null
          contact_email_personal?: boolean | null
          created_at?: string | null
          description?: string | null
          diagnosed_at?: string | null
          diagnosis_category?: string | null
          diagnosis_confidence?: string | null
          diagnosis_explanation?: string | null
          diagnosis_recommendation?: string | null
          distance_confidence?: string | null
          distance_miles?: number | null
          dma?: string | null
          domain?: string | null
          domain_relevance_explanation?: string | null
          domain_relevance_score?: number | null
          email?: string | null
          email_domain_validated?: boolean | null
          enriched_at?: string | null
          enrichment_confidence?: number | null
          enrichment_logs?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          facebook?: string | null
          facebook_confidence?: number | null
          facebook_source_url?: string | null
          facebook_validated?: boolean | null
          features?: string | null
          founded_date?: string | null
          full_name: string
          id?: string
          industry_relevance_explanation?: string | null
          industry_relevance_score?: number | null
          instagram?: string | null
          instagram_confidence?: number | null
          instagram_source_url?: string | null
          instagram_validated?: boolean | null
          latitude?: number | null
          linkedin?: string | null
          linkedin_confidence?: number | null
          linkedin_source_url?: string | null
          linkedin_validated?: boolean | null
          logo_url?: string | null
          longitude?: number | null
          match_score?: number | null
          match_score_source?: string | null
          mics_sector?: string | null
          mics_segment?: string | null
          mics_subsector?: string | null
          news?: string | null
          phone?: string | null
          products_services?: string | null
          scraped_data_log?: Json | null
          short_summary?: string | null
          size?: string | null
          social_validation_log?: Json | null
          source_url?: string | null
          state?: string | null
          tech_stack?: string | null
          truck_types?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_tracking_interest_explanation?: string | null
          vehicle_tracking_interest_score?: number | null
          vehicles_count?: string | null
          zipcode?: string | null
        }
        Update: {
          annual_revenue?: string | null
          apollo_not_found?: boolean | null
          category?: string
          city?: string | null
          company?: string | null
          company_contacts?: Json | null
          company_industry?: string | null
          confirm_vehicles_50_plus?: string | null
          contact_email?: string | null
          contact_email_personal?: boolean | null
          created_at?: string | null
          description?: string | null
          diagnosed_at?: string | null
          diagnosis_category?: string | null
          diagnosis_confidence?: string | null
          diagnosis_explanation?: string | null
          diagnosis_recommendation?: string | null
          distance_confidence?: string | null
          distance_miles?: number | null
          dma?: string | null
          domain?: string | null
          domain_relevance_explanation?: string | null
          domain_relevance_score?: number | null
          email?: string | null
          email_domain_validated?: boolean | null
          enriched_at?: string | null
          enrichment_confidence?: number | null
          enrichment_logs?: Json | null
          enrichment_source?: string | null
          enrichment_status?: string | null
          facebook?: string | null
          facebook_confidence?: number | null
          facebook_source_url?: string | null
          facebook_validated?: boolean | null
          features?: string | null
          founded_date?: string | null
          full_name?: string
          id?: string
          industry_relevance_explanation?: string | null
          industry_relevance_score?: number | null
          instagram?: string | null
          instagram_confidence?: number | null
          instagram_source_url?: string | null
          instagram_validated?: boolean | null
          latitude?: number | null
          linkedin?: string | null
          linkedin_confidence?: number | null
          linkedin_source_url?: string | null
          linkedin_validated?: boolean | null
          logo_url?: string | null
          longitude?: number | null
          match_score?: number | null
          match_score_source?: string | null
          mics_sector?: string | null
          mics_segment?: string | null
          mics_subsector?: string | null
          news?: string | null
          phone?: string | null
          products_services?: string | null
          scraped_data_log?: Json | null
          short_summary?: string | null
          size?: string | null
          social_validation_log?: Json | null
          source_url?: string | null
          state?: string | null
          tech_stack?: string | null
          truck_types?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_tracking_interest_explanation?: string | null
          vehicle_tracking_interest_score?: number | null
          vehicles_count?: string | null
          zipcode?: string | null
        }
        Relationships: []
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
