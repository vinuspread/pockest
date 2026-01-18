/**
 * Supabase 데이터베이스 타입 정의
 * schema.sql 기반 TypeScript 타입
 */

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
      profiles: {
        Row: {
          id: string;
          email: string;
          tier: 'free' | 'premium';
          affiliate_agreed?: boolean;
          is_banned?: boolean; // New
          country?: string | null; // New
          age_group?: string | null; // New
          gender?: string | null; // New
          last_ip?: string | null; // New
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tier?: 'free' | 'premium';
          affiliate_agreed?: boolean;
          is_banned?: boolean;
          country?: string | null;
          age_group?: string | null;
          gender?: string | null;
          last_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tier?: 'free' | 'premium';
          affiliate_agreed?: boolean;
          is_banned?: boolean;
          country?: string | null;
          age_group?: string | null;
          gender?: string | null;
          last_ip?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pockets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_default: boolean;
          is_public: boolean; // New
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          is_default?: boolean;
          is_public?: boolean; // New
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_default?: boolean;
          is_public?: boolean; // New
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pockets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          pocket_id: string | null;
          url: string;
          image_url: string | null;
          site_name: string | null;
          title: string;
          price: number | null;
          currency: string | null;
          is_pinned: boolean;
          memo: string | null;

          blurhash?: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          pocket_id?: string | null;
          url: string;
          image_url?: string | null;
          site_name?: string | null;
          title: string;
          price?: number | null;
          currency?: string | null;
          is_pinned?: boolean;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          blurhash?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          pocket_id?: string | null;
          url?: string;
          image_url?: string | null;
          site_name?: string | null;
          title?: string;
          price?: number | null;
          currency?: string | null;
          is_pinned?: boolean;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          blurhash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_pocket_id_fkey";
            columns: ["pocket_id"];
            isOneToOne: false;
            referencedRelation: "pockets";
            referencedColumns: ["id"];
          }
        ];
      };
      affiliate_platforms: {
        Row: {
          id: string;
          name: string;
          domains: string[];
          type: 'param_injection' | 'api_generation';
          config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          domains: string[];
          type: 'param_injection' | 'api_generation';
          config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          domains?: string[];
          type?: 'param_injection' | 'api_generation';
          config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      click_logs: {
        Row: {
          id: string;
          user_id: string | null;
          item_id: string | null;
          platform_id: string | null;
          original_url: string | null;
          affiliate_url: string | null;
          clicked_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          item_id?: string | null;
          platform_id?: string | null;
          original_url?: string | null;
          affiliate_url?: string | null;
          clicked_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          item_id?: string | null;
          platform_id?: string | null;
          original_url?: string | null;
          affiliate_url?: string | null;
          clicked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "click_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "click_logs_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "click_logs_platform_id_fkey";
            columns: ["platform_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_platforms";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      active_items: {
        Row: {
          id: string | null;
          user_id: string | null;
          pocket_id: string | null;
          url: string | null;
          image_url: string | null;
          site_name: string | null;
          title: string | null;
          price: number | null;
          currency: string | null;
          is_pinned: boolean | null;
          memo: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
          pocket_name: string | null;
        };
        Relationships: [];
      };
      trash_items: {
        Row: {
          id: string | null;
          user_id: string | null;
          pocket_id: string | null;
          url: string | null;
          image_url: string | null;
          site_name: string | null;
          title: string | null;
          price: number | null;
          currency: string | null;
          is_pinned: boolean | null;
          memo: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_today_items: {
        Args: { p_user_id: string };
        Returns: {
          id: string;
          user_id: string;
          pocket_id: string | null;
          url: string;
          image_url: string | null;
          site_name: string | null;
          title: string;
          price: number | null;
          currency: string | null;
          is_pinned: boolean;
          memo: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        }[];
      };
      move_item_to_trash: {
        Args: { p_item_id: string; p_user_id: string };
        Returns: boolean;
      };
      restore_item_from_trash: {
        Args: { p_item_id: string; p_user_id: string; p_pocket_id?: string };
        Returns: boolean;
      };
      empty_trash_older_than: {
        Args: { days?: number };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// 편의용 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Pocket = Database['public']['Tables']['pockets']['Row'];
export type PocketInsert = Database['public']['Tables']['pockets']['Insert'];
export type PocketUpdate = Database['public']['Tables']['pockets']['Update'];

export type Item = Database['public']['Tables']['items']['Row'];
export type ItemInsert = Database['public']['Tables']['items']['Insert'];
export type ItemUpdate = Database['public']['Tables']['items']['Update'];

export type ActiveItem = Database['public']['Views']['active_items']['Row'];
export type TrashItem = Database['public']['Views']['trash_items']['Row'];

// Tables helper type
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
