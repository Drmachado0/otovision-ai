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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      obra_audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      obra_comissao_pagamentos: {
        Row: {
          auto: boolean | null
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          deleted_at: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          mes: string | null
          observacoes: string | null
          pago: boolean | null
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          auto?: boolean | null
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          mes?: string | null
          observacoes?: string | null
          pago?: boolean | null
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          auto?: boolean | null
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          deleted_at?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          mes?: string | null
          observacoes?: string | null
          pago?: boolean | null
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      obra_compras: {
        Row: {
          categoria: string | null
          conta_id: string | null
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          nf_vinculada: string | null
          numero_parcelas: number | null
          observacoes: string | null
          parcelas: Json | null
          status_entrega: string | null
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          nf_vinculada?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelas?: Json | null
          status_entrega?: string | null
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          nf_vinculada?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelas?: Json | null
          status_entrega?: string | null
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
          motivo_desfazer: string | null
          motivo_matching: string | null
          movimentacao_extraida_id: string | null
          observacoes: string | null
          score_compatibilidade: number | null
          status_conciliacao: string | null
          tipo_conciliacao: string | null
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
          motivo_desfazer?: string | null
          motivo_matching?: string | null
          movimentacao_extraida_id?: string | null
          observacoes?: string | null
          score_compatibilidade?: number | null
          status_conciliacao?: string | null
          tipo_conciliacao?: string | null
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
          motivo_desfazer?: string | null
          motivo_matching?: string | null
          movimentacao_extraida_id?: string | null
          observacoes?: string | null
          score_compatibilidade?: number | null
          status_conciliacao?: string | null
          tipo_conciliacao?: string | null
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
        ]
      }
      obra_config: {
        Row: {
          area_construida: number
          created_at: string
          data_inicio: string | null
          data_termino: string | null
          id: string
          nome_obra: string
          orcamento_total: number
          responsavel: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_construida?: number
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_construida?: number
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          id?: string
          nome_obra?: string
          orcamento_total?: number
          responsavel?: string | null
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
          observacoes: string | null
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
          nome: string
          observacoes?: string | null
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
          observacoes?: string | null
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_cronograma: {
        Row: {
          created_at: string
          custo_previsto: number | null
          custo_real: number | null
          fim_previsto: string | null
          id: string
          inicio_previsto: string | null
          nome: string
          observacoes: string | null
          percentual_conclusao: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_previsto?: number | null
          custo_real?: number | null
          fim_previsto?: string | null
          id?: string
          inicio_previsto?: string | null
          nome: string
          observacoes?: string | null
          percentual_conclusao?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo_previsto?: number | null
          custo_real?: number | null
          fim_previsto?: string | null
          id?: string
          inicio_previsto?: string | null
          nome?: string
          observacoes?: string | null
          percentual_conclusao?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_diario: {
        Row: {
          atividades: string | null
          avanco_percentual: number | null
          clima: string | null
          created_at: string
          data: string
          equipes: string[] | null
          etapas_trabalhadas: string[] | null
          fotos: string[] | null
          id: string
          observacoes: string | null
          problemas: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atividades?: string | null
          avanco_percentual?: number | null
          clima?: string | null
          created_at?: string
          data: string
          equipes?: string[] | null
          etapas_trabalhadas?: string[] | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          problemas?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atividades?: string | null
          avanco_percentual?: number | null
          clima?: string | null
          created_at?: string
          data?: string
          equipes?: string[] | null
          etapas_trabalhadas?: string[] | null
          fotos?: string[] | null
          id?: string
          observacoes?: string | null
          problemas?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_documentos_processados: {
        Row: {
          caminho_origem: string | null
          confianca_extracao: number | null
          created_at: string
          documento_relacionado_id: string | null
          duplicidade_score: number | null
          duplicidade_status: string | null
          hash_arquivo: string | null
          id: string
          motivo_erro: string | null
          motivo_revisao: string | null
          nome_arquivo: string
          origem_arquivo: string | null
          payload_bruto: Json | null
          payload_normalizado: Json | null
          status_processamento: string | null
          storage_path: string | null
          tipo_arquivo: string | null
          tipo_documento: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caminho_origem?: string | null
          confianca_extracao?: number | null
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number | null
          duplicidade_status?: string | null
          hash_arquivo?: string | null
          id?: string
          motivo_erro?: string | null
          motivo_revisao?: string | null
          nome_arquivo: string
          origem_arquivo?: string | null
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string | null
          storage_path?: string | null
          tipo_arquivo?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caminho_origem?: string | null
          confianca_extracao?: number | null
          created_at?: string
          documento_relacionado_id?: string | null
          duplicidade_score?: number | null
          duplicidade_status?: string | null
          hash_arquivo?: string | null
          id?: string
          motivo_erro?: string | null
          motivo_revisao?: string | null
          nome_arquivo?: string
          origem_arquivo?: string | null
          payload_bruto?: Json | null
          payload_normalizado?: Json | null
          status_processamento?: string | null
          storage_path?: string | null
          tipo_arquivo?: string | null
          tipo_documento?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_eventos_conciliacao: {
        Row: {
          conciliacao_id: string | null
          created_at: string
          detalhes: string | null
          id: string
          tipo_evento: string | null
          user_id: string
        }
        Insert: {
          conciliacao_id?: string | null
          created_at?: string
          detalhes?: string | null
          id?: string
          tipo_evento?: string | null
          user_id: string
        }
        Update: {
          conciliacao_id?: string | null
          created_at?: string
          detalhes?: string | null
          id?: string
          tipo_evento?: string | null
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
          documento_id: string | null
          etapa: string
          id: string
          mensagem: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          documento_id?: string | null
          etapa: string
          id?: string
          mensagem?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          documento_id?: string | null
          etapa?: string
          id?: string
          mensagem?: string | null
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
      obra_funcionarios: {
        Row: {
          created_at: string
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          salario_diario: number | null
          status: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          funcao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          salario_diario?: number | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          salario_diario?: number | null
          status?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      obra_medicoes: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          itens: Json | null
          observacoes: string | null
          percentual_geral: number | null
          updated_at: string
          user_id: string
          valor_total_medido: number | null
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          itens?: Json | null
          observacoes?: string | null
          percentual_geral?: number | null
          updated_at?: string
          user_id: string
          valor_total_medido?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          itens?: Json | null
          observacoes?: string | null
          percentual_geral?: number | null
          updated_at?: string
          user_id?: string
          valor_total_medido?: number | null
        }
        Relationships: []
      }
      obra_movimentacoes_extraidas: {
        Row: {
          categoria_sugerida: string | null
          created_at: string
          data_movimentacao: string | null
          descricao: string | null
          documento_id: string | null
          id: string
          saldo: number | null
          score_confianca: number | null
          score_duplicidade: number | null
          status_revisao: string | null
          tipo_movimentacao: string | null
          transacao_id: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_sugerida?: string | null
          created_at?: string
          data_movimentacao?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          saldo?: number | null
          score_confianca?: number | null
          score_duplicidade?: number | null
          status_revisao?: string | null
          tipo_movimentacao?: string | null
          transacao_id?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          categoria_sugerida?: string | null
          created_at?: string
          data_movimentacao?: string | null
          descricao?: string | null
          documento_id?: string | null
          id?: string
          saldo?: number | null
          score_confianca?: number | null
          score_duplicidade?: number | null
          status_revisao?: string | null
          tipo_movimentacao?: string | null
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
          categoria: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string | null
          deleted_at: string | null
          descricao: string | null
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          numero: string | null
          status: string | null
          updated_at: string
          user_id: string
          valor_bruto: number | null
          valor_liquido: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          numero?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string | null
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          numero?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          valor_bruto?: number | null
          valor_liquido?: number | null
        }
        Relationships: []
      }
      obra_notificacoes: {
        Row: {
          created_at: string
          id: string
          link: string | null
          mensagem: string | null
          prioridade: string | null
          read_at: string | null
          status: string | null
          tipo: string | null
          titulo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string | null
          prioridade?: string | null
          read_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          mensagem?: string | null
          prioridade?: string | null
          read_at?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      obra_sugestoes_conciliacao: {
        Row: {
          created_at: string
          id: string
          motivo_matching: string | null
          movimentacao_extraida_id: string | null
          score_compatibilidade: number | null
          status_sugestao: string | null
          transacao_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_matching?: string | null
          movimentacao_extraida_id?: string | null
          score_compatibilidade?: number | null
          status_sugestao?: string | null
          transacao_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo_matching?: string | null
          movimentacao_extraida_id?: string | null
          score_compatibilidade?: number | null
          status_sugestao?: string | null
          transacao_id?: string | null
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
        ]
      }
      obra_transacoes_fluxo: {
        Row: {
          categoria: string
          conciliado: boolean | null
          conciliado_em: string | null
          conta_id: string | null
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          origem_id: string | null
          origem_tipo: string | null
          recorrencia: string | null
          referencia: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          conciliado?: boolean | null
          conciliado_em?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          recorrencia?: string | null
          referencia?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          conciliado?: boolean | null
          conciliado_em?: string | null
          conta_id?: string | null
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          origem_id?: string | null
          origem_tipo?: string | null
          recorrencia?: string | null
          referencia?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pagar_nf_atomica: {
        Args: {
          p_comissao: Json
          p_conta_id: string
          p_metodo: string
          p_nf_id: string
          p_transacao: Json
        }
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
