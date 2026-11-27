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
      bank_reconciliation_items: {
        Row: {
          created_at: string
          id: string
          match_status: string
          note: string | null
          reconciliation_id: string
          transaction_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_status?: string
          note?: string | null
          reconciliation_id: string
          transaction_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_status?: string
          note?: string | null
          reconciliation_id?: string
          transaction_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          account_id: string
          calculated_balance: number
          company_id: string | null
          created_at: string
          difference: number
          id: string
          notes: string | null
          period_end: string
          period_start: string
          reconciled_at: string | null
          statement_balance: number
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          calculated_balance?: number
          company_id?: string | null
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          reconciled_at?: string | null
          statement_balance: number
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          calculated_balance?: number
          company_id?: string | null
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          reconciled_at?: string | null
          statement_balance?: number
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          account_id: string
          company_id: string | null
          created_at: string
          duplicate_rows: number
          file_format: string
          file_name: string
          id: string
          imported_rows: number
          total_rows: number
          user_id: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          company_id?: string | null
          created_at?: string
          duplicate_rows?: number
          file_format: string
          file_name: string
          id?: string
          imported_rows?: number
          total_rows?: number
          user_id: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          company_id?: string | null
          created_at?: string
          duplicate_rows?: number
          file_format?: string
          file_name?: string
          id?: string
          imported_rows?: number
          total_rows?: number
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contacts: {
        Row: {
          address_complement: string | null
          address_number: string | null
          city: string | null
          company_id: string | null
          contact_person: string | null
          contact_type: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          state_registration: string | null
          status: string
          street_address: string | null
          updated_at: string
          user_id: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          contact_type: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          company_id?: string | null
          contact_person?: string | null
          contact_type?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contracts: {
        Row: {
          company_id: string | null
          contract_amount: number | null
          contract_number: string | null
          contract_type: string
          counterparty: string
          created_at: string
          document_path: string | null
          end_date: string | null
          id: string
          notes: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type?: string
          counterparty: string
          created_at?: string
          document_path?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          contract_amount?: number | null
          contract_number?: string | null
          contract_type?: string
          counterparty?: string
          created_at?: string
          document_path?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contracts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cakto_webhook_events: {
        Row: {
          event_key: string
          event_name: string
          order_id: string | null
          received_at: string
        }
        Insert: {
          event_key: string
          event_name: string
          order_id?: string | null
          received_at?: string
        }
        Update: {
          event_key?: string
          event_name?: string
          order_id?: string | null
          received_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          parent_id: string | null
          type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_complement: string | null
          address_number: string | null
          city: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_default: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          neighborhood: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          state_registration: string | null
          status: string
          street_address: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street_address?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_customers: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          id?: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_employees: {
        Row: {
          admission_date: string | null
          company_id: string
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          admission_date?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          admission_date?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_suppliers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          supplier_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          supplier_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_suppliers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_name: string | null
          monthly_budget: number | null
          name: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_name?: string | null
          monthly_budget?: number | null
          name: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_name?: string | null
          monthly_budget?: number | null
          name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          file_name: string
          id: string
          storage_path: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          file_name: string
          id?: string
          storage_path: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          file_name?: string
          id?: string
          storage_path?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          branch_code: string | null
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          institution: string | null
          is_active: boolean
          name: string
          opening_balance: number
          opening_date: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          branch_code?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          opening_balance?: number
          opening_date?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          branch_code?: string | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          opening_balance?: number
          opening_date?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ai_insights: {
        Row: {
          body: string
          company_id: string | null
          created_at: string
          expires_at: string | null
          generated_at: string
          id: string
          insight_type: string
          period_end: string | null
          period_start: string | null
          source_fingerprint: string
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type: string
          period_end?: string | null
          period_start?: string | null
          source_fingerprint: string
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string
          expires_at?: string | null
          generated_at?: string
          id?: string
          insight_type?: string
          period_end?: string | null
          period_start?: string | null
          source_fingerprint?: string
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_ai_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ai_insights_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          company_id: string | null
          created_at: string
          current_amount: number
          id: string
          name: string
          notes: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          notes?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          minimum_quantity: number
          name: string
          sku: string | null
          stock_quantity: number
          unit: string
          unit_cost: number
          unit_price: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number
          name: string
          sku?: string | null
          stock_quantity?: number
          unit?: string
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number
          name?: string
          sku?: string | null
          stock_quantity?: number
          unit?: string
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          item_id: string
          movement_date: string
          movement_type: string
          notes: string | null
          quantity_delta: number
          reference: string | null
          unit_cost: number | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          quantity_delta: number
          reference?: string | null
          unit_cost?: number | null
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity_delta?: number
          reference?: string | null
          unit_cost?: number | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexus_ai_usage: {
        Row: {
          request_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          request_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          request_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_dispatch_log: {
        Row: {
          channel: string
          created_at: string
          entity_id: string | null
          error_message: string | null
          event_key: string
          event_type: string
          id: string
          metadata: Json
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          entity_id?: string | null
          error_message?: string | null
          event_key: string
          event_type: string
          id?: string
          metadata?: Json
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          entity_id?: string | null
          error_message?: string | null
          event_key?: string
          event_type?: string
          id?: string
          metadata?: Json
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          in_app_enabled: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_days: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_days?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          in_app_enabled?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_days?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_assets: {
        Row: {
          acquired_on: string | null
          asset_type: string
          created_at: string
          estimated_value: number
          id: string
          institution: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_on?: string | null
          asset_type?: string
          created_at?: string
          estimated_value: number
          id?: string
          institution?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_on?: string | null
          asset_type?: string
          created_at?: string
          estimated_value?: number
          id?: string
          institution?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_card_purchases: {
        Row: {
          card_id: string
          category: string | null
          created_at: string
          description: string
          first_statement_month: string
          id: string
          installments: number
          notes: string | null
          purchase_date: string
          total_amount: number
          user_id: string
        }
        Insert: {
          card_id: string
          category?: string | null
          created_at?: string
          description: string
          first_statement_month: string
          id?: string
          installments?: number
          notes?: string | null
          purchase_date?: string
          total_amount: number
          user_id: string
        }
        Update: {
          card_id?: string
          category?: string | null
          created_at?: string
          description?: string
          first_statement_month?: string
          id?: string
          installments?: number
          notes?: string | null
          purchase_date?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_card_purchases_card_owner_fk"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "personal_credit_cards"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      personal_card_statement_payments: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          statement_month: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          statement_month: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          statement_month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_card_statement_payments_card_owner_fk"
            columns: ["card_id", "user_id"]
            isOneToOne: false
            referencedRelation: "personal_credit_cards"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      personal_credit_cards: {
        Row: {
          closing_day: number
          created_at: string
          credit_limit: number
          due_day: number
          id: string
          is_active: boolean
          issuer: string | null
          last_four: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_day: number
          created_at?: string
          credit_limit: number
          due_day: number
          id?: string
          is_active?: boolean
          issuer?: string | null
          last_four?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closing_day?: number
          created_at?: string
          credit_limit?: number
          due_day?: number
          id?: string
          is_active?: boolean
          issuer?: string | null
          last_four?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_financial_accounts: {
        Row: {
          account_type: string
          created_at: string
          id: string
          institution: string | null
          is_active: boolean
          name: string
          opening_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          institution?: string | null
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          id: string
          name: string
          notes: string | null
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          notes?: string | null
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_financing_payments: {
        Row: {
          amount: number
          created_at: string
          financing_id: string
          id: string
          installment_number: number
          notes: string | null
          paid_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          financing_id: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          financing_id?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_financing_payments_financing_id_fkey"
            columns: ["financing_id"]
            isOneToOne: false
            referencedRelation: "personal_financings"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_financings: {
        Row: {
          created_at: string
          financing_type: string
          first_due_date: string
          id: string
          installments_paid: number
          installments_total: number
          is_active: boolean
          lender: string | null
          monthly_installment: number
          monthly_interest_rate: number | null
          name: string
          notes: string | null
          principal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          financing_type: string
          first_due_date: string
          id?: string
          installments_paid?: number
          installments_total: number
          is_active?: boolean
          lender?: string | null
          monthly_installment: number
          monthly_interest_rate?: number | null
          name: string
          notes?: string | null
          principal_amount: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          financing_type?: string
          first_due_date?: string
          id?: string
          installments_paid?: number
          installments_total?: number
          is_active?: boolean
          lender?: string | null
          monthly_installment?: number
          monthly_interest_rate?: number | null
          name?: string
          notes?: string | null
          principal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_monthly_budgets: {
        Row: {
          budget_month: string
          category: string
          created_at: string
          id: string
          monthly_limit: number
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_month: string
          category: string
          created_at?: string
          id?: string
          monthly_limit: number
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_month?: string
          category?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          status: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_transactions_account_owner_fk"
            columns: ["account_id", "user_id"]
            isOneToOne: false
            referencedRelation: "personal_financial_accounts"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      personnel_expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          due_date: string | null
          employee_id: string | null
          expense_type: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          description: string
          due_date?: string | null
          employee_id?: string | null
          expense_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          employee_id?: string | null
          expense_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_consents: {
        Row: {
          created_at: string
          document_version: string | null
          granted: boolean
          id: string
          purpose: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_version?: string | null
          granted: boolean
          id?: string
          purpose: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_version?: string | null
          granted?: boolean
          id?: string
          purpose?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      privacy_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          request_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          request_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string
          currency: string
          display_order: number
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: string
          price_brl: number
          slug: string
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          currency?: string
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name: string
          price_brl: number
          slug: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          currency?: string
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          price_brl?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_documents: {
        Row: {
          created_at: string
          file_name: string
          id: string
          storage_path: string
          supplier_id: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          storage_path: string
          supplier_id: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          storage_path?: string
          supplier_id?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_approvals: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          request_note: string | null
          requested_at: string
          requested_by: string
          status: string
          transaction_id: string
          workspace_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          request_note?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          transaction_id: string
          workspace_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          request_note?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          transaction_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_approvals_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          bank_statement_fingerprint: string | null
          bank_statement_import_id: string | null
          category_id: string | null
          company_id: string | null
          cost_center_id: string | null
          counterparty: string | null
          created_at: string
          customer_id: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          supplier_id: string | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          bank_statement_fingerprint?: string | null
          bank_statement_import_id?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          counterparty?: string | null
          created_at?: string
          customer_id?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          supplier_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          bank_statement_fingerprint?: string | null
          bank_statement_import_id?: string | null
          category_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          counterparty?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          supplier_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_statement_import_id_fkey"
            columns: ["bank_statement_import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "business_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          checkout_url: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          payer_email: string | null
          plan_id: string
          provider: string
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          payer_email?: string | null
          plan_id: string
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          payer_email?: string | null
          plan_id?: string
          provider?: string
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          changed_fields: string[]
          company_id: string | null
          created_at: string
          id: string
          record_id: string | null
          source: string
          table_name: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          changed_fields?: string[]
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          source?: string
          table_name: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          changed_fields?: string[]
          company_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          source?: string
          table_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_nexus_ai_quota: { Args: { p_user_id: string }; Returns: boolean }
      has_active_pro_subscription: { Args: never; Returns: boolean }
      has_workspace_role: {
        Args: { allowed_roles: string[]; target_workspace: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { target_workspace: string }
        Returns: boolean
      }
      release_api_usage: {
        Args: { p_reservation_id: string }
        Returns: boolean
      }
      reserve_api_usage: {
        Args: {
          p_estimated_cost_usd: number
          p_idempotency_key: string
          p_input_tokens: number
          p_model: string
          p_output_tokens: number
          p_provider: string
          p_user_id: string
        }
        Returns: Json
      }
      settle_api_usage: {
        Args: { p_actual_cost_usd: number; p_reservation_id: string }
        Returns: boolean
      }
      validate_nexus_reminder_token: {
        Args: { p_token: string }
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
