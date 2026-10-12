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
      collections: {
        Row: {
          created_at: string
          department: string
          description: string | null
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          order_id: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          store_id: string
          to_address: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          order_id: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          store_id: string
          to_address: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          order_id?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          store_id?: string
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_order_id_store_id_fkey"
            columns: ["order_id", "store_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "email_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor: string
          created_at: string
          detail: Json
          from_status: string | null
          id: string
          kind: string
          order_id: string
          store_id: string
          stripe_event_id: string | null
          to_status: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          detail?: Json
          from_status?: string | null
          id?: string
          kind: string
          order_id: string
          store_id: string
          stripe_event_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: Json
          from_status?: string | null
          id?: string
          kind?: string
          order_id?: string
          store_id?: string
          stripe_event_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_store_id_fkey"
            columns: ["order_id", "store_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "order_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          line_total_minor: number
          order_id: string
          quantity: number
          sku: string
          store_id: string
          title: string
          unit_price_minor: number
          variant_id: string | null
          variant_title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total_minor: number
          order_id: string
          quantity: number
          sku: string
          store_id: string
          title: string
          unit_price_minor: number
          variant_id?: string | null
          variant_title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          line_total_minor?: number
          order_id?: string
          quantity?: number
          sku?: string
          store_id?: string
          title?: string
          unit_price_minor?: number
          variant_id?: string | null
          variant_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_store_id_fkey"
            columns: ["order_id", "store_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_store_id_fkey"
            columns: ["variant_id", "store_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          number: string
          paid_at: string | null
          shipping_address: Json | null
          shipping_minor: number
          status: string
          store_id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          number: string
          paid_at?: string | null
          shipping_address?: Json | null
          shipping_minor: number
          status?: string
          store_id: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          number?: string
          paid_at?: string | null
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          store_id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          collection_id: string
          position: number
          product_id: string
          store_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
          store_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_store_id_fkey"
            columns: ["collection_id", "store_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_collections_product_id_store_id_fkey"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          height: number
          id: string
          path: string
          position: number
          product_id: string
          store_id: string
          width: number
        }
        Insert: {
          alt: string
          created_at?: string
          height: number
          id?: string
          path: string
          position?: number
          product_id: string
          store_id: string
          width: number
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number
          id?: string
          path?: string
          position?: number
          product_id?: string
          store_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_store_id_fkey"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          created_at: string
          department: string
          description: string | null
          id: string
          is_featured: boolean
          slug: string
          status: string
          store_id: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          department: string
          description?: string | null
          id?: string
          is_featured?: boolean
          slug: string
          status?: string
          store_id: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          slug?: string
          status?: string
          store_id?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string
          created_at: string
          delivered_at: string | null
          id: string
          order_id: string
          shipped_at: string | null
          store_id: string
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          carrier: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id: string
          shipped_at?: string | null
          store_id: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          carrier?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_id?: string
          shipped_at?: string | null
          store_id?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_store_id_fkey"
            columns: ["order_id", "store_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "shipments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          order_id: string | null
          outcome: string
          received_at: string
          store_id: string
          type: string
        }
        Insert: {
          id: string
          order_id?: string | null
          outcome: string
          received_at?: string
          store_id: string
          type: string
        }
        Update: {
          id?: string
          order_id?: string | null
          outcome?: string
          received_at?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          compare_at_price_minor: number | null
          created_at: string
          currency: string
          id: string
          is_available: boolean
          options: Json
          position: number
          price_minor: number
          product_id: string
          sku: string
          store_id: string
          title: string
        }
        Insert: {
          compare_at_price_minor?: number | null
          created_at?: string
          currency: string
          id?: string
          is_available?: boolean
          options?: Json
          position?: number
          price_minor: number
          product_id: string
          sku: string
          store_id: string
          title: string
        }
        Update: {
          compare_at_price_minor?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_available?: boolean
          options?: Json
          position?: number
          price_minor?: number
          product_id?: string
          sku?: string
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_store_id_fkey"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_checkout_event: {
        Args: {
          p_amount_total: number
          p_currency: string
          p_customer: Json
          p_event_id: string
          p_event_type: string
          p_order_id: string
          p_payment_intent_id: string
          p_payment_status: string
          p_session_id: string
        }
        Returns: string
      }
      create_order: {
        Args: {
          p_currency: string
          p_items: Json
          p_number: string
          p_shipping_minor: number
          p_subtotal_minor: number
          p_tax_minor: number
          p_total_minor: number
        }
        Returns: string
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
