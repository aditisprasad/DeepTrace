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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attack_techniques: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          evidence_id: string | null
          id: string
          name: string
          observed_behavior: string
          organization_id: string
          tactic: string
          technique_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by: string
          evidence_id?: string | null
          id?: string
          name: string
          observed_behavior?: string
          organization_id: string
          tactic?: string
          technique_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          evidence_id?: string | null
          id?: string
          name?: string
          observed_behavior?: string
          organization_id?: string
          tactic?: string
          technique_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attack_techniques_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "attack_techniques_evidence_id_organization_id_case_id_fkey"
            columns: ["evidence_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "attack_techniques_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          case_id: string | null
          created_at: string
          details: Json
          id: string
          object_id: string | null
          object_type: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          case_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          object_id?: string | null
          object_type: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          case_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          object_id?: string | null
          object_type?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_entities: {
        Row: {
          campaign_id: string
          case_id: string
          created_at: string
          entity_id: string
          organization_id: string
        }
        Insert: {
          campaign_id: string
          case_id: string
          created_at?: string
          entity_id: string
          organization_id: string
        }
        Update: {
          campaign_id?: string
          case_id?: string
          created_at?: string
          entity_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_entities_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_entities_entity_id_organization_id_case_id_fkey"
            columns: ["entity_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "campaign_entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          case_id: string
          confidence: number | null
          created_at: string
          first_observed: string | null
          id: string
          last_observed: string | null
          name: string
          organization_id: string
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          case_id: string
          confidence?: number | null
          created_at?: string
          first_observed?: string | null
          id?: string
          last_observed?: string | null
          name: string
          organization_id: string
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          confidence?: number | null
          created_at?: string
          first_observed?: string | null
          id?: string
          last_observed?: string | null
          name?: string
          organization_id?: string
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_members: {
        Row: {
          case_id: string
          created_at: string
          organization_id: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          organization_id: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_members_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "case_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_to: string | null
          case_code: string
          created_at: string
          created_by: string
          description: string
          id: string
          organization_id: string
          priority: number
          severity: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_code: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          organization_id: string
          priority?: number
          severity?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_code?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          organization_id?: string
          priority?: number
          severity?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          case_id: string
          confidence: number | null
          created_at: string
          entity_type: string
          first_observed: string | null
          id: string
          last_observed: string | null
          organization_id: string
          updated_at: string
          value: string
        }
        Insert: {
          case_id: string
          confidence?: number | null
          created_at?: string
          entity_type: string
          first_observed?: string | null
          id?: string
          last_observed?: string | null
          organization_id: string
          updated_at?: string
          value: string
        }
        Update: {
          case_id?: string
          confidence?: number | null
          created_at?: string
          entity_type?: string
          first_observed?: string | null
          id?: string
          last_observed?: string | null
          organization_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "entities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_observations: {
        Row: {
          case_id: string
          created_at: string
          details: Json
          entity_id: string
          evidence_id: string | null
          id: string
          observed_at: string
          organization_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          details?: Json
          entity_id: string
          evidence_id?: string | null
          id?: string
          observed_at?: string
          organization_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          details?: Json
          entity_id?: string
          evidence_id?: string | null
          id?: string
          observed_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_observations_entity_id_organization_id_case_id_fkey"
            columns: ["entity_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "entity_observations_evidence_id_organization_id_case_id_fkey"
            columns: ["evidence_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "entity_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          analyst_notes: string
          case_id: string
          collected_at: string
          confidence: number | null
          content_type: string | null
          created_at: string
          created_by: string
          evidence_code: string
          id: string
          organization_id: string
          original_name: string | null
          sha256: string | null
          size_bytes: number | null
          source: string
          status: string
          storage_path: string | null
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          analyst_notes?: string
          case_id: string
          collected_at?: string
          confidence?: number | null
          content_type?: string | null
          created_at?: string
          created_by: string
          evidence_code: string
          id?: string
          organization_id: string
          original_name?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          type: string
          updated_at?: string
          value?: string
        }
        Update: {
          analyst_notes?: string
          case_id?: string
          collected_at?: string
          confidence?: number | null
          content_type?: string | null
          created_at?: string
          created_by?: string
          evidence_code?: string
          id?: string
          organization_id?: string
          original_name?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source?: string
          status?: string
          storage_path?: string | null
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_sources: {
        Row: {
          case_id: string
          collected_at: string
          created_at: string
          details: Json
          evidence_id: string
          id: string
          organization_id: string
          source_type: string
          source_uri: string | null
        }
        Insert: {
          case_id: string
          collected_at?: string
          created_at?: string
          details?: Json
          evidence_id: string
          id?: string
          organization_id: string
          source_type?: string
          source_uri?: string | null
        }
        Update: {
          case_id?: string
          collected_at?: string
          created_at?: string
          details?: Json
          evidence_id?: string
          id?: string
          organization_id?: string
          source_type?: string
          source_uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_sources_evidence_id_organization_id_case_id_fkey"
            columns: ["evidence_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "evidence_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_evidence: {
        Row: {
          case_id: string
          created_at: string
          evidence_id: string
          finding_id: string
          organization_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          evidence_id: string
          finding_id: string
          organization_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          evidence_id?: string
          finding_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_evidence_evidence_id_organization_id_case_id_fkey"
            columns: ["evidence_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "finding_evidence_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          assessment: string
          case_id: string
          confidence: number | null
          created_at: string
          created_by: string
          executive_summary: string
          finding_code: string
          id: string
          limitations: string
          organization_id: string
          recommended_next_steps: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment?: string
          case_id: string
          confidence?: number | null
          created_at?: string
          created_by: string
          executive_summary?: string
          finding_code: string
          id?: string
          limitations?: string
          organization_id: string
          recommended_next_steps?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment?: string
          case_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string
          executive_summary?: string
          finding_code?: string
          id?: string
          limitations?: string
          organization_id?: string
          recommended_next_steps?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "findings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          case_id: string
          confidence: number | null
          created_at: string
          id: string
          organization_id: string
          rationale: string
          relationship_type: string
          source_entity_id: string
          target_entity_id: string
        }
        Insert: {
          case_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          organization_id: string
          rationale?: string
          relationship_type?: string
          source_entity_id: string
          target_entity_id: string
        }
        Update: {
          case_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          rationale?: string
          relationship_type?: string
          source_entity_id?: string
          target_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_entity_id_organization_id_case_id_fkey"
            columns: ["source_entity_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "relationships_target_entity_id_organization_id_case_id_fkey"
            columns: ["target_entity_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          case_id: string
          confidence: number | null
          created_at: string
          description: string
          entity_id: string | null
          event_type: string
          evidence_id: string | null
          id: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          case_id: string
          confidence?: number | null
          created_at?: string
          description?: string
          entity_id?: string | null
          event_type: string
          evidence_id?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
        }
        Update: {
          case_id?: string
          confidence?: number | null
          created_at?: string
          description?: string
          entity_id?: string | null
          event_type?: string
          evidence_id?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_case_id_organization_id_fkey"
            columns: ["case_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "timeline_events_entity_id_organization_id_case_id_fkey"
            columns: ["entity_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "timeline_events_evidence_id_organization_id_case_id_fkey"
            columns: ["evidence_id", "organization_id", "case_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id", "organization_id", "case_id"]
          },
          {
            foreignKeyName: "timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _organization_id: string
          _roles?: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "lead_analyst" | "analyst" | "viewer"
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
    Enums: {
      app_role: ["admin", "lead_analyst", "analyst", "viewer"],
    },
  },
} as const
