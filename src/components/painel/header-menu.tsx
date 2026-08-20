"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { IconBell, IconLogout, IconSettings, IconClock, IconHeadset, IconVideo } from "@/components/icons";
import { IndicacaoHeaderButton } from "./indicacao-header-button";
import { TELEFONE_ATENDIMENTO_ADMIN, mensagemSuportePadrao } from "@/lib/config";

export function HeaderMenu({
  primeiroNome,
  foto,
  codigoIndicacao,
}: {
  primeiroNome: string;
  foto?: string | null;
  codigoIndicacao?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="Notificações"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconBell width={16} height={16} />
      </button>
      <IndicacaoHeaderButton codigoIndicacao={codigoIndicacao ?? null} />
      <a
        href={`https://wa.me/${TELEFONE_ATENDIMENTO_ADMIN}?text=${encodeURIComponent(mensagemSuportePadrao(primeiroNome))}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com suporte"
        title="Falar com suporte"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconHeadset width={16} height={16} />
      </a>
      <Link
        href="/painel/tutorial"
        aria-label="Tutorial"
        title="Tutorial"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconVideo width={16} height={16} />
      </Link>
      <Link
        href="/painel/historico"
        aria-label="Histórico"
        data-tour="historico"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconClock width={16} height={16} />
      </Link>
      <Link
        href="/painel/configuracoes"
        aria-label="Configurações"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-gold-light"
      >
        <IconSettings width={16} height={16} />
      </Link>
      {foto ? (
        <Image
          src={foto}
          alt={primeiroNome}
          width={36}
          height={36}
          className="rounded-full ring-2 ring-gold/40"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f2d675] to-[#93731f] text-sm font-bold text-black">
          {primeiroNome.charAt(0).toUpperCase()}
        </div>
      )}
      <button
        aria-label="Sair"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition hover:text-red-300"
      >
        <IconLogout width={16} height={16} />
      </button>
    </div>
  );
}
