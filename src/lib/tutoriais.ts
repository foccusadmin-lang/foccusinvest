export type Tutorial = {
  titulo: string;
  url: string;
};

/** Vídeos explicativos exibidos no menu Tutorial do painel — ajudam investidores ativos a
 *  entender a plataforma e servem de material pronto pra compartilhar com novos usuários. */
export const TUTORIAIS: Tutorial[] = [
  {
    titulo: "O que está por trás do Projeto Foccus",
    url: "https://www.youtube.com/watch?v=-rUXRPeFH-c&list=PLGkCY-jhKN0s&index=2",
  },
  {
    titulo: "Transição de sistema IRT/FOCCUS",
    url: "https://www.youtube.com/watch?v=q4lKhbsUIJ8&list=PLGkCY-jhKN0s&index=3",
  },
  {
    titulo: "Projeto Foccus — Novos Usuários",
    url: "https://youtube.com/shorts/F8t3WwtWBaE?feature=share",
  },
  {
    titulo: "Como instalar o app Foccus",
    url: "https://youtube.com/shorts/sDFvt37Wuy4",
  },
  {
    titulo: "Nova Aplicação — Passo a Passo",
    url: "https://www.youtube.com/watch?v=O0OcM3EfBeY&list=PLGkCY-jhKN0s",
  },
];

/** Extrai o ID do vídeo tanto de links normais (watch?v=) quanto de Shorts (shorts/), pra montar
 *  a miniatura e o link de incorporação sem precisar guardar o ID separado de cada vídeo. */
export function extrairIdYoutube(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] ?? null;
    }
    const v = u.searchParams.get("v");
    if (v) return v;
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    return null;
  } catch {
    return null;
  }
}
