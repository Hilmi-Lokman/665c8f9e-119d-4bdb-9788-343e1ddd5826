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
      attendance_records: {
        Row: {
          anomaly_flag: boolean
          anomaly_score: number | null
          ap_id: string
          ap_switches: number
          attendance_duration_minutes: number | null
          avg_rssi: number
          class_name: string | null
          created_at: string
          device_hash: string | null
          device_id: string
          duration_seconds: number
          id: string
          is_absent: boolean | null
          matric_number: string | null
          rssi_std: number | null
          schedule_id: string | null
          session_duration: string | null
          session_id: string | null
          status: string | null
          student_name: string | null
          updated_at: string
        }
        Insert: {
          anomaly_flag?: boolean
          anomaly_score?: number | null
          ap_id: string
          ap_switches?: number
          attendance_duration_minutes?: number | null
          avg_rssi?: number
          class_name?: string | null
          created_at?: string
          device_hash?: string | null
          device_id: string
          duration_seconds?: number
          id?: string
          is_absent?: boolean | null
          matric_number?: string | null
          rssi_std?: number | null
          schedule_id?: string | null
          session_duration?: string | null
          session_id?: string | null
          status?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Update: {
          anomaly_flag?: boolean
          anomaly_score?: number | null
          ap_id?: string
          ap_switches?: number
          attendance_duration_minutes?: number | null
          avg_rssi?: number
          class_name?: string | null
          created_at?: string
          device_hash?: string | null
          device_id?: string
          duration_seconds?: number
          id?: string
          is_absent?: boolean | null
          matric_number?: string | null
          rssi_std?: number | null
          schedule_id?: string | null
          session_duration?: string | null
          session_id?: string | null
          status?: string | null
          student_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_control: {
        Row: {
          active_session_id: string | null
          id: number
          should_capture: boolean
          updated_at: string | null
        }
        Insert: {
          active_session_id?: string | null
          id?: number
          should_capture?: boolean
          updated_at?: string | null
        }
        Update: {
          active_session_id?: string | null
          id?: number
          should_capture?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capture_control_active_session_id_fkey"
            columns: ["active_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_code: string
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean
          schedule_id: string | null
          start_time: string
          subject_name: string
          updated_at: string
        }
        Insert: {
          class_code: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          schedule_id?: string | null
          start_time?: string
          subject_name: string
          updated_at?: string
        }
        Update: {
          class_code?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          schedule_id?: string | null
          start_time?: string
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_captures: {
        Row: {
          ap_id: string
          created_at: string
          device_id: string
          id: string
          rssi: number
          timestamp: string
        }
        Insert: {
          ap_id: string
          created_at?: string
          device_id: string
          id?: string
          rssi?: number
          timestamp?: string
        }
        Update: {
          ap_id?: string
          created_at?: string
          device_id?: string
          id?: string
          rssi?: number
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registered_devices: {
        Row: {
          class_name: string | null
          created_at: string
          device_hash: string | null
          device_id: string
          id: string
          matric_number: string
          student_name: string
          updated_at: string
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          device_hash?: string | null
          device_id: string
          id?: string
          matric_number: string
          student_name: string
          updated_at?: string
        }
        Update: {
          class_name?: string | null
          created_at?: string
          device_hash?: string | null
          device_id?: string
          id?: string
          matric_number?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          class_code: string
          created_at: string | null
          day_of_week: number
          duration_minutes: number | null
          id: string
          instructor: string | null
          is_active: boolean | null
          location: string | null
          subject_name: string
          time_end: string
          time_start: string
          updated_at: string | null
        }
        Insert: {
          class_code: string
          created_at?: string | null
          day_of_week: number
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          subject_name: string
          time_end: string
          time_start: string
          updated_at?: string | null
        }
        Update: {
          class_code?: string
          created_at?: string | null
          day_of_week?: number
          duration_minutes?: number | null
          id?: string
          instructor?: string | null
          is_active?: boolean | null
          location?: string | null
          subject_name?: string
          time_end?: string
          time_start?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_capture_control_status: {
        Args: never
        Returns: {
          should_capture: boolean
          updated_at: string
        }[]
      }
      set_capture_control:
        | { Args: { start_capture: boolean }; Returns: Json }
        | {
            Args: { session_id?: string; start_capture: boolean }
            Returns: Json
          }
    }
    Enums: {
      app_role: "admin" | "lecturer"
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
      app_role: ["admin", "lecturer"],
    },
  },
} as const
