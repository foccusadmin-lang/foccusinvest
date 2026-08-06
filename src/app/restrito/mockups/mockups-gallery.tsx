"use client";

import { useMemo, useRef, useState } from "react";

export type MockupItem = {
  key: string;
  label: string;
  grupo: string;
  path: string;
};

const LARGURA_CAPTURA = 1280;
const ALTURA_MINIMA = 800;
const ALTURA_MAXIMA = 4200;
const ESCALA_MINIATURA = 0.22;

function nomeArquivo(label: string): string {
  return (
    "foccus-invest-" +
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    ".png"
  );
}

async function capturarIframe(iframe: HTMLIFrameElement): Promise<Blob> {
  const doc = iframe.contentDocument;
  if (!doc) throw new Error("Não consegui acessar o conteúdo dessa tela ainda — espere carregar e tente de novo.");

  const alturaReal = Math.min(
    ALTURA_MAXIMA,
    Math.max(ALTURA_MINIMA, doc.documentElement.scrollHeight)
  );

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(doc.documentElement, {
    backgroundColor: "#030303",
    width: LARGURA_CAPTURA,
    windowWidth: LARGURA_CAPTURA,
    height: alturaReal,
    windowHeight: alturaReal,
    scale: 1,
    useCORS: true,
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não consegui gerar a imagem dessa tela."));
    }, "image/png");
  });
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function MockupsGallery({ itens }: { itens: MockupItem[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [processando, setProcessando] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const iframesRef = useRef<Map<string, HTMLIFrameElement>>(new Map());

  const grupos = useMemo(() => {
    const mapa = new Map<string, MockupItem[]>();
    for (const item of itens) {
      const lista = mapa.get(item.grupo) ?? [];
      lista.push(item);
      mapa.set(item.grupo, lista);
    }
    return Array.from(mapa.entries());
  }, [itens]);

  function toggle(key: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(key)) novo.delete(key);
      else novo.add(key);
      return novo;
    });
  }

  function selecionarTodas() {
    setSelecionados(new Set(itens.map((i) => i.key)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function baixarUma(item: MockupItem) {
    const iframe = iframesRef.current.get(item.key);
    if (!iframe) return;
    setErro(null);
    setProcessando(item.key);
    try {
      const blob = await capturarIframe(iframe);
      baixarBlob(blob, nomeArquivo(item.label));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(null);
    }
  }

  async function compartilharUma(item: MockupItem) {
    const iframe = iframesRef.current.get(item.key);
    if (!iframe) return;
    setErro(null);
    setProcessando(item.key);
    try {
      const blob = await capturarIframe(iframe);
      const nome = nomeArquivo(item.label);
      const arquivo = new File([blob], nome, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: item.label });
      } else {
        baixarBlob(blob, nome);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErro((e as Error).message);
    } finally {
      setProcessando(null);
    }
  }

  async function baixarVariasComoZip(chaves: string[]) {
    if (chaves.length === 0) return;
    setErro(null);
    setProcessando("zip");
    setProgresso({ atual: 0, total: chaves.length });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      let i = 0;
      for (const chave of chaves) {
        const item = itens.find((it) => it.key === chave);
        const iframe = iframesRef.current.get(chave);
        if (!item || !iframe) continue;
        const blob = await capturarIframe(iframe);
        zip.file(nomeArquivo(item.label), blob);
        i += 1;
        setProgresso({ atual: i, total: chaves.length });
      }
      const conteudo = await zip.generateAsync({ type: "blob" });
      baixarBlob(conteudo, "foccus-invest-mockups.zip");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setProcessando(null);
      setProgresso(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-4">
        <span className="text-sm text-muted">
          {selecionados.size} de {itens.length} selecionada(s)
        </span>
        <button
          onClick={selecionarTodas}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/15"
        >
          Selecionar todas
        </button>
        <button
          onClick={limparSelecao}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-white/15"
        >
          Limpar seleção
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => baixarVariasComoZip(Array.from(selecionados))}
            disabled={selecionados.size === 0 || processando !== null}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Baixar selecionadas (.zip)
          </button>
          <button
            onClick={() => baixarVariasComoZip(itens.map((i) => i.key))}
            disabled={processando !== null}
            className="rounded-lg bg-gold/90 px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Baixar todas (.zip)
          </button>
        </div>
      </div>

      {processando === "zip" && progresso && (
        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
          Capturando telas... {progresso.atual} de {progresso.total}
        </div>
      )}
      {erro && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {erro}
        </div>
      )}

      {grupos.map(([grupo, lista]) => (
        <div key={grupo} className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{grupo}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((item) => (
              <div key={item.key} className="rounded-2xl border border-border bg-surface p-3">
                <label className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={selecionados.has(item.key)}
                    onChange={() => toggle(item.key)}
                  />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </label>

                <div
                  className="overflow-hidden rounded-lg border border-border/60 bg-black"
                  style={{ height: LARGURA_CAPTURA * ESCALA_MINIATURA * 0.62 }}
                >
                  <iframe
                    ref={(el) => {
                      if (el) iframesRef.current.set(item.key, el);
                    }}
                    src={item.path}
                    title={item.label}
                    style={{
                      width: LARGURA_CAPTURA,
                      height: ALTURA_MINIMA,
                      transform: `scale(${ESCALA_MINIATURA})`,
                      transformOrigin: "top left",
                      border: "none",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => baixarUma(item)}
                    disabled={processando !== null}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {processando === item.key ? "Gerando..." : "Baixar"}
                  </button>
                  <button
                    onClick={() => compartilharUma(item)}
                    disabled={processando !== null}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Compartilhar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
