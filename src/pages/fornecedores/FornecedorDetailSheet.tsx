import { Building2, Phone, Mail, MapPin, CreditCard, Copy, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StarRating } from "./StarRating";
import type { Fornecedor, Transacao } from "./types";

interface FornecedorDetailSheetProps {
  detalheFornecedor: Fornecedor | null;
  detalheTransacoes: Transacao[];
  onClose: () => void;
  onCopy: (text: string) => void;
  onEdit: (f: Fornecedor) => void;
  onDelete: (f: Fornecedor) => void;
}

export function FornecedorDetailSheet({
  detalheFornecedor,
  detalheTransacoes,
  onClose,
  onCopy,
  onEdit,
  onDelete,
}: FornecedorDetailSheetProps) {
  return (
    <Sheet open={!!detalheFornecedor} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        {detalheFornecedor && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
                {detalheFornecedor.nome}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                {detalheFornecedor.cnpj && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">CNPJ</p>
                    <p className="text-sm font-medium">{detalheFornecedor.cnpj}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Avaliacao</p>
                  <StarRating value={detalheFornecedor.avaliacao || 0} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {detalheFornecedor.telefone && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm font-medium">{detalheFornecedor.telefone}</p>
                    </div>
                  </div>
                )}
                {detalheFornecedor.email && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm font-medium">{detalheFornecedor.email}</p>
                    </div>
                  </div>
                )}
                {detalheFornecedor.endereco && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereco</p>
                      <p className="text-sm font-medium">{detalheFornecedor.endereco}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Banking */}
              {(detalheFornecedor.banco || detalheFornecedor.pix) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Dados Bancarios
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {detalheFornecedor.banco && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">Banco</p>
                        <p className="text-sm font-medium">{detalheFornecedor.banco}</p>
                      </div>
                    )}
                    {detalheFornecedor.agencia && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">Agencia</p>
                        <p className="text-sm font-medium">{detalheFornecedor.agencia}</p>
                      </div>
                    )}
                    {detalheFornecedor.conta && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs text-muted-foreground">Conta</p>
                        <p className="text-sm font-medium">{detalheFornecedor.conta}</p>
                      </div>
                    )}
                  </div>
                  {detalheFornecedor.pix && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="text-xs text-muted-foreground">Chave PIX ({detalheFornecedor.tipo_pix || "---"})</p>
                        <p className="text-sm font-medium">{detalheFornecedor.pix}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopy(detalheFornecedor.pix)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {detalheFornecedor.observacoes && (
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{detalheFornecedor.observacoes}</p>
                </div>
              )}

              {/* Transaction history */}
              <div>
                <h4 className="text-sm font-semibold mb-3">
                  Historico de Transacoes ({detalheTransacoes.length} movimentacoes)
                </h4>
                {detalheTransacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transacao vinculada</p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {detalheTransacoes.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{t.descricao || t.categoria}</p>
                          <p className="text-xs text-muted-foreground">{t.data}</p>
                        </div>
                        <span className="text-sm font-semibold text-destructive">
                          - {formatCurrency(Number(t.valor))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(detalheFornecedor)}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
                <Button variant="destructive" className="gap-2" onClick={() => onDelete(detalheFornecedor)}>
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
