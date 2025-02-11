export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_type: string | null
          created_at: string
          id: string
          is_blocked: boolean | null
          user_id: string
        }
        Insert: {
          admin_type?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          user_id: string
        }
        Update: {
          admin_type?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_wallpapers: {
        Row: {
          added_at: string
          collection_id: string
          wallpaper_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          wallpaper_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          wallpaper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_wallpapers_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_wallpapers_wallpaper_id_fkey"
            columns: ["wallpaper_id"]
            isOneToOne: false
            referencedRelation: "wallpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          url?: string
        }
        Relationships: []
      }
      paypal_one_time_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paypal_order_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          paypal_order_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paypal_order_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      paypal_orders: {
        Row: {
          amount: number
          created_at: string
          id: number
          order_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          order_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          order_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      paypal_subscription_logs: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paypal_order_id: string
          paypal_subscription_id: string
          status: string
          subscription_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          paypal_order_id: string
          paypal_subscription_id: string
          status: string
          subscription_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paypal_order_id?: string
          paypal_subscription_id?: string
          status?: string
          subscription_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paypal_subscription_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_subscriptions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          paypal_order_id: string | null
          paypal_subscription_id: string | null
          status: string
          subscription_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          status?: string
          subscription_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          paypal_order_id?: string | null
          paypal_subscription_id?: string | null
          status?: string
          subscription_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          id: string
          paypal_plan_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          paypal_plan_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          paypal_plan_id?: string
          type?: string
        }
        Relationships: []
      }
      secrets: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tags_stats: {
        Row: {
          download_count: number | null
          last_updated: string | null
          tag: string
        }
        Insert: {
          download_count?: number | null
          last_updated?: string | null
          tag: string
        }
        Update: {
          download_count?: number | null
          last_updated?: string | null
          tag?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          creator_code: string | null
          daily_downloads_remaining: number | null
          download_count: number | null
          email: string | null
          favor_collections: string[] | null
          favor_image: string[] | null
          id: string
          last_download_reset: string | null
          paypal_subscription_id: string | null
          subscription_status: string | null
          vip_expires_at: string | null
          vip_type: string | null
        }
        Insert: {
          created_at?: string
          creator_code?: string | null
          daily_downloads_remaining?: number | null
          download_count?: number | null
          email?: string | null
          favor_collections?: string[] | null
          favor_image?: string[] | null
          id: string
          last_download_reset?: string | null
          paypal_subscription_id?: string | null
          subscription_status?: string | null
          vip_expires_at?: string | null
          vip_type?: string | null
        }
        Update: {
          created_at?: string
          creator_code?: string | null
          daily_downloads_remaining?: number | null
          download_count?: number | null
          email?: string | null
          favor_collections?: string[] | null
          favor_image?: string[] | null
          id?: string
          last_download_reset?: string | null
          paypal_subscription_id?: string | null
          subscription_status?: string | null
          vip_expires_at?: string | null
          vip_type?: string | null
        }
        Relationships: []
      }
      vip_wallpapers: {
        Row: {
          created_at: string
          id: string
          wallpaper_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          wallpaper_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          wallpaper_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vip_wallpapers_wallpaper_id_fkey"
            columns: ["wallpaper_id"]
            isOneToOne: true
            referencedRelation: "wallpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallpapers: {
        Row: {
          compressed_url: string
          created_at: string
          download_count: number | null
          file_path: string
          id: string
          like_count: number | null
          tags: string[] | null
          type: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          compressed_url: string
          created_at?: string
          download_count?: number | null
          file_path: string
          id?: string
          like_count?: number | null
          tags?: string[] | null
          type: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          compressed_url?: string
          created_at?: string
          download_count?: number | null
          file_path?: string
          id?: string
          like_count?: number | null
          tags?: string[] | null
          type?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_tags_stats: {
        Row: {
          download_count: number | null
          last_updated: string | null
          tag: string | null
        }
        Insert: {
          download_count?: number | null
          last_updated?: string | null
          tag?: string | null
        }
        Update: {
          download_count?: number | null
          last_updated?: string | null
          tag?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_vip: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      reset_daily_downloads: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
