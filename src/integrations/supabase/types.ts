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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      account_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          account_id: string
          created_at: string
          created_by_user_id: string | null
          expires_at: string
          id: string
          label: string | null
          role: Database["public"]["Enums"]["account_role_enum"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          account_id: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at: string
          id?: string
          label?: string | null
          role: Database["public"]["Enums"]["account_role_enum"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          account_id?: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          role?: Database["public"]["Enums"]["account_role_enum"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          default_currency: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      action_log: {
        Row: {
          action_type: string
          details: Json | null
          device_id: string | null
          executed_at: string | null
          id: string
          ig_account_id: string | null
          status: string
          target_url: string | null
          target_username: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          details?: Json | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string | null
          status: string
          target_url?: string | null
          target_username?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          details?: Json | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string | null
          status?: string
          target_url?: string | null
          target_username?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_bloqueios: {
        Row: {
          created_at: string
          data: string
          id: string
          local: string | null
          motivo: string | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          local?: string | null
          motivo?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          local?: string | null
          motivo?: string | null
        }
        Relationships: []
      }
      agenda_config: {
        Row: {
          almoco_fim: string | null
          almoco_inicio: string | null
          ativo: boolean
          dias: number[]
          fim: string
          inicio: string
          local: string
          slot: number
          updated_at: string
        }
        Insert: {
          almoco_fim?: string | null
          almoco_inicio?: string | null
          ativo?: boolean
          dias?: number[]
          fim?: string
          inicio?: string
          local: string
          slot?: number
          updated_at?: string
        }
        Update: {
          almoco_fim?: string | null
          almoco_inicio?: string | null
          ativo?: boolean
          dias?: number[]
          fim?: string
          inicio?: string
          local?: string
          slot?: number
          updated_at?: string
        }
        Relationships: []
      }
      agendamentos: {
        Row: {
          convenio: string | null
          created_at: string
          data_consulta: string | null
          data_hora: string
          data_nascimento: string | null
          horario: string | null
          id: string
          lembrete_enviado: boolean | null
          local: string
          nome: string | null
          observacoes: string | null
          paciente_id: string
          phone_number: string
          status: string
          telefone: string | null
          tipo_consulta: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          convenio?: string | null
          created_at?: string
          data_consulta?: string | null
          data_hora: string
          data_nascimento?: string | null
          horario?: string | null
          id?: string
          lembrete_enviado?: boolean | null
          local: string
          nome?: string | null
          observacoes?: string | null
          paciente_id: string
          phone_number: string
          status?: string
          telefone?: string | null
          tipo_consulta?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          convenio?: string | null
          created_at?: string
          data_consulta?: string | null
          data_hora?: string
          data_nascimento?: string | null
          horario?: string | null
          id?: string
          lembrete_enviado?: boolean | null
          local?: string
          nome?: string | null
          observacoes?: string | null
          paciente_id?: string
          phone_number?: string
          status?: string
          telefone?: string | null
          tipo_consulta?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          condition: string | null
          id: number
          last_triggered: string | null
          source: string | null
          threshold: number | null
        }
        Insert: {
          condition?: string | null
          id?: number
          last_triggered?: string | null
          source?: string | null
          threshold?: number | null
        }
        Update: {
          condition?: string | null
          id?: number
          last_triggered?: string | null
          source?: string | null
          threshold?: number | null
        }
        Relationships: []
      }
      app_encryption_keys: {
        Row: {
          created_at: string
          id: number
          key_name: string
          key_value: string
        }
        Insert: {
          created_at?: string
          id?: number
          key_name: string
          key_value: string
        }
        Update: {
          created_at?: string
          id?: number
          key_name?: string
          key_value?: string
        }
        Relationships: []
      }
      atendimentos: {
        Row: {
          assunto: string | null
          avaliacao: number | null
          created_at: string
          fim: string | null
          id: string
          inicio: string
          local_preferido: string | null
          observacoes: string | null
          paciente_id: string
          phone_number: string
          status: string
          tipo: string | null
          total_mensagens: number
          updated_at: string
        }
        Insert: {
          assunto?: string | null
          avaliacao?: number | null
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          local_preferido?: string | null
          observacoes?: string | null
          paciente_id: string
          phone_number: string
          status?: string
          tipo?: string | null
          total_mensagens?: number
          updated_at?: string
        }
        Update: {
          assunto?: string | null
          avaliacao?: number | null
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          local_preferido?: string | null
          observacoes?: string | null
          paciente_id?: string
          phone_number?: string
          status?: string
          tipo?: string | null
          total_mensagens?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          account_id: string
          automation_id: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          steps_executed: Json
          trigger_event: string
          user_id: string
        }
        Insert: {
          account_id: string
          automation_id: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status: string
          steps_executed?: Json
          trigger_event: string
          user_id: string
        }
        Update: {
          account_id?: string
          automation_id?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          steps_executed?: Json
          trigger_event?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_pending_executions: {
        Row: {
          account_id: string
          automation_id: string
          branch: string | null
          contact_id: string | null
          context: Json
          created_at: string
          id: string
          log_id: string | null
          next_step_position: number
          parent_step_id: string | null
          run_at: string
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          automation_id: string
          branch?: string | null
          contact_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          log_id?: string | null
          next_step_position: number
          parent_step_id?: string | null
          run_at: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          automation_id?: string
          branch?: string | null
          contact_id?: string | null
          context?: Json
          created_at?: string
          id?: string
          log_id?: string | null
          next_step_position?: number
          parent_step_id?: string | null
          run_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_pending_executions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_pending_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_pending_executions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_pending_executions_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "automation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_pending_executions_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          automation_id: string
          branch: string | null
          created_at: string
          id: string
          parent_step_id: string | null
          position: number
          step_config: Json
          step_type: string
        }
        Insert: {
          automation_id: string
          branch?: string | null
          created_at?: string
          id?: string
          parent_step_id?: string | null
          position: number
          step_config?: Json
          step_type: string
        }
        Update: {
          automation_id?: string
          branch?: string | null
          created_at?: string
          id?: string
          parent_step_id?: string | null
          position?: number
          step_config?: Json
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_steps_parent_step_id_fkey"
            columns: ["parent_step_id"]
            isOneToOne: false
            referencedRelation: "automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          condition_key: string
          condition_value: number
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          slug: string
        }
        Insert: {
          condition_key: string
          condition_value?: number
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          rarity?: string
          slug: string
        }
        Update: {
          condition_key?: string
          condition_value?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          slug?: string
        }
        Relationships: []
      }
      bot_commands: {
        Row: {
          command: string
          created_at: string | null
          device_id: string | null
          executed_at: string | null
          id: string
          ig_account_id: string
          params: Json | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          command: string
          created_at?: string | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id: string
          params?: Json | null
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          command?: string
          created_at?: string | null
          device_id?: string | null
          executed_at?: string | null
          id?: string
          ig_account_id?: string
          params?: Json | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_commands_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_preferred_times: {
        Row: {
          brand_id: string
          created_at: string
          format: string | null
          id: string
          label: string | null
          time: string
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          format?: string | null
          id?: string
          label?: string | null
          time: string
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          format?: string | null
          id?: string
          label?: string | null
          time?: string
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          brand_colors: Json | null
          brand_personality: string | null
          created_at: string | null
          default_slide_limit: number | null
          description: string | null
          desires: string | null
          formality_level: string | null
          id: string
          ideal_customer: string | null
          instagram_handle: string | null
          logo_url: string | null
          main_products: string | null
          name: string
          objective: string | null
          pain_points: string | null
          purchase_objections: string | null
          reference_images: string[] | null
          sector: string | null
          tag: string | null
          target_audience: string | null
          tone_of_voice: string | null
          unique_value: string | null
          updated_at: string | null
          user_id: string
          visual_style: string | null
          visual_style_description: string | null
          website: string | null
          words_to_avoid: string[] | null
          words_to_use: string[] | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_personality?: string | null
          created_at?: string | null
          default_slide_limit?: number | null
          description?: string | null
          desires?: string | null
          formality_level?: string | null
          id?: string
          ideal_customer?: string | null
          instagram_handle?: string | null
          logo_url?: string | null
          main_products?: string | null
          name: string
          objective?: string | null
          pain_points?: string | null
          purchase_objections?: string | null
          reference_images?: string[] | null
          sector?: string | null
          tag?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          unique_value?: string | null
          updated_at?: string | null
          user_id: string
          visual_style?: string | null
          visual_style_description?: string | null
          website?: string | null
          words_to_avoid?: string[] | null
          words_to_use?: string[] | null
        }
        Update: {
          brand_colors?: Json | null
          brand_personality?: string | null
          created_at?: string | null
          default_slide_limit?: number | null
          description?: string | null
          desires?: string | null
          formality_level?: string | null
          id?: string
          ideal_customer?: string | null
          instagram_handle?: string | null
          logo_url?: string | null
          main_products?: string | null
          name?: string
          objective?: string | null
          pain_points?: string | null
          purchase_objections?: string | null
          reference_images?: string[] | null
          sector?: string | null
          tag?: string | null
          target_audience?: string | null
          tone_of_voice?: string | null
          unique_value?: string | null
          updated_at?: string | null
          user_id?: string
          visual_style?: string | null
          visual_style_description?: string | null
          website?: string | null
          words_to_avoid?: string[] | null
          words_to_use?: string[] | null
        }
        Relationships: []
      }
      bridge_tokens: {
        Row: {
          created_at: string | null
          id: string
          ig_account_id: string | null
          is_active: boolean | null
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_tokens_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string
          whatsapp_message_id: string | null
        }
        Insert: {
          broadcast_id: string
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          broadcast_id?: string
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          account_id: string
          audience_filter: Json | null
          created_at: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          name: string
          read_count: number | null
          replied_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          status: string
          template_language: string
          template_name: string
          template_variables: Json | null
          total_recipients: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          audience_filter?: Json | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          name: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          template_language?: string
          template_name: string
          template_variables?: Json | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          audience_filter?: Json | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          name?: string
          read_count?: number | null
          replied_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          template_language?: string
          template_name?: string
          template_variables?: Json | null
          total_recipients?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_custom_values: {
        Row: {
          contact_id: string
          created_at: string | null
          custom_field_id: string
          id: string
          value: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          custom_field_id: string
          id?: string
          value?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          custom_field_id?: string
          id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_custom_values_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_custom_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          account_id: string
          contact_id: string
          created_at: string | null
          id: string
          note_text: string
          user_id: string
        }
        Insert: {
          account_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          note_text: string
          user_id: string
        }
        Update: {
          account_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          note_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string
          phone_normalized: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone: string
          phone_normalized?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string
          phone_normalized?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          account_id: string
          assigned_agent_id: string | null
          contact_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_text: string | null
          status: string
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          assigned_agent_id?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          status?: string
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          assigned_agent_id?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          status?: string
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          account_id: string
          created_at: string | null
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_action_cache: {
        Row: {
          action_type: string
          day: string
          failed_count: number | null
          ig_account_id: string
          success_count: number | null
          total_count: number | null
          user_id: string
        }
        Insert: {
          action_type: string
          day: string
          failed_count?: number | null
          ig_account_id: string
          success_count?: number | null
          total_count?: number | null
          user_id: string
        }
        Update: {
          action_type?: string
          day?: string
          failed_count?: number | null
          ig_account_id?: string
          success_count?: number | null
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_action_cache_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string
          assigned_to: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string | null
          currency: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          pipeline_id: string
          stage_id: string
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          account_id: string
          assigned_to?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          pipeline_id: string
          stage_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          value?: number
        }
        Update: {
          account_id?: string
          assigned_to?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          pipeline_id?: string
          stage_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_arquivos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          pasta: string
          storage_path: string
          tags: string[] | null
          tamanho: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          pasta?: string
          storage_path: string
          tags?: string[] | null
          tamanho?: number
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          pasta?: string
          storage_path?: string
          tags?: string[] | null
          tamanho?: number
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_nodes: {
        Row: {
          config: Json
          created_at: string
          flow_id: string
          id: string
          node_key: string
          node_type: string
          position_x: number
          position_y: number
        }
        Insert: {
          config?: Json
          created_at?: string
          flow_id: string
          id?: string
          node_key: string
          node_type: string
          position_x?: number
          position_y?: number
        }
        Update: {
          config?: Json
          created_at?: string
          flow_id?: string
          id?: string
          node_key?: string
          node_type?: string
          position_x?: number
          position_y?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_run_events: {
        Row: {
          created_at: string
          event_type: string
          flow_run_id: string
          id: string
          node_key: string | null
          payload: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          flow_run_id: string
          id?: string
          node_key?: string | null
          payload?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          flow_run_id?: string
          id?: string
          node_key?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "flow_run_events_flow_run_id_fkey"
            columns: ["flow_run_id"]
            isOneToOne: false
            referencedRelation: "flow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_runs: {
        Row: {
          account_id: string
          contact_id: string | null
          conversation_id: string | null
          current_node_key: string | null
          end_reason: string | null
          ended_at: string | null
          flow_id: string
          id: string
          last_advanced_at: string
          last_prompt_message_id: string | null
          reprompt_count: number
          started_at: string
          status: string
          user_id: string
          vars: Json
        }
        Insert: {
          account_id: string
          contact_id?: string | null
          conversation_id?: string | null
          current_node_key?: string | null
          end_reason?: string | null
          ended_at?: string | null
          flow_id: string
          id?: string
          last_advanced_at?: string
          last_prompt_message_id?: string | null
          reprompt_count?: number
          started_at?: string
          status?: string
          user_id: string
          vars?: Json
        }
        Update: {
          account_id?: string
          contact_id?: string | null
          conversation_id?: string | null
          current_node_key?: string | null
          end_reason?: string | null
          ended_at?: string | null
          flow_id?: string
          id?: string
          last_advanced_at?: string
          last_prompt_message_id?: string | null
          reprompt_count?: number
          started_at?: string
          status?: string
          user_id?: string
          vars?: Json
        }
        Relationships: [
          {
            foreignKeyName: "flow_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_last_prompt_message_id_fkey"
            columns: ["last_prompt_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          entry_node_id: string | null
          execution_count: number
          fallback_policy: Json
          id: string
          last_executed_at: string | null
          name: string
          status: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          entry_node_id?: string | null
          execution_count?: number
          fallback_policy?: Json
          id?: string
          last_executed_at?: string | null
          name: string
          status?: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          entry_node_id?: string | null
          execution_count?: number
          fallback_policy?: Json
          id?: string
          last_executed_at?: string | null
          name?: string
          status?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          created_at: string | null
          current_phase: string | null
          current_slide: number | null
          error: string | null
          id: string
          idempotency_key: string | null
          payload: Json | null
          post_id: string | null
          result: Json | null
          status: string | null
          total_slides: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_phase?: string | null
          current_slide?: number | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          post_id?: string | null
          result?: Json | null
          status?: string | null
          total_slides?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_phase?: string | null
          current_slide?: number | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          post_id?: string | null
          result?: Json | null
          status?: string | null
          total_slides?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sg_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_stats: {
        Row: {
          device_id: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          ig_account_id: string | null
          posts_count: number | null
          recorded_at: string | null
          user_id: string | null
        }
        Insert: {
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_account_id?: string | null
          posts_count?: number | null
          recorded_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_account_id?: string | null
          posts_count?: number | null
          recorded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_accounts: {
        Row: {
          bot_mode: string | null
          bot_online: boolean | null
          bot_schedule: Json | null
          bot_status: string | null
          bridge_link_token: string | null
          bridge_version: string | null
          cooldown_escalation: number | null
          cooldown_remaining_minutes: number | null
          created_at: string | null
          daily_heat: number | null
          delay_max: number | null
          delay_min: number | null
          device_id: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          ig_user_id: string | null
          ig_username: string
          is_active: boolean | null
          last_heartbeat: string | null
          likes_per_follow: number | null
          max_actions_per_session: number | null
          organic_timings: Json | null
          posts_count: number | null
          profile_pic_url: string | null
          queue_processed: number | null
          queue_total: number | null
          safety_limits: Json | null
          safety_preset: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bot_mode?: string | null
          bot_online?: boolean | null
          bot_schedule?: Json | null
          bot_status?: string | null
          bridge_link_token?: string | null
          bridge_version?: string | null
          cooldown_escalation?: number | null
          cooldown_remaining_minutes?: number | null
          created_at?: string | null
          daily_heat?: number | null
          delay_max?: number | null
          delay_min?: number | null
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id?: string | null
          ig_username: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          likes_per_follow?: number | null
          max_actions_per_session?: number | null
          organic_timings?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          queue_processed?: number | null
          queue_total?: number | null
          safety_limits?: Json | null
          safety_preset?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bot_mode?: string | null
          bot_online?: boolean | null
          bot_schedule?: Json | null
          bot_status?: string | null
          bridge_link_token?: string | null
          bridge_version?: string | null
          cooldown_escalation?: number | null
          cooldown_remaining_minutes?: number | null
          created_at?: string | null
          daily_heat?: number | null
          delay_max?: number | null
          delay_min?: number | null
          device_id?: string | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          likes_per_follow?: number | null
          max_actions_per_session?: number | null
          organic_timings?: Json | null
          posts_count?: number | null
          profile_pic_url?: string | null
          queue_processed?: number | null
          queue_total?: number | null
          safety_limits?: Json | null
          safety_preset?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          ai_tip: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          sector: string | null
          suggested_formats: string[] | null
          suggested_platforms: string[] | null
          suggested_prompt: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          ai_tip?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          sector?: string | null
          suggested_formats?: string[] | null
          suggested_platforms?: string[] | null
          suggested_prompt?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          ai_tip?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          sector?: string | null
          suggested_formats?: string[] | null
          suggested_platforms?: string[] | null
          suggested_prompt?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      llm_phase_config: {
        Row: {
          direct: boolean
          model: string
          phase: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          direct?: boolean
          model: string
          phase: string
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          direct?: boolean
          model?: string
          phase?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      llm_phase_metrics: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          model: string
          phase: string
          provider: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          phase: string
          provider: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          phase?: string
          provider?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          atendimento_id: string | null
          conteudo: string | null
          created_at: string
          direcao: string
          id: string
          message_id_whatsapp: string | null
          metadata: Json | null
          paciente_id: string
          phone_number: string
          tipo_mensagem: string
        }
        Insert: {
          atendimento_id?: string | null
          conteudo?: string | null
          created_at?: string
          direcao: string
          id?: string
          message_id_whatsapp?: string | null
          metadata?: Json | null
          paciente_id: string
          phone_number: string
          tipo_mensagem?: string
        }
        Update: {
          atendimento_id?: string | null
          conteudo?: string | null
          created_at?: string
          direcao?: string
          id?: string
          message_id_whatsapp?: string | null
          metadata?: Json | null
          paciente_id?: string
          phone_number?: string
          tipo_mensagem?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "atendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "vw_atendimentos_ativos"
            referencedColumns: ["atendimento_id"]
          },
          {
            foreignKeyName: "mensagens_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "vw_painel_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          actor_id: string | null
          actor_type: string
          conversation_id: string
          created_at: string
          emoji: string
          id: string
          message_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          conversation_id: string
          created_at?: string
          emoji: string
          id?: string
          message_id: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          conversation_id?: string
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          account_id: string
          body_text: string
          buttons: Json | null
          category: string
          created_at: string | null
          footer_text: string | null
          header_content: string | null
          header_handle: string | null
          header_media_url: string | null
          header_type: string | null
          id: string
          language: string | null
          last_submitted_at: string | null
          meta_template_id: string | null
          name: string
          quality_score: string | null
          rejection_reason: string | null
          sample_values: Json | null
          status: string | null
          submission_error: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          body_text: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_handle?: string | null
          header_media_url?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          last_submitted_at?: string | null
          meta_template_id?: string | null
          name: string
          quality_score?: string | null
          rejection_reason?: string | null
          sample_values?: Json | null
          status?: string | null
          submission_error?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_handle?: string | null
          header_media_url?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          last_submitted_at?: string | null
          meta_template_id?: string | null
          name?: string
          quality_score?: string | null
          rejection_reason?: string | null
          sample_values?: Json | null
          status?: string | null
          submission_error?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content_text: string | null
          content_type: string
          conversation_id: string
          created_at: string | null
          id: string
          interactive_reply_id: string | null
          media_url: string | null
          message_id: string | null
          reply_to_message_id: string | null
          sender_id: string | null
          sender_type: string
          status: string
          template_name: string | null
        }
        Insert: {
          content_text?: string | null
          content_type?: string
          conversation_id: string
          created_at?: string | null
          id?: string
          interactive_reply_id?: string | null
          media_url?: string | null
          message_id?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type: string
          status?: string
          template_name?: string | null
        }
        Update: {
          content_text?: string | null
          content_type?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          interactive_reply_id?: string | null
          media_url?: string | null
          message_id?: string | null
          reply_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: string
          status?: string
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          id: number
          metric_name: string | null
          metric_value: number | null
          source: string | null
          timestamp: string | null
        }
        Insert: {
          id?: number
          metric_name?: string | null
          metric_value?: number | null
          source?: string | null
          timestamp?: string | null
        }
        Update: {
          id?: number
          metric_name?: string | null
          metric_value?: number | null
          source?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      mission_crons: {
        Row: {
          created_at: string | null
          error_log: string | null
          id: string
          last_result: string | null
          last_run: string | null
          metadata: Json | null
          next_run: string | null
          nome: string
          schedule: string
          status: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          last_result?: string | null
          last_run?: string | null
          metadata?: Json | null
          next_run?: string | null
          nome: string
          schedule: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_log?: string | null
          id?: string
          last_result?: string | null
          last_run?: string | null
          metadata?: Json | null
          next_run?: string | null
          nome?: string
          schedule?: string
          status?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mission_health: {
        Row: {
          componente: string
          created_at: string | null
          id: string
          mensagem: string | null
          metadata: Json | null
          status: string | null
          tempo_resposta_ms: number | null
          ultima_verificacao: string | null
        }
        Insert: {
          componente: string
          created_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          status?: string | null
          tempo_resposta_ms?: number | null
          ultima_verificacao?: string | null
        }
        Update: {
          componente?: string
          created_at?: string | null
          id?: string
          mensagem?: string | null
          metadata?: Json | null
          status?: string | null
          tempo_resposta_ms?: number | null
          ultima_verificacao?: string | null
        }
        Relationships: []
      }
      mission_memory: {
        Row: {
          categoria: string
          conteudo: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          relevancia: string | null
          source_file: string | null
          tags: string[] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          categoria: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relevancia?: string | null
          source_file?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          conteudo?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relevancia?: string | null
          source_file?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mission_stats: {
        Row: {
          fonte: string
          id: string
          metadata: Json | null
          metrica: string
          periodo: string | null
          recorded_at: string | null
          unidade: string | null
          valor: number | null
        }
        Insert: {
          fonte: string
          id?: string
          metadata?: Json | null
          metrica: string
          periodo?: string | null
          recorded_at?: string | null
          unidade?: string | null
          valor?: number | null
        }
        Update: {
          fonte?: string
          id?: string
          metadata?: Json | null
          metrica?: string
          periodo?: string | null
          recorded_at?: string | null
          unidade?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      mission_tasks: {
        Row: {
          agente: string | null
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          id: string
          metadata: Json | null
          prazo: string | null
          prioridade: string | null
          projeto: string | null
          responsavel: string | null
          status: string | null
          tags: string[] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          agente?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prazo?: string | null
          prioridade?: string | null
          projeto?: string | null
          responsavel?: string | null
          status?: string | null
          tags?: string[] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          agente?: string | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          id?: string
          metadata?: Json | null
          prazo?: string | null
          prioridade?: string | null
          projeto?: string | null
          responsavel?: string | null
          status?: string | null
          tags?: string[] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_eventos_processados: {
        Row: {
          event_id: string
          evento: string | null
          recebido_em: string | null
        }
        Insert: {
          event_id: string
          evento?: string | null
          recebido_em?: string | null
        }
        Update: {
          event_id?: string
          evento?: string | null
          recebido_em?: string | null
        }
        Relationships: []
      }
      n8n_fila_mensagens: {
        Row: {
          id: number
          id_mensagem: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Insert: {
          id?: number
          id_mensagem: string
          mensagem: string
          telefone: string
          timestamp: string
        }
        Update: {
          id?: number
          id_mensagem?: string
          mensagem?: string
          telefone?: string
          timestamp?: string
        }
        Relationships: []
      }
      n8n_followups: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          followup_1_em: string | null
          followup_2_em: string | null
          proxima_acao: string
          telefone: string
          ultima_msg_paciente_em: string | null
          ultima_resposta_bot_em: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          followup_1_em?: string | null
          followup_2_em?: string | null
          proxima_acao?: string
          telefone: string
          ultima_msg_paciente_em?: string | null
          ultima_resposta_bot_em?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          followup_1_em?: string | null
          followup_2_em?: string | null
          proxima_acao?: string
          telefone?: string
          ultima_msg_paciente_em?: string | null
          ultima_resposta_bot_em?: string | null
        }
        Relationships: []
      }
      n8n_historico_mensagens: {
        Row: {
          created_at: string
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_manychat_subscribers: {
        Row: {
          atualizado_em: string | null
          origem: string | null
          subscriber_id: string
          telefone: string
        }
        Insert: {
          atualizado_em?: string | null
          origem?: string | null
          subscriber_id: string
          telefone: string
        }
        Update: {
          atualizado_em?: string | null
          origem?: string | null
          subscriber_id?: string
          telefone?: string
        }
        Relationships: []
      }
      n8n_mensagens_enviadas_bot: {
        Row: {
          enviada_em: string
          id: number
          telefone: string
          texto: string
        }
        Insert: {
          enviada_em?: string
          id?: number
          telefone: string
          texto: string
        }
        Update: {
          enviada_em?: string
          id?: number
          telefone?: string
          texto?: string
        }
        Relationships: []
      }
      n8n_mensagens_processadas: {
        Row: {
          id_mensagem: string
          processada_em: string
          telefone: string
        }
        Insert: {
          id_mensagem: string
          processada_em?: string
          telefone: string
        }
        Update: {
          id_mensagem?: string
          processada_em?: string
          telefone?: string
        }
        Relationships: []
      }
      n8n_pausas_humano: {
        Row: {
          instancia: string | null
          motivo: string | null
          origem: string | null
          pausado_ate: string
          payload_disparou: Json | null
          telefone: string
          texto_disparou: string | null
          ultima_msg_humano: string
        }
        Insert: {
          instancia?: string | null
          motivo?: string | null
          origem?: string | null
          pausado_ate: string
          payload_disparou?: Json | null
          telefone: string
          texto_disparou?: string | null
          ultima_msg_humano?: string
        }
        Update: {
          instancia?: string | null
          motivo?: string | null
          origem?: string | null
          pausado_ate?: string
          payload_disparou?: Json | null
          telefone?: string
          texto_disparou?: string | null
          ultima_msg_humano?: string
        }
        Relationships: []
      }
      n8n_pausas_humano_log: {
        Row: {
          criado_em: string | null
          id: number
          instancia: string | null
          motivo: string | null
          origem: string | null
          pausado_ate: string | null
          payload_disparou: Json | null
          telefone: string
          texto_disparou: string | null
        }
        Insert: {
          criado_em?: string | null
          id?: number
          instancia?: string | null
          motivo?: string | null
          origem?: string | null
          pausado_ate?: string | null
          payload_disparou?: Json | null
          telefone: string
          texto_disparou?: string | null
        }
        Update: {
          criado_em?: string | null
          id?: number
          instancia?: string | null
          motivo?: string | null
          origem?: string | null
          pausado_ate?: string | null
          payload_disparou?: Json | null
          telefone?: string
          texto_disparou?: string | null
        }
        Relationships: []
      }
      n8n_status_atendimento: {
        Row: {
          id: number
          lock_conversa: boolean | null
          session_id: string
          updated_at: string
        }
        Insert: {
          id?: number
          lock_conversa?: boolean | null
          session_id: string
          updated_at?: string
        }
        Update: {
          id?: number
          lock_conversa?: boolean | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_assistant_delegations: {
        Row: {
          created_at: string
          default_account_id: string
          enabled: boolean
          expires_at: string | null
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_account_id: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_account_id?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_assistant_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          delegation_id: string
          document_hash: string
          error_message: string | null
          id: string
          idempotency_key: string
          request_payload: Json
          response_payload: Json | null
          result_id: string | null
          result_table: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          delegation_id: string
          document_hash: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          request_payload?: Json
          response_payload?: Json | null
          result_id?: string | null
          result_table?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          delegation_id?: string
          document_hash?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          request_payload?: Json
          response_payload?: Json | null
          result_id?: string | null
          result_table?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_assistant_operations_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "obra_assistant_delegations"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_assistant_security_events: {
        Row: {
          created_at: string
          delegation_id: string
          document_hash: string | null
          id: string
          idempotency_key: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delegation_id: string
          document_hash?: string | null
          id?: string
          idempotency_key?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          delegation_id?: string
          document_hash?: string | null
          id?: string
          idempotency_key?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_assistant_security_events_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "obra_assistant_delegations"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string
          tabela: string
          user_email: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela: string
          user_email?: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string
          tabela?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_backup_drive_folders: {
        Row: {
          created_at: string
          folder_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_backup_preferencias: {
        Row: {
          ativo: boolean
          created_at: string
          enviar_google_drive: boolean
          hora_utc: number
          id: string
          retencao_dias: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          enviar_google_drive?: boolean
          hora_utc?: number
          id?: string
          retencao_dias?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          enviar_google_drive?: boolean
          hora_utc?: number
          id?: string
          retencao_dias?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_categorias: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_comissao_pagamentos: {
        Row: {
          auto: boolean
          categoria: string
          created_at: string
          data_pagamento: string
          dedup_key: string | null
          deleted_at: string | null
          forma_pagamento: string
          fornecedor: string
          id: string
          mes: string
          observacoes: string
          origem_compra_id: string | null
          pago: boolean
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          auto?: boolean
          categoria?: string
          created_at?: string
          data_pagamento?: string
          dedup_key?: string | null
          deleted_at?: string | null
          forma_pagamento?: string
          fornecedor?: string
          id?: string
          mes?: string
          observacoes?: string
          origem_compra_id?: string | null
          pago?: boolean
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          auto?: boolean
          categoria?: string
          created_at?: string
          data_pagamento?: string
          dedup_key?: string | null
          deleted_at?: string | null
          forma_pagamento?: string
          fornecedor?: string
          id?: string
          mes?: string
          observacoes?: string
          origem_compra_id?: string | null
          pago?: boolean
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_comissao_pagamentos_origem_compra_id_fkey"
            columns: ["origem_compra_id"]
            isOneToOne: false
            referencedRelation: "obra_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_comissao_pagamentos_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_composicoes: {
        Row: {
          categoria: string
          created_at: string
          custo_unitario: number
          id: string
          insumos: Json
          nome: string
          unidade: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          id?: string
          insumos?: Json
          nome?: string
          unidade?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_unitario?: number
          id?: string
          insumos?: Json
          nome?: string
          unidade?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_compras: {
        Row: {
          anexo_id: string
          categoria: string
          conta_id: string
          created_at: string
          data: string
          data_entrega_prevista: string
          data_entrega_real: string
          deleted_at: string | null
          descricao: string
          forma_pagamento: string
          fornecedor: string
          fornecedor_id: string
          id: string
          itens: Json
          nf_vinculada: string
          numero_parcelas: number
          observacoes: string
          orcamento_vinculado_id: string
          parcelas: Json
          status_entrega: string
          status_pagamento: string | null
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          conta_id?: string
          created_at?: string
          data?: string
          data_entrega_prevista?: string
          data_entrega_real?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          itens?: Json
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado_id?: string
          parcelas?: Json
          status_entrega?: string
          status_pagamento?: string | null
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          conta_id?: string
          created_at?: string
          data?: string
          data_entrega_prevista?: string
          data_entrega_real?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          itens?: Json
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado_id?: string
          parcelas?: Json
          status_entrega?: string
          status_pagamento?: string | null
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      obra_conciliacoes_bancarias: {
        Row: {
          conciliado_em: string | null
          conciliado_por: string | null
          created_at: string
          desfeito_em: string | null
          desfeito_por: string | null
          id: string
          motivo_desfazer: string
          motivo_matching: string
          movimentacao_extraida_id: string
          observacoes: string
          score_compatibilidade: number
          status_conciliacao: string
          tipo_conciliacao: string
          transacao_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          motivo_desfazer?: string
          motivo_matching?: string
          movimentacao_extraida_id: string
          observacoes?: string
          score_compatibilidade?: number
          status_conciliacao?: string
          tipo_conciliacao?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          created_at?: string
          desfeito_em?: string | null
          desfeito_por?: string | null
          id?: string
          motivo_desfazer?: string
          motivo_matching?: string
          movimentacao_extraida_id?: string
          observacoes?: string
          score_compatibilidade?: number
          status_conciliacao?: string
          tipo_conciliacao?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_conciliacoes_bancarias_movimentacao_extraida_id_fkey"
            columns: ["movimentacao_extraida_id"]
            isOneToOne: false
            referencedRelation: "obra_movimentacoes_extraidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_conciliacoes_bancarias_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_config: {
        Row: {
          area_construida: number
          categorias: Json
          contato_responsavel: string
          created_at: string
          data_inicio: string
          data_termino: string
          endereco: string
          formas_pagamento: Json
          id: string
          nome_obra: string
          orcamento_total: number
          responsavel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_construida?: number
          categorias?: Json
          contato_responsavel?: string
          created_at?: string
          data_inicio?: string
          data_termino?: string
          endereco?: string
          formas_pagamento?: Json
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_construida?: number
          categorias?: Json
          contato_responsavel?: string
          created_at?: string
          data_inicio?: string
          data_termino?: string
          endereco?: string
          formas_pagamento?: Json
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_contas_financeiras: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          id: string
          nome: string
          observacoes: string
          saldo_inicial: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_cronograma: {
        Row: {
          categoria: string
          created_at: string
          custo_previsto: number
          custo_real: number
          dependencias: Json
          descricao: string
          fim_previsto: string
          fim_real: string | null
          id: string
          inicio_previsto: string
          inicio_real: string | null
          nome: string
          observacoes: string
          orcamento_vinculado: string
          percentual_conclusao: number
          responsavel: string
          responsavel_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          custo_previsto?: number
          custo_real?: number
          dependencias?: Json
          descricao?: string
          fim_previsto?: string
          fim_real?: string | null
          id?: string
          inicio_previsto?: string
          inicio_real?: string | null
          nome?: string
          observacoes?: string
          orcamento_vinculado?: string
          percentual_conclusao?: number
          responsavel?: string
          responsavel_id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          custo_previsto?: number
          custo_real?: number
          dependencias?: Json
          descricao?: string
          fim_previsto?: string
          fim_real?: string | null
          id?: string
          inicio_previsto?: string
          inicio_real?: string | null
          nome?: string
          observacoes?: string
          orcamento_vinculado?: string
          percentual_conclusao?: number
          responsavel?: string
          responsavel_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_diario: {
        Row: {
          atividades: string
          avanco_percentual: number
          clima: string
          created_at: string
          data: string
          equipes: Json
          etapas_trabalhadas: Json
          fotos: Json
          id: string
          observacoes: string
          problemas: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atividades?: string
          avanco_percentual?: number
          clima?: string
          created_at?: string
          data?: string
          equipes?: Json
          etapas_trabalhadas?: Json
          fotos?: Json
          id?: string
          observacoes?: string
          problemas?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atividades?: string
          avanco_percentual?: number
          clima?: string
          created_at?: string
          data?: string
          equipes?: Json
          etapas_trabalhadas?: Json
          fotos?: Json
          id?: string
          observacoes?: string
          problemas?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_documentos_processados: {
        Row: {
          caminho_origem: string
          confianca_extracao: number
          created_at: string
          documento_relacionado_id: string | null
          duplicidade_score: number
          duplicidade_status: string
          hash_arquivo: string
          id: string
          motivo_erro: string
          motivo_revisao: string
          nome_arquivo: string
          origem_arquivo: string
          payload_bruto: Json | null
          payload_normalizado: Json | null
          status_processamento: string
          storage_path: string
          tipo_arquivo: string
          tipo_documento: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caminho_origem?: string
          confianca_extracao?: number
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number
          duplicidade_status?: string
          hash_arquivo?: string
          id?: string
          motivo_erro?: string
          motivo_revisao?: string
          nome_arquivo: string
          origem_arquivo?: string
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string
          storage_path?: string
          tipo_arquivo?: string
          tipo_documento?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caminho_origem?: string
          confianca_extracao?: number
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number
          duplicidade_status?: string
          hash_arquivo?: string
          id?: string
          motivo_erro?: string
          motivo_revisao?: string
          nome_arquivo?: string
          origem_arquivo?: string
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string
          storage_path?: string
          tipo_arquivo?: string
          tipo_documento?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_documentos_processados_documento_relacionado_id_fkey"
            columns: ["documento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_eventos_conciliacao: {
        Row: {
          acao: string
          conciliacao_id: string
          created_at: string
          detalhes: Json | null
          id: string
          user_id: string
        }
        Insert: {
          acao?: string
          conciliacao_id: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          acao?: string
          conciliacao_id?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_eventos_conciliacao_conciliacao_id_fkey"
            columns: ["conciliacao_id"]
            isOneToOne: false
            referencedRelation: "obra_conciliacoes_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_eventos_processamento: {
        Row: {
          created_at: string
          detalhes: Json | null
          documento_id: string
          etapa: string
          id: string
          mensagem: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          documento_id: string
          etapa?: string
          id?: string
          mensagem?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          documento_id?: string
          etapa?: string
          id?: string
          mensagem?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_eventos_processamento_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_financial_payment_operations: {
        Row: {
          commission_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          installment_number: number | null
          obligation_id: string
          obligation_type: string
          request_fingerprint: string
          result: Json
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          commission_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          installment_number?: number | null
          obligation_id: string
          obligation_type: string
          request_fingerprint: string
          result?: Json
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          commission_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          installment_number?: number | null
          obligation_id?: string
          obligation_type?: string
          request_fingerprint?: string
          result?: Json
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_financial_payment_operations_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "obra_comissao_pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_financial_payment_operations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_folha_pagamento_encargos: {
        Row: {
          created_at: string
          deleted_at: string | null
          descricao: string
          folha_id: string
          id: string
          observacoes: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          folha_id: string
          id?: string
          observacoes?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          folha_id?: string
          id?: string
          observacoes?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_folha_pagamento_encargos_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "obra_folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_folha_pagamento_itens: {
        Row: {
          alimentacao: number
          cpf: string
          created_at: string
          deleted_at: string | null
          encerramento: number
          ferias_13: number
          folha_id: string
          funcao: string
          horas_extras: number
          id: string
          nome: string
          observacoes: string
          qtd_diaria: number
          quinzena: number
          ref: number
          total_diarias: number
          total_geral: number
          trabalhador_id: string | null
          updated_at: string
          user_id: string
          vales: number
          valor_diaria: number
        }
        Insert: {
          alimentacao?: number
          cpf?: string
          created_at?: string
          deleted_at?: string | null
          encerramento?: number
          ferias_13?: number
          folha_id: string
          funcao?: string
          horas_extras?: number
          id?: string
          nome: string
          observacoes?: string
          qtd_diaria?: number
          quinzena?: number
          ref?: number
          total_diarias?: number
          total_geral?: number
          trabalhador_id?: string | null
          updated_at?: string
          user_id: string
          vales?: number
          valor_diaria?: number
        }
        Update: {
          alimentacao?: number
          cpf?: string
          created_at?: string
          deleted_at?: string | null
          encerramento?: number
          ferias_13?: number
          folha_id?: string
          funcao?: string
          horas_extras?: number
          id?: string
          nome?: string
          observacoes?: string
          qtd_diaria?: number
          quinzena?: number
          ref?: number
          total_diarias?: number
          total_geral?: number
          trabalhador_id?: string | null
          updated_at?: string
          user_id?: string
          vales?: number
          valor_diaria?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_folha_pagamento_itens_folha_id_fkey"
            columns: ["folha_id"]
            isOneToOne: false
            referencedRelation: "obra_folhas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_folhas_pagamento: {
        Row: {
          comissao_id: string | null
          competencia_mes: string
          created_at: string
          data_fechamento: string
          deleted_at: string | null
          diferenca_conferencia: number
          financeiro_transacao_id: string | null
          gerar_comissao: boolean
          id: string
          obra_nome: string
          observacoes: string
          origem: string
          status: Database["public"]["Enums"]["folha_pagamento_status"]
          titulo: string
          total_alimentacao: number
          total_diarias: number
          total_encargos: number
          total_encerramento: number
          total_ferias_13: number
          total_funcionarios: number
          total_geral: number
          total_horas_extras: number
          total_quinzena: number
          total_vales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comissao_id?: string | null
          competencia_mes: string
          created_at?: string
          data_fechamento: string
          deleted_at?: string | null
          diferenca_conferencia?: number
          financeiro_transacao_id?: string | null
          gerar_comissao?: boolean
          id?: string
          obra_nome?: string
          observacoes?: string
          origem?: string
          status?: Database["public"]["Enums"]["folha_pagamento_status"]
          titulo?: string
          total_alimentacao?: number
          total_diarias?: number
          total_encargos?: number
          total_encerramento?: number
          total_ferias_13?: number
          total_funcionarios?: number
          total_geral?: number
          total_horas_extras?: number
          total_quinzena?: number
          total_vales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comissao_id?: string | null
          competencia_mes?: string
          created_at?: string
          data_fechamento?: string
          deleted_at?: string | null
          diferenca_conferencia?: number
          financeiro_transacao_id?: string | null
          gerar_comissao?: boolean
          id?: string
          obra_nome?: string
          observacoes?: string
          origem?: string
          status?: Database["public"]["Enums"]["folha_pagamento_status"]
          titulo?: string
          total_alimentacao?: number
          total_diarias?: number
          total_encargos?: number
          total_encerramento?: number
          total_ferias_13?: number
          total_funcionarios?: number
          total_geral?: number
          total_horas_extras?: number
          total_quinzena?: number
          total_vales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_fornecedores: {
        Row: {
          agencia: string
          avaliacao: number
          banco: string
          cnpj: string
          conta: string
          created_at: string
          deleted_at: string | null
          email: string
          endereco: string
          especialidade: string
          id: string
          nome: string
          observacoes: string
          pix: string
          responsavel: string
          status: string
          telefone: string
          total_gasto: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia?: string
          avaliacao?: number
          banco?: string
          cnpj?: string
          conta?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          endereco?: string
          especialidade?: string
          id?: string
          nome?: string
          observacoes?: string
          pix?: string
          responsavel?: string
          status?: string
          telefone?: string
          total_gasto?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia?: string
          avaliacao?: number
          banco?: string
          cnpj?: string
          conta?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          endereco?: string
          especialidade?: string
          id?: string
          nome?: string
          observacoes?: string
          pix?: string
          responsavel?: string
          status?: string
          telefone?: string
          total_gasto?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_funcionarios: {
        Row: {
          created_at: string
          funcao: string
          id: string
          nome: string
          observacoes: string
          salario_diario: number
          status: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          observacoes?: string
          salario_diario?: number
          status?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funcao?: string
          id?: string
          nome?: string
          observacoes?: string
          salario_diario?: number
          status?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_leitor_historico: {
        Row: {
          created_at: string
          dados: Json
          data: string
          fornecedor: string
          id: string
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          dados?: Json
          data?: string
          fornecedor?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          dados?: Json
          data?: string
          fornecedor?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      obra_mao_de_obra: {
        Row: {
          aliquota_fgts: number
          aliquota_inss: number
          ativo: boolean
          cpf: string | null
          cpf_normalizado: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          etapa_id: string | null
          funcao: string | null
          id: string
          incide_encargos: boolean
          nome: string
          observacoes: string | null
          telefone: string | null
          tipo_contrato: string | null
          updated_at: string
          user_id: string
          valor_diaria: number
          valor_hora: number | null
        }
        Insert: {
          aliquota_fgts?: number
          aliquota_inss?: number
          ativo?: boolean
          cpf?: string | null
          cpf_normalizado?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          etapa_id?: string | null
          funcao?: string | null
          id?: string
          incide_encargos?: boolean
          nome: string
          observacoes?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id: string
          valor_diaria?: number
          valor_hora?: number | null
        }
        Update: {
          aliquota_fgts?: number
          aliquota_inss?: number
          ativo?: boolean
          cpf?: string | null
          cpf_normalizado?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          etapa_id?: string | null
          funcao?: string | null
          id?: string
          incide_encargos?: boolean
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          tipo_contrato?: string | null
          updated_at?: string
          user_id?: string
          valor_diaria?: number
          valor_hora?: number | null
        }
        Relationships: []
      }
      obra_mao_obra_folha: {
        Row: {
          created_at: string
          custos_engenharia: number
          deleted_at: string | null
          detalhes: Json
          exames: number
          id: string
          mes_ref: string
          observacoes: string | null
          status: string
          total_diarias: number
          total_encerramento: number
          total_ferias: number
          total_fgts: number
          total_geral: number
          total_horas_extras: number
          total_inss: number
          total_quinzena: number
          total_vale_alim: number
          total_vales: number
          transacao_fgts_id: string | null
          transacao_inss_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custos_engenharia?: number
          deleted_at?: string | null
          detalhes?: Json
          exames?: number
          id?: string
          mes_ref: string
          observacoes?: string | null
          status?: string
          total_diarias?: number
          total_encerramento?: number
          total_ferias?: number
          total_fgts?: number
          total_geral?: number
          total_horas_extras?: number
          total_inss?: number
          total_quinzena?: number
          total_vale_alim?: number
          total_vales?: number
          transacao_fgts_id?: string | null
          transacao_inss_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custos_engenharia?: number
          deleted_at?: string | null
          detalhes?: Json
          exames?: number
          id?: string
          mes_ref?: string
          observacoes?: string | null
          status?: string
          total_diarias?: number
          total_encerramento?: number
          total_ferias?: number
          total_fgts?: number
          total_geral?: number
          total_horas_extras?: number
          total_inss?: number
          total_quinzena?: number
          total_vale_alim?: number
          total_vales?: number
          transacao_fgts_id?: string | null
          transacao_inss_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_mao_obra_folha_item: {
        Row: {
          created_at: string
          deleted_at: string | null
          encerramento: number
          ferias_decimo: number
          fgts: number
          horas_extras: number
          id: string
          inss: number
          mes_ref: string
          observacao: string | null
          quinzena: number
          trabalhador_id: string
          updated_at: string
          user_id: string
          vale_alimentacao: number
          vales: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encerramento?: number
          ferias_decimo?: number
          fgts?: number
          horas_extras?: number
          id?: string
          inss?: number
          mes_ref: string
          observacao?: string | null
          quinzena?: number
          trabalhador_id: string
          updated_at?: string
          user_id: string
          vale_alimentacao?: number
          vales?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encerramento?: number
          ferias_decimo?: number
          fgts?: number
          horas_extras?: number
          id?: string
          inss?: number
          mes_ref?: string
          observacao?: string | null
          quinzena?: number
          trabalhador_id?: string
          updated_at?: string
          user_id?: string
          vale_alimentacao?: number
          vales?: number
        }
        Relationships: []
      }
      obra_mao_obra_registros: {
        Row: {
          created_at: string
          data: string
          etapa: string | null
          horas: number
          id: string
          observacoes: string | null
          trabalhador_id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          etapa?: string | null
          horas?: number
          id?: string
          observacoes?: string | null
          trabalhador_id: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          etapa?: string | null
          horas?: number
          id?: string
          observacoes?: string | null
          trabalhador_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_mao_obra_registros_trabalhador_id_fkey"
            columns: ["trabalhador_id"]
            isOneToOne: false
            referencedRelation: "obra_mao_de_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_medicoes: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          itens: Json
          observacoes: string
          percentual_geral: number
          updated_at: string
          user_id: string
          valor_total_medido: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          itens?: Json
          observacoes?: string
          percentual_geral?: number
          updated_at?: string
          user_id: string
          valor_total_medido?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          itens?: Json
          observacoes?: string
          percentual_geral?: number
          updated_at?: string
          user_id?: string
          valor_total_medido?: number
        }
        Relationships: []
      }
      obra_movimentacoes_extraidas: {
        Row: {
          categoria_sugerida: string
          conta_id: string | null
          created_at: string
          data_movimentacao: string
          descricao: string
          documento_id: string
          extrato_arquivo: string | null
          extrato_fit_id: string | null
          id: string
          saldo: number | null
          score_confianca: number
          score_duplicidade: number
          status_revisao: string
          tipo_movimentacao: string
          transacao_id: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_sugerida?: string
          conta_id?: string | null
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          documento_id: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          saldo?: number | null
          score_confianca?: number
          score_duplicidade?: number
          status_revisao?: string
          tipo_movimentacao?: string
          transacao_id?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          categoria_sugerida?: string
          conta_id?: string | null
          created_at?: string
          data_movimentacao?: string
          descricao?: string
          documento_id?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          saldo?: number | null
          score_confianca?: number
          score_duplicidade?: number
          status_revisao?: string
          tipo_movimentacao?: string
          transacao_id?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_movimentacoes_extraidas_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "obra_documentos_processados"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_notas_fiscais: {
        Row: {
          anexo_id: string
          categoria: string
          chave_nfe: string
          cnpj: string
          compra_vinculada_id: string
          conta_id: string
          created_at: string
          data_emissao: string
          data_pagamento: string
          data_vencimento: string
          deleted_at: string | null
          desconto: number
          descricao: string
          etapa_cronograma: string
          forma_pagamento: string
          forma_pagamento_tipo: string
          fornecedor: string
          fornecedor_id: string
          id: string
          impostos: Json
          itens: Json
          numero: string
          numero_parcelas: number
          observacoes: string
          orcamento_vinculado: string
          parcelas: Json
          status: string
          updated_at: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          chave_nfe?: string
          cnpj?: string
          compra_vinculada_id?: string
          conta_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string
          data_vencimento?: string
          deleted_at?: string | null
          desconto?: number
          descricao?: string
          etapa_cronograma?: string
          forma_pagamento?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          impostos?: Json
          itens?: Json
          numero?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado?: string
          parcelas?: Json
          status?: string
          updated_at?: string
          user_id: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          chave_nfe?: string
          cnpj?: string
          compra_vinculada_id?: string
          conta_id?: string
          created_at?: string
          data_emissao?: string
          data_pagamento?: string
          data_vencimento?: string
          deleted_at?: string | null
          desconto?: number
          descricao?: string
          etapa_cronograma?: string
          forma_pagamento?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          id?: string
          impostos?: Json
          itens?: Json
          numero?: string
          numero_parcelas?: number
          observacoes?: string
          orcamento_vinculado?: string
          parcelas?: Json
          status?: string
          updated_at?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: []
      }
      obra_notificacoes: {
        Row: {
          created_at: string
          id: string
          link: string | null
          mensagem: string
          prioridade: string
          read_at: string | null
          status: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string
          prioridade?: string
          read_at?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string
          prioridade?: string
          read_at?: string | null
          status?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_orcamentos: {
        Row: {
          anexo_id: string
          categoria: string
          condicoes_pagamento: string
          conta_id: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          forma_pagamento_tipo: string
          fornecedor: string
          fornecedor_id: string
          garantia: string
          historico: Json
          id: string
          itens: Json
          motivo_reprovacao: string
          nf_vinculada: string
          numero_parcelas: number
          observacoes: string
          parcelas_geradas: Json
          prazo_execucao: string
          status: string
          updated_at: string
          user_id: string
          validade: string
          valor_total: number
        }
        Insert: {
          anexo_id?: string
          categoria?: string
          condicoes_pagamento?: string
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          garantia?: string
          historico?: Json
          id?: string
          itens?: Json
          motivo_reprovacao?: string
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          parcelas_geradas?: Json
          prazo_execucao?: string
          status?: string
          updated_at?: string
          user_id: string
          validade?: string
          valor_total?: number
        }
        Update: {
          anexo_id?: string
          categoria?: string
          condicoes_pagamento?: string
          conta_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          forma_pagamento_tipo?: string
          fornecedor?: string
          fornecedor_id?: string
          garantia?: string
          historico?: Json
          id?: string
          itens?: Json
          motivo_reprovacao?: string
          nf_vinculada?: string
          numero_parcelas?: number
          observacoes?: string
          parcelas_geradas?: Json
          prazo_execucao?: string
          status?: string
          updated_at?: string
          user_id?: string
          validade?: string
          valor_total?: number
        }
        Relationships: []
      }
      obra_registro_mao_de_obra: {
        Row: {
          created_at: string
          data: string
          etapa: string
          funcionario_id: string
          horas_trabalhadas: number
          id: string
          observacoes: string
          updated_at: string
          user_id: string
          valor_diaria: number
        }
        Insert: {
          created_at?: string
          data?: string
          etapa?: string
          funcionario_id?: string
          horas_trabalhadas?: number
          id?: string
          observacoes?: string
          updated_at?: string
          user_id: string
          valor_diaria?: number
        }
        Update: {
          created_at?: string
          data?: string
          etapa?: string
          funcionario_id?: string
          horas_trabalhadas?: number
          id?: string
          observacoes?: string
          updated_at?: string
          user_id?: string
          valor_diaria?: number
        }
        Relationships: []
      }
      obra_sugestoes_conciliacao: {
        Row: {
          created_at: string
          id: string
          motivo_matching: string
          movimentacao_extraida_id: string
          score_compatibilidade: number
          status_sugestao: string
          transacao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_matching?: string
          movimentacao_extraida_id: string
          score_compatibilidade?: number
          status_sugestao?: string
          transacao_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo_matching?: string
          movimentacao_extraida_id?: string
          score_compatibilidade?: number
          status_sugestao?: string
          transacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_sugestoes_conciliacao_movimentacao_extraida_id_fkey"
            columns: ["movimentacao_extraida_id"]
            isOneToOne: false
            referencedRelation: "obra_movimentacoes_extraidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_sugestoes_conciliacao_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "obra_transacoes_fluxo"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_transacao_anexos: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          transaction_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          transaction_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          transaction_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      obra_transacoes_fluxo: {
        Row: {
          categoria: string
          comprovante_path: string | null
          conciliado: boolean
          conciliado_em: string | null
          conta_id: string | null
          created_at: string
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string
          extrato_arquivo: string | null
          extrato_fit_id: string | null
          forma_pagamento: string
          id: string
          metodo_pagamento: string | null
          observacoes: string
          origem_id: string | null
          origem_tipo: string | null
          parcela_numero: number | null
          parcela_total: number | null
          recorrencia: string
          recorrencia_ativa: boolean
          recorrencia_fim: string | null
          recorrencia_frequencia: string | null
          recorrencia_grupo_id: string | null
          recorrencia_mae: boolean
          recorrencia_max_ocorrencias: number | null
          recorrencia_ocorrencias_criadas: number
          referencia: string
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          comprovante_path?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          forma_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrencia?: string
          recorrencia_ativa?: boolean
          recorrencia_fim?: string | null
          recorrencia_frequencia?: string | null
          recorrencia_grupo_id?: string | null
          recorrencia_mae?: boolean
          recorrencia_max_ocorrencias?: number | null
          recorrencia_ocorrencias_criadas?: number
          referencia?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          comprovante_path?: string | null
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          forma_pagamento?: string
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          recorrencia?: string
          recorrencia_ativa?: boolean
          recorrencia_fim?: string | null
          recorrencia_frequencia?: string | null
          recorrencia_grupo_id?: string | null
          recorrencia_mae?: boolean
          recorrencia_max_ocorrencias?: number | null
          recorrencia_ocorrencias_criadas?: number
          referencia?: string
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      of_compras: {
        Row: {
          conta_id: string | null
          created_at: string
          data: string
          descricao: string
          forma_pagamento: string
          fornecedor_id: string | null
          id: string
          numero_parcelas: number
          obra_id: string | null
          orcamento_id: string | null
          status: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          conta_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor_id?: string | null
          id?: string
          numero_parcelas?: number
          obra_id?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          conta_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?: string
          fornecedor_id?: string | null
          id?: string
          numero_parcelas?: number
          obra_id?: string | null
          orcamento_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_compras_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_compras_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "of_orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      of_contas: {
        Row: {
          ativa: boolean
          banco: string
          created_at: string
          id: string
          nome: string
          saldo_atual: number
          saldo_inicial: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativa?: boolean
          banco?: string
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativa?: boolean
          banco?: string
          created_at?: string
          id?: string
          nome?: string
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_extratos_importados: {
        Row: {
          arquivo_nome: string
          conta_id: string
          data_fim: string | null
          data_inicio: string | null
          fit_id_range: string
          id: string
          importado_em: string
          total_conciliadas: number
          total_transacoes: number
          user_id: string
        }
        Insert: {
          arquivo_nome?: string
          conta_id: string
          data_fim?: string | null
          data_inicio?: string | null
          fit_id_range?: string
          id?: string
          importado_em?: string
          total_conciliadas?: number
          total_transacoes?: number
          user_id: string
        }
        Update: {
          arquivo_nome?: string
          conta_id?: string
          data_fim?: string | null
          data_inicio?: string | null
          fit_id_range?: string
          id?: string
          importado_em?: string
          total_conciliadas?: number
          total_transacoes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "of_extratos_importados_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      of_fornecedores: {
        Row: {
          categoria: string
          created_at: string
          documento: string
          email: string
          id: string
          nome: string
          observacoes: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          documento?: string
          email?: string
          id?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          documento?: string
          email?: string
          id?: string
          nome?: string
          observacoes?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_notas_fiscais: {
        Row: {
          arquivo_url: string | null
          chave_acesso: string
          compra_id: string | null
          created_at: string
          data_emissao: string
          fornecedor_id: string | null
          id: string
          numero: string
          serie: string
          status: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          arquivo_url?: string | null
          chave_acesso?: string
          compra_id?: string | null
          created_at?: string
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          numero?: string
          serie?: string
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          arquivo_url?: string | null
          chave_acesso?: string
          compra_id?: string | null
          created_at?: string
          data_emissao?: string
          fornecedor_id?: string | null
          id?: string
          numero?: string
          serie?: string
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_notas_fiscais_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_notas_fiscais_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "of_transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      of_obras: {
        Row: {
          created_at: string
          data_inicio: string | null
          data_previsao_fim: string | null
          endereco: string
          id: string
          nome: string
          orcamento_total_previsto: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string
          id?: string
          nome?: string
          orcamento_total_previsto?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string
          id?: string
          nome?: string
          orcamento_total_previsto?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      of_orcamentos: {
        Row: {
          anexo_url: string | null
          compra_id: string | null
          created_at: string
          data: string
          descricao: string
          fornecedor_id: string | null
          id: string
          obra_id: string | null
          status: string
          updated_at: string
          user_id: string
          validade_ate: string | null
          valor_total: number
        }
        Insert: {
          anexo_url?: string | null
          compra_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validade_ate?: string | null
          valor_total?: number
        }
        Update: {
          anexo_url?: string | null
          compra_id?: string | null
          created_at?: string
          data?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validade_ate?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_of_orcamentos_compra"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_orcamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "of_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      of_parcelas: {
        Row: {
          compra_id: string
          created_at: string
          data_pagamento: string | null
          id: string
          numero: number
          status: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
          vencimento: string
        }
        Insert: {
          compra_id: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
          vencimento?: string
        }
        Update: {
          compra_id?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "of_parcelas_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "of_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_parcelas_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "of_transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      of_recorrencias: {
        Row: {
          ativa: boolean
          categoria: string
          conta_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          frequencia: string
          id: string
          tipo: string
          ultima_geracao_em: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          categoria?: string
          conta_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          frequencia?: string
          id?: string
          tipo?: string
          ultima_geracao_em?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          ativa?: boolean
          categoria?: string
          conta_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          frequencia?: string
          id?: string
          tipo?: string
          ultima_geracao_em?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_recorrencias_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      of_transacoes: {
        Row: {
          categoria: string
          conciliado: boolean
          conciliado_em: string | null
          conta_id: string
          created_at: string
          data: string
          descricao: string
          extrato_arquivo: string | null
          extrato_fit_id: string | null
          id: string
          metodo_pagamento: string
          obra_id: string | null
          observacoes: string
          origem_id: string | null
          origem_tipo: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id: string
          created_at?: string
          data?: string
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          metodo_pagamento?: string
          obra_id?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          conciliado?: boolean
          conciliado_em?: string | null
          conta_id?: string
          created_at?: string
          data?: string
          descricao?: string
          extrato_arquivo?: string | null
          extrato_fit_id?: string | null
          id?: string
          metodo_pagamento?: string
          obra_id?: string | null
          observacoes?: string
          origem_id?: string | null
          origem_tipo?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "of_transacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "of_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "of_transacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "of_obras"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          convenio: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          phone_number: string
          primeiro_contato: string
          remote_jid: string
          status: string
          tags: string[] | null
          total_atendimentos: number
          total_mensagens: number
          ultimo_contato: string
          updated_at: string
        }
        Insert: {
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          phone_number: string
          primeiro_contato?: string
          remote_jid: string
          status?: string
          tags?: string[] | null
          total_atendimentos?: number
          total_mensagens?: number
          ultimo_contato?: string
          updated_at?: string
        }
        Update: {
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          phone_number?: string
          primeiro_contato?: string
          remote_jid?: string
          status?: string
          tags?: string[] | null
          total_atendimentos?: number
          total_mensagens?: number
          ultimo_contato?: string
          updated_at?: string
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          direction: string | null
          entry_price: number | null
          exit_price: number | null
          id: number
          market_id: string | null
          market_name: string | null
          pnl: number | null
          quantity: number | null
          strategy: string | null
          timestamp: string | null
        }
        Insert: {
          direction?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: number
          market_id?: string | null
          market_name?: string | null
          pnl?: number | null
          quantity?: number | null
          strategy?: string | null
          timestamp?: string | null
        }
        Update: {
          direction?: string | null
          entry_price?: number | null
          exit_price?: number | null
          id?: number
          market_id?: string | null
          market_name?: string | null
          pnl?: number | null
          quantity?: number | null
          strategy?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          pipeline_id: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          cash: number | null
          id: number
          positions: Json | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          cash?: number | null
          id?: number
          positions?: Json | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          cash?: number | null
          id?: number
          positions?: Json | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          bonus_edit_credits: number | null
          brand_id: string
          caption: string | null
          chat_history: Json | null
          created_at: string | null
          error_message: string | null
          format_dimensions: string | null
          format_type: string | null
          hashtags: string[] | null
          id: string
          original_prompt: string | null
          platform: string | null
          published_at: string | null
          scheduled_at: string | null
          slides: Json | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bonus_edit_credits?: number | null
          brand_id: string
          caption?: string | null
          chat_history?: Json | null
          created_at?: string | null
          error_message?: string | null
          format_dimensions?: string | null
          format_type?: string | null
          hashtags?: string[] | null
          id?: string
          original_prompt?: string | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slides?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bonus_edit_credits?: number | null
          brand_id?: string
          caption?: string | null
          chat_history?: Json | null
          created_at?: string | null
          error_message?: string | null
          format_dimensions?: string | null
          format_type?: string | null
          hashtags?: string[] | null
          id?: string
          original_prompt?: string | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slides?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string
          account_role: Database["public"]["Enums"]["account_role_enum"]
          avatar_url: string | null
          beta_features: string[]
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          account_role: Database["public"]["Enums"]["account_role_enum"]
          avatar_url?: string | null
          beta_features?: string[]
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          account_role?: Database["public"]["Enums"]["account_role_enum"]
          avatar_url?: string | null
          beta_features?: string[]
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sessions: {
        Row: {
          briefing: Json
          created_at: string
          error: string | null
          id: string
          model: string | null
          raw_content: Json | null
          search_provider: string | null
          sources: Json
          status: string
          topic: string
          user_id: string
        }
        Insert: {
          briefing?: Json
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          raw_content?: Json | null
          search_provider?: string | null
          sources?: Json
          status?: string
          topic: string
          user_id: string
        }
        Update: {
          briefing?: Json
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          raw_content?: Json | null
          search_provider?: string | null
          sources?: Json
          status?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_lists: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          ig_account_id: string
          name: string
          updated_at: string | null
          user_id: string
          username_count: number
        }
        Insert: {
          created_at?: string | null
          data?: Json
          id?: string
          ig_account_id: string
          name: string
          updated_at?: string | null
          user_id: string
          username_count?: number
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          ig_account_id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          username_count?: number
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          brand_id: string | null
          caption: string
          cover_url: string | null
          created_at: string
          format: string | null
          id: string
          ig_connection_id: string | null
          ig_container_id: string | null
          ig_media_id: string | null
          notes: string
          post_id: string | null
          publish_attempts: number
          publish_error: string | null
          published_at: string | null
          scheduled_at: string
          scheduled_at_tz: string | null
          status: Database["public"]["Enums"]["scheduled_post_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          caption?: string
          cover_url?: string | null
          created_at?: string
          format?: string | null
          id?: string
          ig_connection_id?: string | null
          ig_container_id?: string | null
          ig_media_id?: string | null
          notes?: string
          post_id?: string | null
          publish_attempts?: number
          publish_error?: string | null
          published_at?: string | null
          scheduled_at: string
          scheduled_at_tz?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          brand_id?: string | null
          caption?: string
          cover_url?: string | null
          created_at?: string
          format?: string | null
          id?: string
          ig_connection_id?: string | null
          ig_container_id?: string | null
          ig_media_id?: string | null
          notes?: string
          post_id?: string | null
          publish_attempts?: number
          publish_error?: string | null
          published_at?: string | null
          scheduled_at?: string
          scheduled_at_tz?: string | null
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "sg_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_ig_connection_id_fkey"
            columns: ["ig_connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "sg_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_stats: {
        Row: {
          blocks_count: number | null
          comments_count: number | null
          device_id: string | null
          errors_count: number | null
          follows_count: number | null
          id: string
          ig_account_id: string | null
          likes_count: number | null
          session_end: string | null
          session_start: string | null
          skips_count: number | null
          unfollows_count: number | null
          user_id: string | null
        }
        Insert: {
          blocks_count?: number | null
          comments_count?: number | null
          device_id?: string | null
          errors_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string | null
          likes_count?: number | null
          session_end?: string | null
          session_start?: string | null
          skips_count?: number | null
          unfollows_count?: number | null
          user_id?: string | null
        }
        Update: {
          blocks_count?: number | null
          comments_count?: number | null
          device_id?: string | null
          errors_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string | null
          likes_count?: number | null
          session_end?: string | null
          session_start?: string | null
          skips_count?: number | null
          unfollows_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_marcas: {
        Row: {
          brand_voice_sample: Json | null
          cidade: string | null
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          concorrentes: string | null
          created_at: string
          cta_padrao: string | null
          desejos_publico: string | null
          diferenciais: string | null
          dores_publico: string | null
          emojis_permitidos: boolean | null
          estado: string | null
          estilo_copy: string | null
          estilo_visual: string | null
          faixa_etaria: string | null
          font_body: string | null
          font_heading: string | null
          forbidden_words: string[] | null
          genero_publico: string | null
          hashtags: string | null
          id: string
          idioma: string | null
          instagram_handle: string | null
          interesses_publico: string | null
          is_default: boolean | null
          link_bio: string | null
          logo_url: string | null
          missao: string | null
          nicho: string | null
          nome: string
          objetivos_marca: string | null
          observacoes: string | null
          pais: string | null
          palavras_chave: string | null
          precos: string | null
          produtos_servicos: string | null
          proposta_valor: string | null
          publico_alvo: string | null
          segmento: string | null
          slug: string | null
          timezone: string
          tom_voz: string | null
          updated_at: string
          user_id: string
          valores: string | null
          visao: string | null
          voice_tone: string | null
          whatsapp: string | null
        }
        Insert: {
          brand_voice_sample?: Json | null
          cidade?: string | null
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          concorrentes?: string | null
          created_at?: string
          cta_padrao?: string | null
          desejos_publico?: string | null
          diferenciais?: string | null
          dores_publico?: string | null
          emojis_permitidos?: boolean | null
          estado?: string | null
          estilo_copy?: string | null
          estilo_visual?: string | null
          faixa_etaria?: string | null
          font_body?: string | null
          font_heading?: string | null
          forbidden_words?: string[] | null
          genero_publico?: string | null
          hashtags?: string | null
          id?: string
          idioma?: string | null
          instagram_handle?: string | null
          interesses_publico?: string | null
          is_default?: boolean | null
          link_bio?: string | null
          logo_url?: string | null
          missao?: string | null
          nicho?: string | null
          nome: string
          objetivos_marca?: string | null
          observacoes?: string | null
          pais?: string | null
          palavras_chave?: string | null
          precos?: string | null
          produtos_servicos?: string | null
          proposta_valor?: string | null
          publico_alvo?: string | null
          segmento?: string | null
          slug?: string | null
          timezone?: string
          tom_voz?: string | null
          updated_at?: string
          user_id?: string
          valores?: string | null
          visao?: string | null
          voice_tone?: string | null
          whatsapp?: string | null
        }
        Update: {
          brand_voice_sample?: Json | null
          cidade?: string | null
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          concorrentes?: string | null
          created_at?: string
          cta_padrao?: string | null
          desejos_publico?: string | null
          diferenciais?: string | null
          dores_publico?: string | null
          emojis_permitidos?: boolean | null
          estado?: string | null
          estilo_copy?: string | null
          estilo_visual?: string | null
          faixa_etaria?: string | null
          font_body?: string | null
          font_heading?: string | null
          forbidden_words?: string[] | null
          genero_publico?: string | null
          hashtags?: string | null
          id?: string
          idioma?: string | null
          instagram_handle?: string | null
          interesses_publico?: string | null
          is_default?: boolean | null
          link_bio?: string | null
          logo_url?: string | null
          missao?: string | null
          nicho?: string | null
          nome?: string
          objetivos_marca?: string | null
          observacoes?: string | null
          pais?: string | null
          palavras_chave?: string | null
          precos?: string | null
          produtos_servicos?: string | null
          proposta_valor?: string | null
          publico_alvo?: string | null
          segmento?: string | null
          slug?: string | null
          timezone?: string
          tom_voz?: string | null
          updated_at?: string
          user_id?: string
          valores?: string | null
          visao?: string | null
          voice_tone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      sg_posts: {
        Row: {
          brand_id: string | null
          caption: string | null
          created_at: string
          enhanced_prompt: string | null
          format_dimensions: string | null
          format_type: string | null
          formato_id: string
          id: string
          marca_id: string | null
          original_prompt: string | null
          render_config: Json
          scheduled_at: string | null
          slide_backgrounds: Json
          slide_copies: Json
          slide_images: Json
          slides: Json
          status: string
          thumbnail_url: string | null
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          caption?: string | null
          created_at?: string
          enhanced_prompt?: string | null
          format_dimensions?: string | null
          format_type?: string | null
          formato_id: string
          id?: string
          marca_id?: string | null
          original_prompt?: string | null
          render_config?: Json
          scheduled_at?: string | null
          slide_backgrounds?: Json
          slide_copies?: Json
          slide_images?: Json
          slides?: Json
          status?: string
          thumbnail_url?: string | null
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          brand_id?: string | null
          caption?: string | null
          created_at?: string
          enhanced_prompt?: string | null
          format_dimensions?: string | null
          format_type?: string | null
          formato_id?: string
          id?: string
          marca_id?: string | null
          original_prompt?: string | null
          render_config?: Json
          scheduled_at?: string | null
          slide_backgrounds?: Json
          slide_copies?: Json
          slide_images?: Json
          slides?: Json
          status?: string
          thumbnail_url?: string | null
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sg_posts_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "sg_marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      sg_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          plan: string
          rank: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          plan?: string
          rank?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          plan?: string
          rank?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_token: string
          account_type: string | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          external_id: string
          external_username: string | null
          id: string
          last_synced_at: string | null
          media_count: number | null
          page_id: string | null
          page_name: string | null
          provider: string
          scopes: string[] | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_type?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_id: string
          external_username?: string | null
          id?: string
          last_synced_at?: string | null
          media_count?: number | null
          page_id?: string | null
          page_name?: string | null
          provider: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_type?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          external_id?: string
          external_username?: string | null
          id?: string
          last_synced_at?: string | null
          media_count?: number | null
          page_id?: string | null
          page_name?: string | null
          provider?: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token_encrypted: string
          account_type: string | null
          brand_id: string | null
          connected_at: string
          created_at: string
          expires_at: string | null
          id: string
          ig_user_id: string
          last_refreshed_at: string | null
          platform: string
          profile_picture_url: string | null
          status: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token_encrypted: string
          account_type?: string | null
          brand_id?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_user_id: string
          last_refreshed_at?: string | null
          platform: string
          profile_picture_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token_encrypted?: string
          account_type?: string | null
          brand_id?: string | null
          connected_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_user_id?: string
          last_refreshed_at?: string | null
          platform?: string
          profile_picture_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          account_id: string
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          account_id: string
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          account_id?: string
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      target_queue: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          details: Json | null
          device_id: string | null
          id: string
          ig_account_id: string
          priority: number | null
          processed_at: string | null
          source: string | null
          status: string | null
          username: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          ig_account_id: string
          priority?: number | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          username: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          details?: Json | null
          device_id?: string | null
          id?: string
          ig_account_id?: string
          priority?: number | null
          processed_at?: string | null
          source?: string | null
          status?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "targeting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_queue_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      targeting_campaigns: {
        Row: {
          competitors: Json | null
          created_at: string
          hashtags: Json | null
          id: string
          ig_account_id: string | null
          is_active: boolean | null
          location: string | null
          name: string
          niche: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competitors?: Json | null
          created_at?: string
          hashtags?: Json | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          location?: string | null
          name: string
          niche?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competitors?: Json | null
          created_at?: string
          hashtags?: Json | null
          id?: string
          ig_account_id?: string | null
          is_active?: boolean | null
          location?: string | null
          name?: string
          niche?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "targeting_campaigns_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string
          enhanced_prompt: string
          format: string
          id: string
          is_premium: boolean
          tags: string[] | null
          title: string
        }
        Insert: {
          category: string
          cover_url?: string | null
          created_at?: string
          description: string
          enhanced_prompt: string
          format: string
          id?: string
          is_premium?: boolean
          tags?: string[] | null
          title: string
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          enhanced_prompt?: string
          format?: string
          id?: string
          is_premium?: boolean
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          credits: number | null
          plan_key: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          credits?: number | null
          plan_key?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          credits?: number | null
          plan_key?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          automation_paused: boolean | null
          automation_paused_at: string | null
          id: string
          settings_json: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          automation_paused?: boolean | null
          automation_paused_at?: string | null
          id?: string
          settings_json?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          automation_paused?: boolean | null
          automation_paused_at?: string | null
          id?: string
          settings_json?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          brand_completed: boolean
          exports: number
          last_login_date: string | null
          level: number
          login_streak: number
          posts_created: number
          regenerations: number
          tier: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_completed?: boolean
          exports?: number
          last_login_date?: string | null
          level?: number
          login_streak?: number
          posts_created?: number
          regenerations?: number
          tier?: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_completed?: boolean
          exports?: number
          last_login_date?: string | null
          level?: number
          login_streak?: number
          posts_created?: number
          regenerations?: number
          tier?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          access_token: string
          account_id: string
          connected_at: string | null
          created_at: string | null
          id: string
          last_registration_error: string | null
          phone_number_id: string
          registered_at: string | null
          status: string
          subscribed_apps_at: string | null
          updated_at: string | null
          user_id: string
          verify_token: string | null
          waba_id: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_registration_error?: string | null
          phone_number_id: string
          registered_at?: string | null
          status?: string
          subscribed_apps_at?: string | null
          updated_at?: string | null
          user_id: string
          verify_token?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_registration_error?: string | null
          phone_number_id?: string
          registered_at?: string | null
          status?: string
          subscribed_apps_at?: string | null
          updated_at?: string | null
          user_id?: string
          verify_token?: string | null
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_state: {
        Row: {
          birth_date: string | null
          cidade_atendimento: string | null
          convenio: string | null
          conversation_id: string | null
          created_at: string
          current_intent: string | null
          current_step: string
          data_preferida: string | null
          human_reason: string | null
          id: number
          last_message_at: string
          local_preferido: string | null
          motivo_consulta: string | null
          needs_human: boolean
          opcao_agenda_escolhida: string | null
          patient_name: string | null
          phone: string
          source: string
          status: string
          tipo_atendimento: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cidade_atendimento?: string | null
          convenio?: string | null
          conversation_id?: string | null
          created_at?: string
          current_intent?: string | null
          current_step?: string
          data_preferida?: string | null
          human_reason?: string | null
          id?: number
          last_message_at?: string
          local_preferido?: string | null
          motivo_consulta?: string | null
          needs_human?: boolean
          opcao_agenda_escolhida?: string | null
          patient_name?: string | null
          phone: string
          source: string
          status?: string
          tipo_atendimento?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cidade_atendimento?: string | null
          convenio?: string | null
          conversation_id?: string | null
          created_at?: string
          current_intent?: string | null
          current_step?: string
          data_preferida?: string | null
          human_reason?: string | null
          id?: number
          last_message_at?: string
          local_preferido?: string | null
          motivo_consulta?: string | null
          needs_human?: boolean
          opcao_agenda_escolhida?: string | null
          patient_name?: string | null
          phone?: string
          source?: string
          status?: string
          tipo_atendimento?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whitelist: {
        Row: {
          added_at: string | null
          full_name: string | null
          id: string
          ig_account_id: string | null
          ig_user_id: string
          profile_pic_url: string | null
          reason: string | null
          user_id: string
          username: string
        }
        Insert: {
          added_at?: string | null
          full_name?: string | null
          id?: string
          ig_account_id?: string | null
          ig_user_id: string
          profile_pic_url?: string | null
          reason?: string | null
          user_id: string
          username: string
        }
        Update: {
          added_at?: string | null
          full_name?: string | null
          id?: string
          ig_account_id?: string | null
          ig_user_id?: string
          profile_pic_url?: string | null
          reason?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_action_summary: {
        Row: {
          action_type: string | null
          day: string | null
          failed_count: number | null
          ig_account_id: string | null
          success_count: number | null
          total_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_log_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_last_30_days: {
        Row: {
          day: string | null
          followers_count: number | null
          following_count: number | null
          ig_account_id: string | null
          posts_count: number | null
          recorded_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_stats_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_phase_metrics_summary: {
        Row: {
          avg_latency_ms: number | null
          failure_count: number | null
          last_failure_at: string | null
          last_failure_message: string | null
          last_model: string | null
          phase: string | null
          success_count: number | null
          total: number | null
        }
        Relationships: []
      }
      vw_atendimentos_ativos: {
        Row: {
          assunto: string | null
          atendimento_id: string | null
          convenio: string | null
          inicio: string | null
          minutos_ativo: number | null
          nome: string | null
          phone_number: string | null
          tipo: string | null
          total_mensagens: number | null
        }
        Relationships: []
      }
      vw_painel_pacientes: {
        Row: {
          consultas_pendentes: number | null
          convenio: string | null
          id: string | null
          nome: string | null
          phone_number: string | null
          primeiro_contato: string | null
          proxima_consulta: string | null
          status: string | null
          tags: string[] | null
          total_atendimentos: number | null
          total_mensagens: number | null
          ultimo_contato: string | null
        }
        Insert: {
          consultas_pendentes?: never
          convenio?: string | null
          id?: string | null
          nome?: string | null
          phone_number?: string | null
          primeiro_contato?: string | null
          proxima_consulta?: never
          status?: string | null
          tags?: string[] | null
          total_atendimentos?: number | null
          total_mensagens?: number | null
          ultimo_contato?: string | null
        }
        Update: {
          consultas_pendentes?: never
          convenio?: string | null
          id?: string | null
          nome?: string | null
          phone_number?: string | null
          primeiro_contato?: string | null
          proxima_consulta?: never
          status?: string | null
          tags?: string[] | null
          total_atendimentos?: number | null
          total_mensagens?: number | null
          ultimo_contato?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _bcast_bump: {
        Args: { bid: string; col: string; delta: number }
        Returns: undefined
      }
      _bcast_cols_for_status: { Args: { s: string }; Returns: string[] }
      _folha_audit: {
        Args: {
          p_acao: string
          p_dados: Json
          p_folha_id: string
          p_user: string
        }
        Returns: undefined
      }
      _folha_competencia_label: { Args: { p: string }; Returns: string }
      add_targets_batch: {
        Args: {
          p_campaign_id?: string
          p_ig_account_id: string
          p_source?: string
          p_usernames: string[]
        }
        Returns: number
      }
      approve_extracted_movement: {
        Args: {
          p_account_id?: string
          p_category: string
          p_date: string
          p_description: string
          p_movement_id: string
          p_type: string
          p_value: number
        }
        Returns: Json
      }
      auto_provision_ig_account: {
        Args: { p_device_id: string; p_ig_username: string }
        Returns: string
      }
      award_xp: {
        Args: { _amount: number; _metadata?: Json; _reason: string }
        Returns: Json
      }
      cancel_assistant_recurring_payables: {
        Args: { p_confirm: string; p_delegation_id: string; p_user_id: string }
        Returns: Json
      }
      cleanup_growth_stats: { Args: never; Returns: number }
      clear_target_queue: {
        Args: { p_ig_account_id: string; p_status?: string }
        Returns: number
      }
      compute_level: { Args: { _xp: number }; Returns: number }
      compute_tier: { Args: { _level: number }; Returns: string }
      create_assistant_launch: {
        Args: {
          p_delegation_id: string
          p_document_hash: string
          p_idempotency_key: string
          p_request_payload: Json
          p_result_table: string
          p_row: Json
          p_user_id: string
        }
        Returns: Json
      }
      create_compra_atomica: {
        Args: { p_comissao?: Json; p_compra: Json; p_transacao?: Json }
        Returns: Json
      }
      debit_credits_atomic: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      decrypt_token: { Args: { ciphertext: string }; Returns: string }
      encrypt_token: { Args: { plain: string }; Returns: string }
      fetch_next_targets: {
        Args: { p_ig_account_id: string; p_limit?: number }
        Returns: {
          campaign_id: string
          campaign_name: string
          campaign_niche: string
          id: string
          priority: number
          source: string
          username: string
        }[]
      }
      fetch_pending_targets: {
        Args: { p_ig_account_id: string; p_limit?: number }
        Returns: {
          campaign_id: string | null
          created_at: string | null
          details: Json | null
          device_id: string | null
          id: string
          ig_account_id: string
          priority: number | null
          processed_at: string | null
          source: string | null
          status: string | null
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "target_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fin_can_write: { Args: never; Returns: boolean }
      fin_can_write_comissao: { Args: never; Returns: boolean }
      financial_consistency_report: { Args: never; Returns: Json }
      generate_bridge_token: {
        Args: { p_ig_account_id: string }
        Returns: string
      }
      get_dashboard_summary: {
        Args: { p_ig_account_id: string }
        Returns: Json
      }
      get_or_create_atendimento: {
        Args: {
          p_paciente_id: string
          p_phone_number: string
          p_timeout_horas?: number
        }
        Returns: string
      }
      get_rate_limits: { Args: { p_user_id: string }; Returns: Json }
      get_today_actions: {
        Args: { p_ig_account_id: string }
        Returns: {
          action_type: string
          count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      grant_daily_login_xp: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_bank_statement: {
        Args: {
          p_account_id: string
          p_document_id: string
          p_source_file: string
          p_transactions: Json
        }
        Returns: Json
      }
      increment_flow_execution_count: {
        Args: { p_flow_id: string }
        Returns: undefined
      }
      is_account_member: {
        Args: {
          min_role?: Database["public"]["Enums"]["account_role_enum"]
          target_account_id: string
        }
        Returns: boolean
      }
      lancar_folha_financeiro: { Args: { p_folha_id: string }; Returns: Json }
      marcar_folha_paga: {
        Args: { p_conta_id: string; p_data: string; p_folha_id: string }
        Returns: Json
      }
      mark_targets_done: {
        Args: { p_ig_account_id: string; p_target_ids: string[] }
        Returns: number
      }
      merge_duplicate_contacts: { Args: never; Returns: number }
      pagar_nf_atomica: {
        Args: {
          p_comissao?: Json
          p_compra_nova?: Json
          p_compra_vinculada_id?: string
          p_conta_id: string
          p_metodo: string
          p_nf_id: string
          p_parcelas?: Json
          p_transacao?: Json
        }
        Returns: Json
      }
      pagar_parcela_atomica: {
        Args: {
          p_compra_id: string
          p_numero_parcela: number
          p_transacao: Json
        }
        Returns: string
      }
      pay_financial_obligation: {
        Args: {
          p_account_id: string
          p_generate_commission: boolean
          p_idempotency_key: string
          p_installment_number?: number
          p_method: string
          p_obligation_id: string
          p_obligation_type: string
          p_paid_at: string
          p_receipt_path?: string
        }
        Returns: Json
      }
      peek_invitation: { Args: { p_token_hash: string }; Returns: Json }
      reabrir_folha: { Args: { p_folha_id: string }; Returns: Json }
      read_assistant_context: {
        Args: {
          p_delegation_id: string
          p_limit?: number
          p_resource: string
          p_user_id: string
        }
        Returns: Json
      }
      recompute_broadcast_counts: { Args: { bid: string }; Returns: undefined }
      reconcile_bank_movement: {
        Args: {
          p_generate_commission?: boolean
          p_movement_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      redeem_invitation: { Args: { p_token_hash: string }; Returns: string }
      refund_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      registrar_mensagem: {
        Args: {
          p_conteudo: string
          p_direcao?: string
          p_message_id?: string
          p_metadata?: Json
          p_nome: string
          p_phone_number: string
          p_remote_jid: string
          p_tipo_mensagem?: string
        }
        Returns: {
          atendimento_id: string
          mensagem_id: string
          paciente_id: string
        }[]
      }
      remove_account_member: { Args: { p_user_id: string }; Returns: string }
      remove_duplicate_targets: {
        Args: { p_ig_account_id: string }
        Returns: number
      }
      revoke_assistant_delegation: {
        Args: { p_user_id: string }
        Returns: number
      }
      rotate_assistant_delegation: {
        Args: {
          p_default_account_id: string
          p_expires_at: string
          p_label: string
          p_token_hash: string
          p_token_prefix: string
          p_user_id: string
        }
        Returns: string
      }
      send_bot_command: {
        Args: { p_command: string; p_ig_account_id: string; p_params: Json }
        Returns: string
      }
      set_member_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["account_role_enum"]
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_image_generation_atomic: {
        Args: {
          p_amount: number
          p_bypass_credits: boolean
          p_payload: Json
          p_post: Json
          p_total_slides: number
          p_user_id: string
        }
        Returns: Json
      }
      transfer_account_ownership: {
        Args: { p_new_owner_user_id: string }
        Returns: undefined
      }
      unlock_eligible_badges: { Args: { _user_id: string }; Returns: number }
      upsert_paciente: {
        Args: { p_nome?: string; p_phone_number: string; p_remote_jid: string }
        Returns: string
      }
    }
    Enums: {
      account_role_enum: "owner" | "admin" | "agent" | "viewer"
      app_role: "admin" | "financeiro" | "construtor" | "visualizador"
      folha_pagamento_status:
        | "rascunho"
        | "conferida"
        | "lancada"
        | "paga"
        | "cancelada"
      scheduled_post_status: "draft" | "scheduled" | "published" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role_enum: ["owner", "admin", "agent", "viewer"],
      app_role: ["admin", "financeiro", "construtor", "visualizador"],
      folha_pagamento_status: [
        "rascunho",
        "conferida",
        "lancada",
        "paga",
        "cancelada",
      ],
      scheduled_post_status: ["draft", "scheduled", "published", "failed"],
    },
  },
} as const
