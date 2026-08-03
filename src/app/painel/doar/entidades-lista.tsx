"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { MoneyInput } from "@/components/ui/money-input";
import { IconVerified } from "@/components/icons";
import { PIX_CHAVE, PIX_TIPO_CHAVE, PIX_BENEFICIARIO } from "@/lib/config";
import { doarComSaldo, criarDoacaoNovaAplicacao } from "./actions";

export type EntidadeCard = {
  id: string;
  nome: string;
  tipo: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  descricao: string | null;
  logoUrl: string | null;
  podeReceberDoacao: boolean;
  podeReceberAplicacao: boolean;
};

function cnpjParcial(cnpj: string): string {
  return `**.${cnpj.slice(2, 5)}.***/****-${cnpj.slice(12, 14)}`;
}

export function EntidadesLista({
  entidades,
  saldoDisponivel,
}: {
  entidades: EntidadeCard[];
  saldoDisponivel: number;
}) {
  const [busca, setBusca] = useState("");
  const [modalidade, setModalidade] = useState<{ entidade: EntidadeCard; tipo: "saldo" | "aplicacao" } | null>(
    null
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return entidades;
    return entidades.filter(
      (e) => e.nome.toLowerCase().includes(termo) || e.tipo.toLowerCase().includes(termo)
    );
  }, [entidades, busca]);

  return (
    <div className="mt-6">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        type="text"
        placeholder="Buscar entidade por nome ou tipo..."
        className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
      />

      {filtradas.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhuma entidade ativa encontrada.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtradas.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f2d675] to-[#93731f] text-lg font-bold text-black">
                  {e.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    {e.nome}
                    <span title="Entidade verificada"><IconVerified width={14} height={14} /></span>
                  </p>
                  <p className="text-xs text-muted">
                    {e.tipo}
                    {(e.cidade || e.estado) && ` · ${[e.cidade, e.estado].filter(Boolean).join("/")}`}
                  </p>
                  <p className="font-mono text-xs text-muted">{cnpjParcial(e.cnpj)}</p>
                </div>
              </div>

              {e.descricao && <p className="mt-3 text-sm text-muted">{e.descricao}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!e.podeReceberDoacao}
                  onClick={() => setModalidade({ entidade: e, tipo: "saldo" })}
                  className="flex-1 rounded-xl bg-gold/15 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Doar com meu saldo
                </button>
                <button
                  type="button"
                  disabled={!e.podeReceberAplicacao}
                  onClick={() => setModalidade({ entidade: e, tipo: "aplicacao" })}
                  className="flex-1 rounded-xl border border-border/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Nova aplicação p/ entidade
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalidade?.tipo === "saldo" && (
        <DoarComSaldoModal
          entidade={modalidade.entidade}
          saldoDisponivel={saldoDisponivel}
          onClose={() => setModalidade(null)}
        />
      )}
      {modalidade?.tipo === "aplicacao" && (
        <NovaAplicacaoEntidadeModal entidade={modalidade.entidade} onClose={() => setModalidade(null)} />
      )}
    </div>
  );
}

function DoarComSaldoModal({
  entidade,
  saldoDisponivel,
  onClose,
}: {
  entidade: EntidadeCard;
  saldoDisponivel: number;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(doarComSaldo, undefined);
  const [valorTexto, setValorTexto] = useState("");
  const [anonima, setAnonima] = useState(false);
  const [etapa, setEtapa] = useState<"valor" | "confirmar">("valor");
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 2600);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const valor = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;
  const excedeSaldo = valor > saldoDisponivel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-foreground">Doar com meu saldo</h3>
        <p className="mt-1 text-sm text-muted">Pra {entidade.nome}</p>

        <p className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
          Saldo disponível pra doar: <span className="font-semibold text-emerald-300">{formatMoeda(saldoDisponivel)}</span>
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : etapa === "valor" ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Valor (R$)</span>
              <MoneyInput
                value={valorTexto}
                onValueChange={setValorTexto}
                placeholder="0,00"
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
              {excedeSaldo && (
                <span className="mt-1 block text-xs text-red-400">Esse valor passa do seu saldo disponível.</span>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/90">
              <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="accent-gold" />
              Doar anonimamente (a entidade não vê seu nome)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!valor || excedeSaldo}
                onClick={() => setEtapa("confirmar")}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="entidadeId" value={entidade.id} />
            <input type="hidden" name="valor" value={valorTexto} />
            <input type="hidden" name="anonima" value={anonima ? "true" : "false"} />

            <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Entidade</span><span className="text-foreground">{entidade.nome}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Valor</span><span className="font-semibold text-gold-light">{formatMoeda(valor)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Origem</span><span className="text-foreground">Saldo disponível</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Anônima</span><span className="text-foreground">{anonima ? "Sim" : "Não"}</span></div>
            </div>
            <p className="text-xs text-amber-300/90">
              Depois de confirmada, essa doação não pode ser cancelada automaticamente.
            </p>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setEtapa("valor")} className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground">
                Voltar
              </button>
              <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50">
                {pending ? "Confirmando..." : "CONFIRMAR DOAÇÃO"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function NovaAplicacaoEntidadeModal({ entidade, onClose }: { entidade: EntidadeCard; onClose: () => void }) {
  const [state, action, pending] = useActionState(criarDoacaoNovaAplicacao, undefined);
  const [valorTexto, setValorTexto] = useState("");
  const [anonima, setAnonima] = useState(false);
  const [etapa, setEtapa] = useState<"valor" | "pagamento">("valor");
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 2600);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function copiarChavePix() {
    navigator.clipboard.writeText(PIX_CHAVE).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const valor = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-foreground">Nova aplicação para a entidade</h3>
        <p className="mt-1 text-sm text-muted">
          Pra {entidade.nome}. O valor entra direto na conta da entidade — não fica disponível na sua carteira.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : etapa === "valor" ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Valor (R$)</span>
              <MoneyInput
                value={valorTexto}
                onValueChange={setValorTexto}
                placeholder="0,00"
                autoFocus
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/90">
              <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} className="accent-gold" />
              Doar anonimamente (a entidade não vê seu nome)
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!valor}
                onClick={() => setEtapa("pagamento")}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl border border-gold/30 bg-surface-2 p-4">
              <p className="text-xs text-muted">Valor a pagar</p>
              <p className="text-lg font-bold text-gold-light">{formatMoeda(valor)}</p>
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs text-muted">Chave Pix ({PIX_TIPO_CHAVE})</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-sm text-foreground">{PIX_CHAVE}</code>
                  <button type="button" onClick={copiarChavePix} className="shrink-0 rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold/30">
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">Beneficiário: {PIX_BENEFICIARIO}</p>
              </div>
            </div>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="entidadeId" value={entidade.id} />
              <input type="hidden" name="valor" value={valorTexto} />
              <input type="hidden" name="anonima" value={anonima ? "true" : "false"} />
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">Comprovante do pagamento</span>
                <input
                  name="comprovante"
                  type="file"
                  accept=".pdf,image/*"
                  required
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none file:mr-3 file:rounded-md file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gold-light"
                />
              </label>

              {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={() => setEtapa("valor")} className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground">
                  Voltar
                </button>
                <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50">
                  {pending ? "Enviando..." : "Enviar comprovante"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
