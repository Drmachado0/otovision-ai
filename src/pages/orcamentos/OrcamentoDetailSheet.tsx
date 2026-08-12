import { FileText, Check, X, AlertTriangle, ShoppingCart, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { STATUS_COLORS, getDisplayStatus, type Orcamento } from "./types";

interface OrcamentoDetailSheetProps {
  orcamento: Orcamento | null;
  onClose: () => void;
  onApprove: (o: Orcamento) => void;
  onReject: (o: Orcamento) => void;
  onConvertToCompra: (o: Orcamento) => void;
  onDelete: (id: string) => void;
}

export function OrcamentoDetailSheet({
  orcamento,
  onClose,
  onApprove,
  onReject,
  onConvertToCompra,
  onDelete,
}: OrcamentoDetailSheetProps) {
  return (
    <Sheet open={!!orcamento} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {orcamento && (() => {
          const displayStatus = getDisplayStatus(orcamento);
          return (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Detalhes do Orçamento
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={`text-sm ${STATUS_COLORS[displayStatus] || "badge-muted"}`}>
                    {displayStatus === "Vencido" && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                    {displayStatus}
                  </Badge>
                  <span className="text-2xl font-bold">{formatCurrency(Number(orcamento.valor_total))}</span>
                </div>

                <Separator />

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Fornecedor</span>
                    <span className="font-medium">{orcamento.fornecedor}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Categoria</span>
                    <span className="font-medium">{orcamento.categoria || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Data</span>
                    <span>{formatDate(orcamento.data)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Validade</span>
                    <span className={displayStatus === "Vencido" ? "text-destructive font-medium" : ""}>
                      {orcamento.validade ? formatDate(orcamento.validade) : "-"}
                    </span>
                  </div>
                </div>

                {orcamento.descricao && (
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Descrição</span>
                    <p>{orcamento.descricao}</p>
                  </div>
                )}

                {orcamento.condicoes_pagamento && (
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Condições de Pagamento</span>
                    <p>{orcamento.condicoes_pagamento}</p>
                  </div>
                )}

                {orcamento.observacoes && (
                  <div className="text-sm">
                    <span className="text-xs text-muted-foreground uppercase block mb-1">Observações</span>
                    <p>{orcamento.observacoes}</p>
                  </div>
                )}

                {/* Line Items */}
                {orcamento.itens && orcamento.itens.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-xs text-muted-foreground uppercase block mb-3">Itens do Orçamento</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50">
                              <th className="text-left py-2 text-xs font-medium text-muted-foreground">Descrição</th>
                              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Qtd</th>
                              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Unit.</th>
                              <th className="text-right py-2 text-xs font-medium text-muted-foreground">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orcamento.itens.map((item, i) => (
                              <tr key={i} className="border-b border-border/20">
                                <td className="py-2">{item.descricao}</td>
                                <td className="py-2 text-right text-muted-foreground">{item.quantidade}</td>
                                <td className="py-2 text-right text-muted-foreground">{formatCurrency(Number(item.valor_unitario))}</td>
                                <td className="py-2 text-right font-medium">{formatCurrency(Number(item.valor_total))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Approval Info */}
                {orcamento.aprovado_por && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-xs text-muted-foreground uppercase block mb-1">
                        {orcamento.status === "Aprovado" ? "Aprovado por" : "Rejeitado por"}
                      </span>
                      <p>{orcamento.aprovado_por}</p>
                      {orcamento.aprovado_em && (
                        <p className="text-xs text-muted-foreground mt-1">em {formatDate(orcamento.aprovado_em)}</p>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {(displayStatus === "Pendente" || displayStatus === "Vencido") && (
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" onClick={() => onApprove(orcamento)}>
                        <Check className="w-4 h-4" /> Aprovar
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-2" onClick={() => onReject(orcamento)}>
                        <X className="w-4 h-4" /> Rejeitar
                      </Button>
                    </div>
                  )}
                  {orcamento.status === "Aprovado" && (
                    <Button className="gap-2" onClick={() => onConvertToCompra(orcamento)}>
                      <ShoppingCart className="w-4 h-4" /> Converter em Compra
                    </Button>
                  )}
                  {orcamento.status === "Pago" && (
                    <Badge className="badge-success self-start">✓ Pago</Badge>
                  )}
                  <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" onClick={() => onDelete(orcamento.id)}>
                    <Trash2 className="w-4 h-4" /> Excluir Orçamento
                  </Button>
                </div>
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}
