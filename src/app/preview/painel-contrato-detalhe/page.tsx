import Link from "next/link";
import { ContratoDocumento } from "@/components/contrato/contrato-documento";

export default function PreviewPainelContratoDetalhePage() {
  return (
    <div className="min-h-screen bg-background py-6">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/painel/contratos" className="text-sm text-gold-light hover:underline">
            ← Voltar
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl">
          <ContratoDocumento
            nome="Waldir Rodrigues Custódio da Silva"
            email="waldir.custodio@exemplo.com"
            cpf="52998224725"
            rg="12.345.678-9"
            nacionalidade="Brasileiro"
            estadoCivil="Casado"
            profissao="Empresário"
            telefone="(11) 97720-2948"
            endereco="Rua Juvenal Faustino de Melo, 300 - Jardim Novo Horizonte, Jandira - SP"
            valor={5000}
            valorExtenso="cinco mil reais"
            data={new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)}
          />
        </div>
      </div>
    </div>
  );
}
