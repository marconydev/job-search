import { ArrowLeft, ServerOff, UserRound } from "lucide-react"

import Link from "next/link"

import { EditorPerfil } from "@/components/perfil/editor-perfil"

import { obterPerfilProfissional } from "@/lib/api-servidor"

import type { PerfilProfissionalComMetadados } from "@/types/perfil"

export const dynamic = "force-dynamic"

type ResultadoCarregamento = {
  dados: PerfilProfissionalComMetadados | null

  erro: unknown
}

async function carregarPerfil(): Promise<ResultadoCarregamento> {
  try {
    const dados = await obterPerfilProfissional()

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

export default async function PaginaPerfil() {
  const resultado = await carregarPerfil()

  if (!resultado.dados) {
    console.error("Erro ao carregar perfil:", resultado.erro)

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ServerOff size={24} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            Não consegui carregar seu perfil
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Confirme se o backend está funcionando e se a migration do perfil foi executada.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={16} />
              Voltar para vagas
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                <UserRound size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Meu Perfil
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Informações utilizadas para encontrar e classificar oportunidades.
                </p>
              </div>
            </div>
          </div>
        </div>

        <EditorPerfil dadosIniciais={resultado.dados} />
      </div>
    </main>
  )
}
