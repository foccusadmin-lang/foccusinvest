import { UsuariosTable, type LinhaUsuario } from "@/app/restrito/usuarios/usuarios-table";
import { AdminPreviewShell } from "../_admin-shell";

const agora = Date.now();
const dia = 24 * 60 * 60 * 1000;

const usuarios: LinhaUsuario[] = [
  {
    id: "u1",
    nome: "Waldir Rodrigues Custódio",
    email: "waldir.custodio@exemplo.com",
    codigo: "7K2QX-WALDIR",
    documento: "529.982.***-25",
    telefone: "(11) 97720-2948",
    endereco: "Rua Juvenal Faustino de Melo, 300 - Jandira - SP",
    capital: 12500,
    capitalDisponivel: 8500,
    capitalCarencia: 4000,
    rendimento: 640.32,
    bonus: 125,
    statusCadastro: "APROVADO",
    perfil: "USUARIO",
    createdAt: new Date(agora - 210 * dia),
    aplicacoesElegiveisEmergencia: [],
    liberacaoEmergenciaAtiva: null,
    tipoPessoa: "FISICA",
    cpf: "52998224725",
    dataNascimento: "1985-04-12",
    cnpj: "",
    representanteLegal: "",
    cpfRepresentante: "",
  },
  {
    id: "u2",
    nome: "Marina Souza Almeida",
    email: "marina.almeida@exemplo.com",
    codigo: "9B7TZ-MARINA",
    documento: "398.***.***-11",
    telefone: "(21) 98888-1234",
    endereco: "Av. Atlântica, 1200 - Rio de Janeiro - RJ",
    capital: 34200,
    capitalDisponivel: 34200,
    capitalCarencia: 0,
    rendimento: 1820.5,
    bonus: 0,
    statusCadastro: "PENDENTE",
    perfil: "USUARIO",
    createdAt: new Date(agora - 30 * dia),
    aplicacoesElegiveisEmergencia: [],
    liberacaoEmergenciaAtiva: null,
    tipoPessoa: "FISICA",
    cpf: "39812345611",
    dataNascimento: "1990-09-02",
    cnpj: "",
    representanteLegal: "",
    cpfRepresentante: "",
  },
  {
    id: "u3",
    nome: "Ministério Apostólico Refrigério",
    email: "contato@refrigerio.exemplo.com",
    codigo: "3F8LK-REFRIG",
    documento: "17.847.***/****-54",
    telefone: "(11) 4002-0000",
    endereco: "Jandira - SP",
    capital: 4380.99,
    capitalDisponivel: 4380.99,
    capitalCarencia: 0,
    rendimento: 0,
    bonus: 397.5,
    statusCadastro: "APROVADO",
    perfil: "ENTIDADE",
    createdAt: new Date(agora - 400 * dia),
    aplicacoesElegiveisEmergencia: [],
    liberacaoEmergenciaAtiva: null,
    tipoPessoa: "JURIDICA",
    cpf: "",
    dataNascimento: "",
    cnpj: "17847125000154",
    representanteLegal: "Waldir Rodrigues Custódio da Silva",
    cpfRepresentante: "31973638843",
  },
];

export default function PreviewAdminUsuariosPage() {
  return (
    <AdminPreviewShell>
      <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted">{usuarios.length} conta(s) cadastrada(s).</p>
      <UsuariosTable usuarios={usuarios} />
    </AdminPreviewShell>
  );
}
