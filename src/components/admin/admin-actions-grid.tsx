import Link from "next/link";
import type { ReactNode } from "react";

type Botao = {
  label: string;
  href?: string;
  cor: string;
  icone: ReactNode;
  emBreve?: boolean;
};

function IconGeneric({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const BOTOES: Botao[] = [
  {
    label: "Usuários",
    href: "/restrito/usuarios",
    cor: "bg-sky-600 hover:bg-sky-500",
    icone: <IconGeneric path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
  {
    label: "Aportes via Pix",
    href: "/restrito/aportes",
    cor: "bg-green-600 hover:bg-green-500",
    icone: <IconGeneric path="M12 19V5M5 12l7-7 7 7" />,
  },
  {
    label: "Saques",
    href: "/restrito/saques",
    cor: "bg-violet-600 hover:bg-violet-500",
    icone: <IconGeneric path="M12 5v14M5 12l7 7 7-7" />,
  },
  {
    label: "Distribuições",
    href: "/restrito/distribuicoes",
    cor: "bg-amber-500 hover:bg-amber-400",
    icone: <IconGeneric path="M3 3v18h18M7 16l4-6 4 3 4-8" />,
  },
  {
    label: "Histórico Completo",
    href: "/restrito/historico",
    cor: "bg-teal-600 hover:bg-teal-500",
    icone: <IconGeneric path="M12 8v4l3 3M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />,
  },
  {
    label: "Migração de Saldo",
    href: "/restrito/migracao",
    cor: "bg-cyan-600 hover:bg-cyan-500",
    icone: <IconGeneric path="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.64M21 3v6h-6" />,
  },
  {
    label: "Criar por e-mail",
    href: "/restrito/criar-usuario",
    cor: "bg-orange-600 hover:bg-orange-500",
    icone: <IconGeneric path="M4 4h16v16H4zM22 6l-10 7L2 6" />,
  },
  {
    label: "Gestão de Indicação",
    href: "/restrito/indicacoes",
    cor: "bg-fuchsia-600 hover:bg-fuchsia-500",
    icone: <IconGeneric path="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" />,
  },
  {
    label: "Gestão de Códigos",
    href: "/restrito/indicacoes",
    cor: "bg-indigo-600 hover:bg-indigo-500",
    icone: <IconGeneric path="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />,
  },
  {
    label: "Gráficos e Análises",
    href: "/restrito/analises",
    cor: "bg-blue-600 hover:bg-blue-500",
    icone: <IconGeneric path="M3 3v18h18M18 17V9M13 17V5M8 17v-4" />,
  },
  {
    label: "Configurações do Sistema",
    href: "/restrito/configuracoes",
    cor: "bg-rose-700 hover:bg-rose-600",
    icone: <IconGeneric path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />,
  },
  { label: "Ativar Empresas", cor: "bg-yellow-600", icone: <IconGeneric path="M20 6 9 17l-5-5" />, emBreve: true },
  { label: "Gestão de Contratos", cor: "bg-purple-600", icone: <IconGeneric path="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h6" />, emBreve: true },
];

export function AdminActionsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {BOTOES.map((b) => {
        const conteudo = (
          <span className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-white">
            {b.icone}
            {b.label}
            {b.emBreve && <span className="text-[10px] font-normal opacity-75">(em breve)</span>}
          </span>
        );

        if (b.emBreve || !b.href) {
          return (
            <div
              key={b.label}
              className={`flex min-h-[52px] cursor-not-allowed items-center justify-center rounded-xl p-3 opacity-50 ${b.cor}`}
            >
              {conteudo}
            </div>
          );
        }

        return (
          <Link
            key={b.label}
            href={b.href}
            className={`flex min-h-[52px] items-center justify-center rounded-xl p-3 shadow-lg transition ${b.cor}`}
          >
            {conteudo}
          </Link>
        );
      })}
    </div>
  );
}
