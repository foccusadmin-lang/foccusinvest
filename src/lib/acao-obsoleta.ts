/** Depois de um deploy, uma aba aberta ainda roda o build antigo e pode chamar uma Server Action
 *  cujo ID não existe mais ("Failed to find Server Action" / UnrecognizedActionError). Nada foi
 *  executado nesse caso — recarregar a página pega o build novo e resolve. */
export function ehErroDeAcaoObsoleta(e: unknown): boolean {
  const nome = typeof e === "object" && e !== null ? (e as { name?: string }).name : undefined;
  const mensagem = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  return (
    nome === "UnrecognizedActionError" ||
    /Failed to find Server Action|was not found on the server/i.test(mensagem)
  );
}

const CHAVE = "foccus:recarga-acao-obsoleta";
const INTERVALO_MIN_MS = 60_000;

/** Recarrega a página, no máximo uma vez por minuto (evita laço infinito se o erro persistir por
 *  outro motivo). Devolve true se disparou a recarga. */
export function recarregarSeNecessario(): boolean {
  try {
    const ultima = Number(window.sessionStorage.getItem(CHAVE) ?? 0);
    if (Date.now() - ultima < INTERVALO_MIN_MS) return false;
    window.sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // sessionStorage indisponível (modo privado restrito): ainda recarrega, sem a trava.
  }
  window.location.reload();
  return true;
}
