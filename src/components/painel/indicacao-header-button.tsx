"use client";

import { useState } from "react";
import { IconIdCard } from "@/components/icons";
import { listarAportesElegiveisIndicacao, type AporteElegivelIndicacao } from "@/app/painel/actions";
import { LancarIndicacaoButton } from "@/app/painel/historico/lancar-indicacao-button";
import { formatMoeda, formatData } from "@/lib/format";

export function IndicacaoHeaderButton({ codigoIndicacao }: { codigoIndicacao: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aportes, setAportes] = useState<AporteElegivelIndicacao[] | null>(null);

  async function abrir() {
    setAberto(true);
    if (aportes === null) {
      setCarregando(true);
      const lista = await listarAportesElegiveisIndicacao();
      setAportes(lista);
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Lançar código de indicação"
        title="Lançar código de indicação"
        onClick={abrir}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconIdCard width={16} height={16} />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground">Lançar código de indicação</h3>
            {codigoIndicacao && (
              <p className="mt-1 text-xs text-muted">
                Seu código: <span className="font-semibold text-gold-light">{codigoIndicacao}</span>
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              Escolha um dos seus aportes e informe o código de quem te indicou — essa pessoa
              ganha 5% sobre o valor dele.
            </p>

            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto">
              {carregando && <p className="text-sm text-muted">Carregando...</p>}
              {!carregando && aportes?.length === 0 && (
                <p className="rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
                  Nenhum aporte disponível (ou todos já têm código lançado).
                </p>
              )}
              {aportes?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatMoeda(a.valor)}</p>
                    <p className="text-xs text-muted">{formatData(a.criadoEm)}</p>
                  </div>
                  <LancarIndicacaoButton aplicacaoId={a.id} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-4 w-full rounded-xl border border-border/60 py-2 text-sm font-semibold text-muted hover:text-foreground"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
