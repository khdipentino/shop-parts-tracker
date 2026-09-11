// Hand-written to match supabase/migrations/0001_init.sql, in the same
// shape `supabase gen types typescript` produces (including foreign-key
// Relationships, needed for nested/embedded `.select()` joins to type
// correctly), so once your project is live you can drop in the generated
// file with no other code changes:
//   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/database.types.ts

export type AppRole = "pending" | "staff" | "admin";
export type TxnType = "receive" | "issue" | "return" | "adjustment";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          app_role: AppRole;
          active: boolean;
          requested_at: string;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          app_role?: AppRole;
          active?: boolean;
          requested_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      employees: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          badge_code: string;
          shop_section: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          badge_code: string;
          shop_section?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Row"]>;
        Relationships: [];
      };
      parts: {
        Row: {
          id: string;
          part_number: string;
          description: string;
          barcode_code: string;
          quantity_on_hand: number;
          reorder_point: number | null;
          bin_location: string | null;
          unit_cost: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          part_number: string;
          description: string;
          barcode_code: string;
          quantity_on_hand?: number;
          reorder_point?: number | null;
          bin_location?: string | null;
          unit_cost?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["parts"]["Row"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: number;
          employee_id: string;
          work_order_number: string | null;
          created_by: string | null;
          created_at: string;
          voided: boolean;
          voided_by: string | null;
          voided_at: string | null;
          void_reason: string | null;
        };
        Insert: {
          id?: string;
          invoice_number?: number;
          employee_id: string;
          work_order_number?: string | null;
          created_by?: string | null;
          created_at?: string;
          voided?: boolean;
          voided_by?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "invoices_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          }
        ];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          part_id: string;
          quantity: number;
          returned_quantity: number;
          unit_cost_snapshot: number | null;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          part_id: string;
          quantity: number;
          returned_quantity?: number;
          unit_cost_snapshot?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_items"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_items_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          type: TxnType;
          part_id: string;
          quantity: number;
          employee_id: string | null;
          invoice_id: string | null;
          invoice_item_id: string | null;
          work_order_number: string | null;
          notes: string | null;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: TxnType;
          part_id: string;
          quantity: number;
          employee_id?: string | null;
          invoice_id?: string | null;
          invoice_item_id?: string | null;
          work_order_number?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_issue: {
        Args: {
          p_employee_id: string;
          p_work_order_number: string | null;
          p_items: { part_id: string; quantity: number }[];
        };
        Returns: string;
      };
      create_return: {
        Args: {
          p_invoice_item_id: string;
          p_quantity: number;
          p_notes: string | null;
        };
        Returns: string;
      };
      void_invoice: {
        Args: {
          p_invoice_id: string;
          p_reason: string | null;
        };
        Returns: void;
      };
    };
  };
}
