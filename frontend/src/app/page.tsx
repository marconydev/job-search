import { BriefcaseBusiness, ServerOff } from "lucide-react"

import { PainelVagas } from "@/components/painel/painel-vagas"

import { obterDadosPainel } from "@/lib/api-servidor"

import type { DadosPainel } from "@/types/painel"

/**
 * Eu mantenho esta página dinâmica porque os dados precisam refletir
 * imediatamente as alterações feitas no PostgreSQL.
 */
export const dynamic = "force-dynamic"

type ResultadoCarregamento = {
  dados: DadosPainel | null

  erro: unknown
}

/**
 * Eu separo a leitura dos dados da construção do JSX.
 *
 * Dessa forma o try/catch trata somente erros da API. Se ocorrer um erro
 * durante a renderização dos componentes, ele continua sendo tratado
 * pelo mecanismo próprio do React.
 */
async function carregarPainel(): Promise<ResultadoCarregamento> {
  try {
    const dados = await obterDadosPainel()

    return {
      dados,
      erro: null
    }
  } catch (erro) {
    return {
      dados: null,

      erro
    }
  }
}

export default async function PaginaInicial() {
  const resultado = await carregarPainel()

  if (resultado.dados) {
    return <PainelVagas dadosIniciais={resultado.dados} />
  }

  console.error("Erro ao carregar a página inicial:", resultado.erro)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
          <ServerOff size={24} />
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          Não consegui acessar o backend
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Confirme se a API do Job Search está rodando na porta configurada no arquivo .env.local.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <BriefcaseBusiness size={14} />
          Job Search
        </div>
      </div>
    </main>
  )
}
