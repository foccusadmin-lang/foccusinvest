"use client";

import { useMemo, useState } from "react";
import type { PerfilUsuario, StatusCadastro } from "@prisma/client";
import { formatData, formatMoeda } from "@/lib/format";
import { StatusActions } from "./status-actions";
import { AjusteSaldoButton } from "./ajuste-modal";
import { AjusteCarenciaButton } from "./carencia-modal";
import { LiberarEmergenciaButton, type AplicacaoElegivel, type LiberacaoAtivaResumo } from "./emergencia-modal";
import { AtualizarDadosButton } from "./atualizar-dados-modal";
import { ExcluirUsuarioButton } from "./excluir-usuario-button";
import { DestaqueInvestidor, type ResumoInvestidor } from "@/components/admin/destaque-investidor";

const statusStyle: Record<string, string> = {
  INCOMPLETO: "bg-white/10 text-muted",
  PENDENTE: "bg-sky-500/15 text-sky-300",
  APROVADO: "bg-emerald-500/15 text-emerald-300",
  SUSPENSO: "bg-red-500/15 text-red-300",
  REJEITADO: "bg-red-500/15 text-red-300",
};

export type LinhaUsuario = {
  id: string;
  nome: string;
  email: string;
  codigo: string;
  documento: string;
  telefone: string;
  endereco: string;
  capital: number;
  capitalDisponivel: number;
  capitalCarencia: number;
  rendimento: number;
  bonus: number;
  incentivoLideranca: number;
  statusCadastro: StatusCadastro;
  perfil: PerfilUsuario;
  createdAt: Date;
  aplicacoesElegiveisEmergencia: AplicacaoElegivel[];
  liberacaoEmergenciaAtiva: LiberacaoAtivaResumo | null;
  tipoPessoa: "FISICA" | "JURIDICA" | null;
  cpf: string;
  dataNascimento: string;
  cnpj: string;
  representanteLegal: string;
  cpfRepresentante: string;
};

export function UsuariosTable({ usuarios }: { usuarios: LinhaUsuario[] }) {
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();

  const filtrados = useMemo(() => {
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.codigo.toLowerCase().includes(termo)
    );
  }, [usuarios, termo]);

  const investidoresDestacados: ResumoInvestidor[] = useMemo(() => {
    if (!termo) return [];
    return filtrados.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      documento: u.documento,
      capital: u.capital,
      carencia: u.capitalCarencia,
      disponivel: u.capitalDisponivel,
      rendimentoDisponivel: u.rendimento,
      bonus: u.bonus,
      total: u.capital + u.rendimento + u.bonus + u.incentivoLideranca,
    }));
  }, [filtrados, termo]);

  return (
    <>
      <div className="mt-4">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome completo, e-mail ou código..."
          className="w-full max-w-md rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </div>

      {investidoresDestacados.length > 0 && (
        <div className="mt-4 space-y-4">
          {investidoresDestacados.map((inv) => (
            <DestaqueInvestidor key={inv.id} investidor={inv} />
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Saldos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtrados.map((u) => (
              <tr key={u.id} className="bg-surface">
                <td className="px-4 py-3 font-medium text-foreground">{u.nome}</td>
                <td className="px-4 py-3 font-mono text-xs text-gold-light">{u.codigo || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{u.documento}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 text-xs">
                  <p>
                    <span className="text-muted">Capital: </span>
                    <span className="font-semibold text-emerald-300">
                      {formatMoeda(u.capital)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted">PLR: </span>
                    <span className="font-semibold text-gold-light">
                      {formatMoeda(u.rendimento)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted">Bônus: </span>
                    <span className="font-semibold text-fuchsia-300">
                      {formatMoeda(u.bonus)}
                    </span>
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[u.statusCadastro]}`}
                  >
                    {u.statusCadastro}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{formatData(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <AjusteSaldoButton
                      usuario={{
                        id: u.id,
                        nome: u.nome,
                        email: u.email,
                        capital: u.capital,
                        rendimento: u.rendimento,
                        bonus: u.bonus,
                        incentivoLideranca: u.incentivoLideranca,
                        ehLider: u.perfil === "LIDER",
                      }}
                    />
                    <AjusteCarenciaButton
                      usuario={{
                        id: u.id,
                        nome: u.nome,
                        email: u.email,
                        capitalDisponivel: u.capitalDisponivel,
                        capitalCarencia: u.capitalCarencia,
                      }}
                    />
                    <AtualizarDadosButton
                      usuario={{
                        id: u.id,
                        nome: u.nome,
                        email: u.email,
                        telefone: u.telefone,
                        endereco: u.endereco,
                        tipoPessoa: u.tipoPessoa,
                        cpf: u.cpf,
                        dataNascimento: u.dataNascimento,
                        cnpj: u.cnpj,
                        representanteLegal: u.representanteLegal,
                        cpfRepresentante: u.cpfRepresentante,
                      }}
                    />
                    <StatusActions
                      usuarioId={u.id}
                      statusCadastro={u.statusCadastro}
                      perfil={u.perfil}
                    />
                    <LiberarEmergenciaButton
                      usuario={{
                        id: u.id,
                        nome: u.nome,
                        email: u.email,
                        capitalDisponivel: u.capitalDisponivel,
                        capitalCarencia: u.capitalCarencia,
                        rendimento: u.rendimento,
                        aplicacoes: u.aplicacoesElegiveisEmergencia,
                        liberacaoAtiva: u.liberacaoEmergenciaAtiva,
                      }}
                    />
                    <ExcluirUsuarioButton userId={u.id} nome={u.nome} />
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
