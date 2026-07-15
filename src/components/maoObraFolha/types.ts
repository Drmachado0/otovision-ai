import type {
  TrabalhadorEncargo,
  RegistroValor,
  FolhaItemExtras,
} from "@/lib/folhaMaoObra";

export interface Conta {
  id: string;
  nome: string;
  tipo?: string | null;
}

export interface Folha {
  id: string;
  mes_ref: string;
  total_diarias: number;
  total_fgts: number;
  total_inss: number;
  status: string;
}

export interface Props {
  userId: string;
  trabalhadores: TrabalhadorEncargo[];
  registros: RegistroValor[];
  contas: Conta[];
  folhas: Folha[];
  onChange: () => void;
}

export const EXTRA_FIELDS: { key: keyof FolhaItemExtras; label: string }[] = [
  { key: "fgts", label: "FGTS" },
  { key: "inss", label: "INSS" },
  { key: "quinzena", label: "Quinzena" },
  { key: "vales", label: "Vales" },
  { key: "vale_alimentacao", label: "V. Alim." },
  { key: "encerramento", label: "Encerram." },
  { key: "ferias_decimo", label: "Férias/13°" },
  { key: "horas_extras", label: "H. Extras" },
];
