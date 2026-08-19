"use client"

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react"

import {
  ArchiveX,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  X
} from "lucide-react"

import Link from "next/link"

import { useRouter } from "next/navigation"

import { CartaoVaga } from "./cartao-vaga"

import { ControleSincronizacao } from "./controle-sincronizacao"

import { DetalheVaga } from "./detalhe-vaga"

import type {
  DadosPainel,
  FiltroModalidade,
  FiltroStatus,
  OrdenacaoVagas,
  StatusVaga,
  VagaPainel
} from "@/types/painel"

type Propriedades = {
  dadosIniciais: DadosPainel
}

const QUANTIDADE_POR_LOTE = 12

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function vagaEhDeHoje(vaga: VagaPainel) {
  const data = new Date(vaga.created_at)

  const hoje = new Date()

  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  )
}

/**
 * Em aberto significa que a oportunidade ainda exige alguma decisão.
 *
 * Uma vaga nova ou já visualizada continua nesta fila.
 * Aplicadas e ignoradas são consideradas concluídas e ficam no histórico.
 */
function statusPertenceAoFiltro(status: StatusVaga, filtro: FiltroStatus) {
  if (filtro === "abertas") {
    return status === "relevant" || status === "viewed"
  }

  return status === filtro
}

/**
 * Eu recalculo os indicadores quando existe uma alteração local de
 * status que ainda não foi incorporada aos dados recebidos do servidor.
 */
function atualizarResumoLocal(
  resumoAtual: DadosPainel["resumo"],

  vagaAnterior: VagaPainel,

  novoStatus: StatusVaga
) {
  if (vagaAnterior.status === novoStatus) {
    return resumoAtual
  }

  const resumo = {
    ...resumoAtual
  }

  function reduzir(status: StatusVaga) {
    switch (status) {
      case "relevant":
        resumo.novas = Math.max(0, resumo.novas - 1)
        break

      case "viewed":
        resumo.vistas = Math.max(0, resumo.vistas - 1)
        break

      case "applied":
        resumo.aplicadas = Math.max(0, resumo.aplicadas - 1)
        break

      case "ignored":
        resumo.ignoradas = Math.max(0, resumo.ignoradas - 1)
        break
    }
  }

  function aumentar(status: StatusVaga) {
    switch (status) {
      case "relevant":
        resumo.novas++
        break

      case "viewed":
        resumo.vistas++
        break

      case "applied":
        resumo.aplicadas++
        break

      case "ignored":
        resumo.ignoradas++
        break
    }
  }

  reduzir(vagaAnterior.status)

  aumentar(novoStatus)

  if (vagaEhDeHoje(vagaAnterior)) {
    if (vagaAnterior.status === "relevant" && novoStatus !== "relevant") {
      resumo.novas_hoje = Math.max(0, resumo.novas_hoje - 1)
    }

    if (vagaAnterior.status !== "relevant" && novoStatus === "relevant") {
      resumo.novas_hoje++
    }
  }

  return resumo
}

