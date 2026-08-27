import { sugerirBairroAction } from "@/lib/marketplace/sugestoes-actions";

/** "Não encontrou seu bairro?" — disclosure nativo (sem JS) que revela um formulário curto pra
 *  sugerir um bairro novo (spec "Parte 2", seção 11). `voltarPara` é o caminho + querystring
 *  atual, pra voltar exatamente onde a pessoa estava com a mensagem de confirmação. */
export function SugerirBairroForm({ voltarPara }: { voltarPara: string }) {
  return (
    <details className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted">
      <summary className="cursor-pointer text-foreground">Não encontrou seu bairro?</summary>
      <form action={sugerirBairroAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="voltarPara" value={voltarPara} />
        <input
          type="text"
          name="nome"
          required
          placeholder="Qual é o nome do seu bairro?"
          className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="self-start rounded-lg border border-sky-400/40 px-4 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-400/70"
        >
          Enviar
        </button>
      </form>
    </details>
  );
}

/** Banner "Obrigado! Esse bairro foi enviado para análise." — mostrado quando a página é
 *  recarregada com `?sugestaoEnviada=1` depois do envio acima. */
export function SugestaoEnviadaBanner() {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
      Obrigado! Esse bairro foi enviado para análise. Assim que for aprovado, estará disponível
      para seleção.
    </div>
  );
}
