"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  buscarPrestadoresAction,
  type ResultadoBusca,
} from "@/app/marketplace/cliente/buscar/actions";
import { SugerirBairroForm } from "@/components/marketplace/sugerir-bairro";

type Opcao = { id: string; nome: string };

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Busca mecânica: digita o serviço, digita o bairro, e assim que os dois estiverem escolhidos
 * (clicando numa sugestão da lista) os prestadores aparecem automaticamente — sem botão
 * "Pesquisar" e sem nenhuma chamada externa, só o banco (spec "Parte 2", seções 8/9/18).
 */
export function BuscaPrestadores({ servicos, regioes }: { servicos: Opcao[]; regioes: Opcao[] }) {
  const [buscaServico, setBuscaServico] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState<Opcao | null>(null);
  const [abrirServico, setAbrirServico] = useState(false);

  const [buscaRegiao, setBuscaRegiao] = useState("");
  const [regiaoSelecionada, setRegiaoSelecionada] = useState<Opcao | null>(null);
  const [abrirRegiao, setAbrirRegiao] = useState(false);

  const [resultados, setResultados] = useState<ResultadoBusca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sugestoesServico = useMemo(() => {
    const termo = normalizar(buscaServico.trim());
    const lista = termo ? servicos.filter((s) => normalizar(s.nome).includes(termo)) : servicos;
    return lista.slice(0, 8);
  }, [buscaServico, servicos]);

  const sugestoesRegiao = useMemo(() => {
    const termo = normalizar(buscaRegiao.trim());
    const lista = termo ? regioes.filter((r) => normalizar(r.nome).includes(termo)) : regioes;
    return lista.slice(0, 8);
  }, [buscaRegiao, regioes]);

  useEffect(() => {
    if (!servicoSelecionado || !regiaoSelecionada) return;
    startTransition(async () => {
      const resposta = await buscarPrestadoresAction(servicoSelecionado.id, regiaoSelecionada.id);
      if (resposta.ok) {
        setResultados(resposta.resultados);
        setErro(null);
      } else {
        setErro(resposta.erro);
        setResultados(null);
      }
    });
  }, [servicoSelecionado, regiaoSelecionada]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5">
        <div className="relative">
          <label className="text-xs uppercase tracking-wide text-muted">Serviço</label>
          <input
            type="text"
            value={buscaServico}
            onChange={(e) => {
              setBuscaServico(e.target.value);
              setServicoSelecionado(null);
              setAbrirServico(true);
            }}
            onFocus={() => setAbrirServico(true)}
            onBlur={() => setTimeout(() => setAbrirServico(false), 100)}
            placeholder="🔎 Digite um serviço — ex.: mecânico"
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted"
          />
          {abrirServico && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-lg">
              {sugestoesServico.length === 0 ? (
                <p className="p-3 text-sm text-muted">Nenhum serviço encontrado.</p>
              ) : (
                sugestoesServico.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => {
                      setServicoSelecionado(s);
                      setBuscaServico(s.nome);
                      setAbrirServico(false);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-surface"
                  >
                    {s.nome}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="text-xs uppercase tracking-wide text-muted">Onde você precisa?</label>
          <input
            type="text"
            value={buscaRegiao}
            onChange={(e) => {
              setBuscaRegiao(e.target.value);
              setRegiaoSelecionada(null);
              setAbrirRegiao(true);
            }}
            onFocus={() => setAbrirRegiao(true)}
            onBlur={() => setTimeout(() => setAbrirRegiao(false), 100)}
            placeholder="📍 Digite seu bairro — ex.: Jardim Silveira"
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted"
          />
          {abrirRegiao && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-lg">
              {sugestoesRegiao.length === 0 ? (
                <p className="p-3 text-sm text-muted">Nenhum bairro encontrado.</p>
              ) : (
                sugestoesRegiao.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={() => {
                      setRegiaoSelecionada(r);
                      setBuscaRegiao(r.nome);
                      setAbrirRegiao(false);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-surface"
                  >
                    {r.nome}
                  </button>
                ))
              )}
            </div>
          )}
          <SugerirBairroForm voltarPara="/marketplace/cliente/buscar" />
        </div>

        {(!servicoSelecionado || !regiaoSelecionada) && (
          <p className="text-xs text-muted">
            Escolha um serviço e um bairro da lista — os prestadores aparecem na hora, sem
            precisar clicar em nada.
          </p>
        )}
      </div>

      {isPending && <p className="text-sm text-muted">Buscando prestadores...</p>}

      {!isPending && erro && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {erro}
        </div>
      )}

      {!isPending && resultados && servicoSelecionado && regiaoSelecionada && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {servicoSelecionado.nome}s encontrados em {regiaoSelecionada.nome}
          </h2>

          {resultados.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Nenhum prestador de {servicoSelecionado.nome.toLowerCase()} atende{" "}
              {regiaoSelecionada.nome} ainda.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {resultados.map((p) => (
                <div key={p.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {p.nomeProfissional} {p.verificado && <span className="text-sky-300">✓</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {p.notaMedia ? `⭐ ${p.notaMedia.toFixed(1)}` : "Ainda sem avaliações"}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    📍 {p.bairroPrincipal ?? "Bairro não informado"} · atende{" "}
                    {p.totalRegioesAtendidas} bairro{p.totalRegioesAtendidas === 1 ? "" : "s"}
                  </p>
                  {p.precoDe && (
                    <p className="mt-1 text-sm text-muted">A partir de R$ {p.precoDe.toFixed(0)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            Perfil detalhado e solicitação direta pelo app chegam na próxima etapa — por
            enquanto, esses são os prestadores que já atendem esse bairro.
          </p>
        </div>
      )}
    </div>
  );
}