export function PainelVagas({ dadosIniciais }: Propriedades) {
  const router = useRouter()

  const [atualizandoPagina, iniciarAtualizacao] = useTransition()

  /**
   * Eu armazeno somente mudanças feitas localmente.
   *
   * Os dados oficiais continuam vindo de dadosIniciais.
   */
  const [statusLocais, setStatusLocais] = useState<Record<number, StatusVaga>>({})

  /**
   * O painel começa selecionando a primeira oportunidade ainda em aberto.
   *
   * Dessa forma uma vaga aplicada ou ignorada anteriormente nunca aparece
   * selecionada por padrão na tela inicial.
   */
  const [vagaSelecionadaId, setVagaSelecionadaId] = useState<number | null>(
    dadosIniciais.vagas.find(vaga => vaga.status === "relevant" || vaga.status === "viewed")?.id ??
    null
  )

  const [busca, setBusca] = useState("")

  const buscaAdiada = useDeferredValue(busca)

  /**
   * A visualização padrão agora é a caixa de oportunidades em aberto.
   */
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("abertas")

  const [filtroModalidade, setFiltroModalidade] = useState<FiltroModalidade>("todas")

  const [filtroFonte, setFiltroFonte] = useState("todas")

  const [pontuacaoMinima, setPontuacaoMinima] = useState(60)

  const [ordenacao, setOrdenacao] = useState<OrdenacaoVagas>("recentes")

  const [idProcessando, setIdProcessando] = useState<number | null>(null)

  const [mensagem, setMensagem] = useState<string | null>(null)

  const [limiteVisivel, setLimiteVisivel] = useState(QUANTIDADE_POR_LOTE)

  /**
   * Eu combino os dados recebidos do servidor com alterações locais
   * de status que ainda não apareceram na próxima resposta do backend.
   */
  const dados = useMemo(() => {
    const vagas = dadosIniciais.vagas.map(vaga => {
      const statusLocal = statusLocais[vaga.id]

      if (!statusLocal || statusLocal === vaga.status) {
        return vaga
      }

      return {
        ...vaga,

        status: statusLocal
      }
    })

    const resumo = vagas.reduce(
      (resumoAtual, vagaAtual, indice) => {
        const vagaOriginal = dadosIniciais.vagas[indice]

        if (vagaAtual.status === vagaOriginal.status) {
          return resumoAtual
        }

        return atualizarResumoLocal(resumoAtual, vagaOriginal, vagaAtual.status)
      },
      {
        ...dadosIniciais.resumo
      }
    )

    return {
      ...dadosIniciais,

      resumo,

      vagas
    }
  }, [dadosIniciais, statusLocais])

  /**
   * A mensagem desaparece alguns segundos depois.
   */
  useEffect(() => {
    if (!mensagem) {
      return
    }

    const temporizador = window.setTimeout(() => {
      setMensagem(null)
    }, 3500)

    return () => window.clearTimeout(temporizador)
  }, [mensagem])

  const fontes = useMemo(
    () =>
      [...new Set(dados.vagas.map(vaga => vaga.source))].sort((primeira, segunda) =>
        primeira.localeCompare(segunda, "pt-BR")
      ),
    [dados.vagas]
  )


  const quantidadeNoStatusSelecionado = useMemo(
    () =>
      dados.vagas.filter(vaga =>
        statusPertenceAoFiltro(vaga.status, filtroStatus)
      ).length,
    [dados.vagas, filtroStatus]
  )

  const vagasFiltradas = useMemo(() => {
    const termo = normalizarTexto(buscaAdiada.trim())

    const filtradas = dados.vagas.filter(vaga => {
      if (vaga.local_score < pontuacaoMinima) {
        return false
      }

      if (!statusPertenceAoFiltro(vaga.status, filtroStatus)) {
        return false
      }

      if (filtroFonte !== "todas" && vaga.source !== filtroFonte) {
        return false
      }

      if (filtroModalidade === "remota" && !vaga.remote) {
        return false
      }

      if (filtroModalidade === "nao-remota" && vaga.remote) {
        return false
      }

      if (!termo) {
        return true
      }

      const texto = normalizarTexto(
        [vaga.title, vaga.company, vaga.location, vaga.source, ...vaga.matched_skills]
          .filter(Boolean)
          .join(" ")
      )

      return texto.includes(termo)
    })

    return filtradas.sort((primeira, segunda) => {
      if (ordenacao === "compatibilidade") {
        return segunda.local_score - primeira.local_score
      }

      const dataPrimeira = new Date(primeira.published_at ?? primeira.created_at).getTime()

      const dataSegunda = new Date(segunda.published_at ?? segunda.created_at).getTime()

      return dataSegunda - dataPrimeira
    })
  }, [
    buscaAdiada,
    dados.vagas,
    filtroFonte,
    filtroModalidade,
    filtroStatus,
    ordenacao,
    pontuacaoMinima
  ])

  const vagasVisiveis = useMemo(
    () => vagasFiltradas.slice(0, limiteVisivel),
    [vagasFiltradas, limiteVisivel]
  )

  const possuiMaisVagas = vagasVisiveis.length < vagasFiltradas.length

  const quantidadeRestante = Math.max(0, vagasFiltradas.length - vagasVisiveis.length)

  const quantidadeProximoLote = Math.min(QUANTIDADE_POR_LOTE, quantidadeRestante)

  const vagaSelecionada = useMemo(
    () => dados.vagas.find(vaga => vaga.id === vagaSelecionadaId) ?? null,
    [dados.vagas, vagaSelecionadaId]
  )

  const quantidadeAbertas = dados.resumo.novas + dados.resumo.vistas

  function alterarBusca(valor: string) {
    setBusca(valor)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)
  }

  function alterarFiltroStatus(valor: FiltroStatus) {
    /**
     * O histórico deve mostrar todas as vagas, independentemente do score.
     *
     * Nas filas que ainda exigem análise, preservo o corte mínimo de 60%.
     */
    const novoScoreMinimo =
      valor === "applied" || valor === "ignored"
        ? 0
        : 60

    setFiltroStatus(valor)

    setPontuacaoMinima(novoScoreMinimo)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)

    /**
     * Ao trocar de área eu já seleciono uma oportunidade compatível com
     * o novo status.
     */
    const primeira = dados.vagas.find(
      vaga =>
        vaga.local_score >= novoScoreMinimo &&
        statusPertenceAoFiltro(vaga.status, valor)
    )

    setVagaSelecionadaId(primeira?.id ?? null)
  }

  function alterarFiltroFonte(valor: string) {
    setFiltroFonte(valor)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)
  }

  function alterarFiltroModalidade(valor: FiltroModalidade) {
    setFiltroModalidade(valor)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)
  }

  function alterarPontuacaoMinima(valor: number) {
    setPontuacaoMinima(valor)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)
  }

  function alterarOrdenacao(valor: OrdenacaoVagas) {
    setOrdenacao(valor)

    setLimiteVisivel(QUANTIDADE_POR_LOTE)
  }

  /**
   * Quando uma vaga deixa a área atualmente exibida eu seleciono a
   * próxima oportunidade da lista.
   *
   * Isso é especialmente importante ao marcar como Aplicada ou Ignorada,
   * pois quero continuar trabalhando na fila sem precisar clicar
   * manualmente em outra vaga.
   */
  function selecionarProximaVaga(vagaAtual: VagaPainel) {
    const indiceAtual = vagasFiltradas.findIndex(vaga => vaga.id === vagaAtual.id)

    if (indiceAtual === -1) {
      setVagaSelecionadaId(null)

      return
    }

    const proxima = vagasFiltradas[indiceAtual + 1]

    const anterior = vagasFiltradas[indiceAtual - 1]

    setVagaSelecionadaId(proxima?.id ?? anterior?.id ?? null)
  }

  async function alterarStatus(vaga: VagaPainel, novoStatus: StatusVaga) {
    if (vaga.status === novoStatus) {
      return
    }

    setIdProcessando(vaga.id)

    try {
      const resposta = await fetch(`/api/vagas/${vaga.id}/status`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          status: novoStatus
        })
      })

      const retorno = await resposta.json()

      if (!resposta.ok) {
        throw new Error(retorno.mensagem ?? "Não foi possível atualizar a vaga.")
      }

      /**
       * Antes de atualizar o estado eu verifico se o novo status continua
       * pertencendo à área que está sendo exibida.
       */
      const continuaVisivel = statusPertenceAoFiltro(novoStatus, filtroStatus)

      if (!continuaVisivel) {
        selecionarProximaVaga(vaga)
      }

      setStatusLocais(atuais => ({
        ...atuais,

        [vaga.id]: novoStatus
      }))

      if (novoStatus === "applied") {
        setMensagem("Candidatura registrada. A oportunidade foi movida para Aplicadas.")
      } else if (novoStatus === "ignored") {
        setMensagem("Oportunidade movida para Ignoradas.")
      } else if (novoStatus === "relevant") {
        setMensagem("Oportunidade reaberta e devolvida para Em aberto.")
      }

      iniciarAtualizacao(() => {
        router.refresh()
      })
    } catch (erro) {
      setMensagem(
        erro instanceof Error ? erro.message : "Não foi possível atualizar a oportunidade."
      )
    } finally {
      setIdProcessando(null)
    }
  }

  function registrarAbertura(vaga: VagaPainel) {
    if (vaga.status !== "relevant") {
      return
    }

    void alterarStatus(vaga, "viewed")
  }

  /**
   * Este botão atualiza somente os dados existentes no banco.
   *
   * Eu removo os overrides locais antes da leitura para que a próxima
   * resposta seja exibida exatamente como estiver no PostgreSQL.
   */
  function atualizarDados() {
    setStatusLocais({})

    iniciarAtualizacao(() => {
      router.refresh()
    })
  }

  function limparFiltros() {
    setBusca("")

    setFiltroStatus("abertas")

    setFiltroModalidade("todas")

    setFiltroFonte("todas")

    setPontuacaoMinima(60)

    setOrdenacao("recentes")

    setLimiteVisivel(QUANTIDADE_POR_LOTE)

    const primeiraAberta = dados.vagas.find(
      vaga => vaga.local_score >= 60 && statusPertenceAoFiltro(vaga.status, "abertas")
    )

    setVagaSelecionadaId(primeiraAberta?.id ?? null)
  }

  function mostrarMaisVagas() {
    setLimiteVisivel(limiteAtual => limiteAtual + QUANTIDADE_POR_LOTE)
  }

  const possuiFiltroAtivo =
    busca.length > 0 ||
    filtroStatus !== "abertas" ||
    filtroModalidade !== "todas" ||
    filtroFonte !== "todas" ||
    pontuacaoMinima !== 60

  const itensOportunidades = [
    {
      rotulo: "Em aberto",

      icone: LayoutDashboard,

      status: "abertas" as const,

      quantidade: quantidadeAbertas
    },
    {
      rotulo: "Novas",

      icone: Sparkles,

      status: "relevant" as const,

      quantidade: dados.resumo.novas
    },
    {
      rotulo: "Vistas",

      icone: Eye,

      status: "viewed" as const,

      quantidade: dados.resumo.vistas
    }
  ]

  const itensHistorico = [
    {
      rotulo: "Aplicadas",

      icone: CheckCircle2,

      status: "applied" as const,

      quantidade: dados.resumo.aplicadas
    },
    {
      rotulo: "Ignoradas",

      icone: ArchiveX,

      status: "ignored" as const,

      quantidade: dados.resumo.ignoradas
    }
  ]

  function renderizarItemMenu(
    item: (typeof itensOportunidades)[number] | (typeof itensHistorico)[number]
  ) {
    const Icone = item.icone

    const ativo = filtroStatus === item.status

    return (
      <button
        key={item.rotulo}
        type="button"
        onClick={() => alterarFiltroStatus(item.status)}
        className={[
          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          ativo
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
        ].join(" ")}
      >
        <Icone size={18} />

        <span className="flex-1 text-left">{item.rotulo}</span>

        <span className="text-xs tabular-nums opacity-70">{item.quantidade}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      {mensagem && (
        <div className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {mensagem}
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-900 dark:bg-slate-950 xl:flex xl:flex-col">
          <div className="flex items-center gap-3 px-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <BriefcaseBusiness size={20} />
            </div>

            <div>
              <div className="font-bold tracking-tight">Job Search</div>

              <div className="text-xs text-slate-500">Painel de oportunidades</div>
            </div>
          </div>

          <nav className="mt-9">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Oportunidades
            </div>

            <div className="space-y-1">{itensOportunidades.map(renderizarItemMenu)}</div>

            <div className="mt-6 px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Histórico
            </div>

            <div className="space-y-1">{itensHistorico.map(renderizarItemMenu)}</div>

            <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

            <Link
              href="/perfil"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <UserRound size={18} />

              <span className="flex-1 text-left">Perfil profissional</span>
            </Link>
          </nav>

          <div className="mt-auto rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target size={16} className="text-indigo-500" />
              Score médio
            </div>

            <div className="mt-3 text-3xl font-bold tracking-tight">
              {dados.resumo.pontuacao_media}%
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Compatibilidade média das oportunidades disponíveis.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 xl:hidden">
                  <BriefcaseBusiness size={20} className="text-indigo-600" />

                  <span className="font-bold">Job Search</span>
                </div>

                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl xl:mt-0">
                  Suas oportunidades
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {dados.resumo.novas_hoje > 0
                    ? `${dados.resumo.novas_hoje} novas oportunidades encontradas hoje.`
                    : `${quantidadeAbertas} oportunidades aguardando sua análise.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <Link
                  href="/perfil"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 xl:hidden"
                >
                  <UserRound size={16} />
                  Perfil profissional
                </Link>

                <button
                  type="button"
                  onClick={atualizarDados}
                  disabled={atualizandoPagina}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {atualizandoPagina ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Atualizar dados
                </button>
              </div>
            </header>

            <div className="mt-6">
              <ControleSincronizacao />
            </div>

            <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <button
                type="button"
                onClick={() => alterarFiltroStatus("relevant")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-xs font-medium text-slate-500">Novas</div>

                <div className="mt-2 text-2xl font-bold tabular-nums">{dados.resumo.novas}</div>
              </button>

              <button
                type="button"
                onClick={() => alterarFiltroStatus("viewed")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-xs font-medium text-slate-500">Vistas</div>

                <div className="mt-2 text-2xl font-bold tabular-nums">{dados.resumo.vistas}</div>
              </button>

              <button
                type="button"
                onClick={() => alterarFiltroStatus("applied")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-xs font-medium text-slate-500">Aplicadas</div>

                <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">
                  {dados.resumo.aplicadas}
                </div>
              </button>

              <button
                type="button"
                onClick={() => alterarFiltroStatus("ignored")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-xs font-medium text-slate-500">Ignoradas</div>

                <div className="mt-2 text-2xl font-bold tabular-nums">{dados.resumo.ignoradas}</div>
              </button>

              <button
                type="button"
                onClick={() => alterarPontuacaoMinima(80)}
                className="col-span-2 cursor-pointer rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-900 dark:bg-indigo-950/40 lg:col-span-1"
              >
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
                  Score médio
                </div>

                <div className="mt-2 text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                  {dados.resumo.pontuacao_media}%
                </div>
              </button>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={busca}
                    onChange={evento => alterarBusca(evento.target.value)}
                    placeholder="Buscar por cargo, empresa, cidade ou tecnologia..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-700 dark:focus:ring-indigo-950"
                  />

                  {busca && (
                    <button
                      type="button"
                      onClick={() => alterarBusca("")}
                      aria-label="Limpar busca"
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  <select
                    value={filtroStatus}
                    onChange={evento => alterarFiltroStatus(evento.target.value as FiltroStatus)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="abertas">Em aberto</option>

                    <option value="relevant">Novas</option>

                    <option value="viewed">Vistas</option>

                    <option value="applied">Aplicadas</option>

                    <option value="ignored">Ignoradas</option>
                  </select>

                  <select
                    value={filtroFonte}
                    onChange={evento => alterarFiltroFonte(evento.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="todas">Todas as fontes</option>

                    {fontes.map(fonte => (
                      <option key={fonte} value={fonte}>
                        {fonte}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroModalidade}
                    onChange={evento =>
                      alterarFiltroModalidade(evento.target.value as FiltroModalidade)
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="todas">Toda modalidade</option>

                    <option value="remota">Remotas</option>

                    <option value="nao-remota">Não marcadas como remotas</option>
                  </select>

                  <select
                    value={pontuacaoMinima}
                    onChange={evento => alterarPontuacaoMinima(Number(evento.target.value))}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >

                    <option value={0}>Todos os scores</option>

                    <option value={60}>Score 60%+</option>

                    <option value={70}>Score 70%+</option>

                    <option value={80}>Score 80%+</option>

                    <option value={85}>Score 85%+</option>

                    <option value={90}>Score 90%+</option>
                  </select>

                  <select
                    value={ordenacao}
                    onChange={evento => alterarOrdenacao(evento.target.value as OrdenacaoVagas)}
                    className="col-span-2 h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-950 md:col-span-1"
                  >
                    <option value="compatibilidade">Maior compatibilidade</option>

                    <option value="recentes">Mais recentes</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <SlidersHorizontal size={15} />

                <span>
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    {vagasFiltradas.length}
                  </strong>

                  {vagasFiltradas.length !==
                    quantidadeNoStatusSelecionado && (
                      <>
                        {" "}de{" "}

                        <strong className="font-semibold text-slate-800 dark:text-slate-200">
                          {quantidadeNoStatusSelecionado}
                        </strong>
                      </>
                    )}{" "}

                  oportunidade
                  {quantidadeNoStatusSelecionado !== 1
                    ? "s"
                    : ""}
                </span>
              </div>

              {possuiFiltroAtivo && (
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <section className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <div className="space-y-3">
                {vagasFiltradas.length > 0 ? (
                  <>
                    {vagasVisiveis.map(vaga => (
                      <CartaoVaga
                        key={vaga.id}
                        vaga={vaga}
                        selecionada={vaga.id === vagaSelecionadaId}
                        aoSelecionar={() => setVagaSelecionadaId(vaga.id)}
                      />
                    ))}

                    {possuiMaisVagas && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={mostrarMaisVagas}
                          className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                        >
                          Mostrar mais {quantidadeProximoLote}
                          <span className="ml-2 text-xs font-normal opacity-60">
                            {vagasVisiveis.length} de {vagasFiltradas.length}
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                      <Search size={20} />
                    </div>

                    <h3 className="mt-4 font-semibold">Nenhuma oportunidade encontrada</h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      {filtroStatus === "abertas"
                        ? "Não há oportunidades em aberto com os filtros atuais."
                        : "Tente reduzir o score mínimo ou remover algum dos filtros aplicados."}
                    </p>

                    <button
                      type="button"
                      onClick={limparFiltros}
                      className="mt-5 cursor-pointer rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                    >
                      Voltar para Em aberto
                    </button>
                  </div>
                )}
              </div>

              {vagaSelecionada ? (
                <DetalheVaga
                  vaga={vagaSelecionada}
                  processando={idProcessando === vagaSelecionada.id}
                  aoFechar={() => setVagaSelecionadaId(null)}
                  aoAbrir={() => registrarAbertura(vagaSelecionada)}
                  aoAlterarStatus={status => alterarStatus(vagaSelecionada, status)}
                />
              ) : (
                <div className="sticky top-6 hidden min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900 lg:flex">
                  <div>
                    <BriefcaseBusiness
                      size={28}
                      className="mx-auto text-slate-300 dark:text-slate-700"
                    />

                    <p className="mt-4 text-sm text-slate-500">
                      Selecione uma oportunidade para ver os detalhes.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
