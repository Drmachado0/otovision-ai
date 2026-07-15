import type { Dispatch, SetStateAction, FormEvent } from "react";
import { HardHat, Phone, DollarSign, Calendar, Clock, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Trabalhador, Registro, RegistroForm } from "./types";

interface TrabalhadorDetailSheetProps {
  trabalhador: Trabalhador | null;
  onClose: () => void;
  workerCustoMes: number;
  workerRegistros: Registro[];
  registroForm: RegistroForm;
  setRegistroForm: Dispatch<SetStateAction<RegistroForm>>;
  savingRegistro: boolean;
  onRegistro: (e: FormEvent) => void;
}

export function TrabalhadorDetailSheet({
  trabalhador,
  onClose,
  workerCustoMes,
  workerRegistros,
  registroForm,
  setRegistroForm,
  savingRegistro,
  onRegistro,
}: TrabalhadorDetailSheetProps) {
  return (
    <Sheet
      open={!!trabalhador}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {trabalhador && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-primary" />
                {trabalhador.nome}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Worker info summary */}
              <div className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Função</span>
                  <span className="text-sm font-medium">
                    {trabalhador.funcao || "-"}
                  </span>
                </div>
                {trabalhador.telefone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Telefone
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {trabalhador.telefone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Valor Diária
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(trabalhador.valor_diaria ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Valor Hora
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(trabalhador.valor_hora ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contrato</span>
                  <Badge variant="outline" className="text-xs">
                    {trabalhador.tipo_contrato || "Diária"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Início</span>
                  <span className="text-sm font-medium">
                    {formatDate(trabalhador.data_inicio)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    className={
                      trabalhador.ativo ? "badge-success" : "badge-muted"
                    }
                  >
                    {trabalhador.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              {/* Monthly cost summary */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground uppercase">
                    Custo do Mês
                  </span>
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(workerCustoMes)}
                </p>
              </div>

              {/* Registrar Dia form */}
              <div className="glass-card p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Registrar Dia
                </h4>
                <form onSubmit={onRegistro} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Data
                      </Label>
                      <Input
                        type="date"
                        value={registroForm.data}
                        onChange={(e) =>
                          setRegistroForm({
                            ...registroForm,
                            data: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Horas
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="8"
                        value={registroForm.horas}
                        onChange={(e) =>
                          setRegistroForm({
                            ...registroForm,
                            horas: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Observações
                    </Label>
                    <Input
                      placeholder="Ex: Serviço de alvenaria..."
                      value={registroForm.observacoes}
                      onChange={(e) =>
                        setRegistroForm({
                          ...registroForm,
                          observacoes: e.target.value,
                        })
                      }
                    />
                  </div>
                  {/* Auto-calc preview */}
                  <div className="text-xs text-muted-foreground">
                    Valor estimado:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        trabalhador.tipo_contrato === "Hora"
                          ? (Number(registroForm.horas) || 0) *
                              (trabalhador.valor_hora || 0)
                          : trabalhador.valor_diaria || 0
                      )}
                    </span>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={savingRegistro}
                  >
                    <Plus className="w-4 h-4" />
                    {savingRegistro ? "Salvando..." : "Registrar Dia"}
                  </Button>
                </form>
              </div>

              {/* Recent registros */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Registros Recentes
                </h4>
                {workerRegistros.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum registro encontrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {workerRegistros.map((r) => (
                      <div
                        key={r.id}
                        className="glass-card p-3 flex items-center justify-between animate-fade-in-up"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(r.data)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.horas}h
                            {r.observacoes ? ` - ${r.observacoes}` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(r.valor ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
