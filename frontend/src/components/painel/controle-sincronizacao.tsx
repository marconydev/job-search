"use client"

import { useEffect, useMemo, useState, useTransition } from "react"

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X
} from "lucide-react"

import { useRouter } from "next/navigation"

import type { ResultadoSincronizacao, StatusSincronizacao } from "@/types/painel"

type TipoModal = "confirmar-brave" | "resultado" | null

type ModoEmExecucao = "economico" | "brave" | null

type ResultadoExibicao = {
  dados: ResultadoSincronizacao

  /**
   * Eu considero este número como tentativas contabilizadas no orçamento.
   *
   * Uma tentativa não significa obrigatoriamente uma resposta
   * bem-sucedida da Brave.
   */
  tentativasBrave: number
}

type PlataformaDescoberta = {
  provedor: string

  quantidade: number
}

function formatarUltimaAtualizacao(valor: string | null) {
  if (!valor) {
    return "Ainda não registrada"
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return "Data indisponível"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data)
}

function obterNomePlataforma(provedor: string) {
  const nomes: Record<string, string> = {
    gupy: "Gupy",
    linkedin: "LinkedIn",
    indeed: "Indeed",
    lever: "Lever",
    greenhouse: "Greenhouse",
    workable: "Workable",
    smartrecruiters: "SmartRecruiters",
    ashby: "Ashby",
    recruitee: "Recruitee",
    workday: "Workday",
    solides: "Sólides",
    pandape: "Pandapé",
    vagas: "Vagas.com",
    infojobs: "InfoJobs",
    catho: "Catho",
    "remote-ok": "Remote OK",
    remotive: "Remotive",
    agregador: "Outros portais",
    desconhecido: "Outros sites",
    "pagina-propria": "Página da empresa"
  }

  return nomes[provedor] ?? provedor
}

function obterNomeFonteDireta(fonte: string) {
  const nomes: Record<string, string> = {
    remotive: "Remotive",
    "remote-ok": "Remote OK",
    jobicy: "Jobicy",
    arbeitnow: "Arbeitnow"
  }

  const nomeDireto = nomes[fonte]

  if (nomeDireto) {
    return nomeDireto
  }

  if (fonte.startsWith("ats:")) {
    const [, provedor, ...identificador] = fonte.split(":")

    return [obterNomePlataforma(provedor), identificador.join(":")].filter(Boolean).join(" · ")
  }

  return fonte
}

async function consultarStatusSincronizacao(): Promise<StatusSincronizacao> {
  const resposta = await fetch("/api/sincronizacao/status", {
    cache: "no-store"
  })

  const dados = await resposta.json()

  if (!resposta.ok) {
    throw new Error(dados.mensagem ?? "Não foi possível consultar o status.")
  }

  return dados as StatusSincronizacao
}

export function ControleSincronizacao() {
  const router = useRouter()

  const [atualizandoPagina, iniciarAtualizacaoPagina] = useTransition()

  const [status, setStatus] = useState<StatusSincronizacao | null>(null)

  const [carregandoStatus, setCarregandoStatus] = useState(true)

  const [modoEmExecucao, setModoEmExecucao] = useState<ModoEmExecucao>(null)

  const [modal, setModal] = useState<TipoModal>(null)

  const [resultado, setResultado] = useState<ResultadoExibicao | null>(null)

  const [erro, setErro] = useState<string | null>(null)

  /**
   * No primeiro carregamento eu consulto somente consumo e cache.
   *
   * Isso nunca executa Brave.
   */
  useEffect(() => {
    let ativo = true

    async function carregarInicial() {
      try {
        const dados = await consultarStatusSincronizacao()

        if (!ativo) {
          return
        }

        setStatus(dados)
        setErro(null)
      } catch (erroCapturado) {
        if (!ativo) {
          return
        }

        setErro(
          erroCapturado instanceof Error
            ? erroCapturado.message
            : "Não foi possível consultar a sincronização."
        )
      } finally {
        if (ativo) {
          setCarregandoStatus(false)
        }
      }
    }

    void carregarInicial()

    return () => {
      ativo = false
    }
  }, [])

  const sincronizando = modoEmExecucao !== null

  const chamadasRestantes = status?.chamadasRestantes ?? 0

  const limiteDiario = status?.limiteDiario ?? 30

  const chamadasHoje = status?.chamadasHoje ?? 0

  const limiteMensal = status?.limiteMensal ?? 1000

  const chamadasMes = status?.chamadasMes ?? 0

  const chamadasRestantesMes = status?.chamadasRestantesMes ?? 0

  const limiteMensalAtingido = Boolean(status && chamadasRestantesMes <= 0)

  const podeUsarBrave = Boolean(status && chamadasRestantes > 0 && !sincronizando)

  async function recarregarStatus() {
    const dados = await consultarStatusSincronizacao()

    setStatus(dados)

    return dados
  }

  async function executarSincronizacao(usarBrave: boolean) {
    const modo: ModoEmExecucao = usarBrave ? "brave" : "economico"

    const chamadasAntes = status?.chamadasHoje ?? 0

    setModoEmExecucao(modo)
    setErro(null)
    setResultado(null)

    try {
      const limiteSolicitado = usarBrave ? chamadasRestantes : 0

      const resposta = await fetch("/api/sincronizacao", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          usarBrave,

          limiteChamadasBrave: limiteSolicitado
        })
      })

      const dados = (await resposta.json()) as ResultadoSincronizacao & {
        mensagem?: string
      }

      if (!resposta.ok) {
        throw new Error(dados.mensagem ?? "Não foi possível concluir a sincronização.")
      }

      let chamadasDepois = chamadasAntes

      try {
        const novoStatus = await recarregarStatus()

        chamadasDepois = novoStatus.chamadasHoje
      } catch (erroStatus) {
        console.error("Não foi possível atualizar o contador após a sincronização:", erroStatus)
      }

      const tentativasBrave = Math.max(0, chamadasDepois - chamadasAntes)

      setResultado({
        dados,
        tentativasBrave
      })

      setModal("resultado")

      iniciarAtualizacaoPagina(() => {
        router.refresh()
      })
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Não foi possível concluir a sincronização."
      )

      setModal(null)
    } finally {
      setModoEmExecucao(null)
    }
  }

  function solicitarBuscaBrave() {
    if (!podeUsarBrave) {
      return
    }

    setModal("confirmar-brave")
  }

  const resumoResultado = useMemo(() => {
    if (!resultado) {
      return null
    }

    const fontes = resultado.dados.fontes ?? []

    const encontradasFontes = fontes.reduce((total, fonte) => total + fonte.found, 0)

    const aderentesFontes = fontes.reduce(
      (total, fonte) => total + (fonte.matched ?? fonte.inserted + fonte.duplicates),
      0
    )

    const novasFontes = fontes.reduce((total, fonte) => total + fonte.inserted, 0)

    const duplicadasFontes = fontes.reduce((total, fonte) => total + fonte.duplicates, 0)

    const fontesComFalha = fontes.filter(fonte => Boolean(fonte.error)).length

    const novasWeb =
      resultado.dados.web.importadas + resultado.dados.web.persistenciaDescoberta.novas

    const novasOportunidades = novasFontes + novasWeb

    const falhasWeb = resultado.dados.web.falhas + resultado.dados.web.persistenciaDescoberta.falhas

    return {
      fontesVerificadas: fontes.length,

      encontradasFontes,

      aderentesFontes,

      novasFontes,

      duplicadasFontes,

      fontesComFalha,

      novasWeb,

      novasOportunidades,

      falhasWeb
    }
  }, [resultado])

  const plataformasDescobertas = useMemo<PlataformaDescoberta[]>(() => {
    if (!resultado) {
      return []
    }

    const totais = new Map<string, number>()

    for (const fonte of resultado.dados.web.porProvedor ?? []) {
      totais.set(fonte.provedor, (totais.get(fonte.provedor) ?? 0) + fonte.encontradas)
    }

    for (const pagina of resultado.dados.web.somenteDescoberta ?? []) {
      totais.set(pagina.provedor, (totais.get(pagina.provedor) ?? 0) + 1)
    }

    return [...totais.entries()]
      .map(([provedor, quantidade]) => ({
        provedor,
        quantidade
      }))
      .filter(plataforma => plataforma.quantidade > 0)
      .sort((primeira, segunda) => segunda.quantidade - primeira.quantidade)
  }, [resultado])

  const possuiDadosWeb = Boolean(
    resultado &&
    (resultado.dados.web.paginasDescobertas > 0 ||
      resultado.dados.web.paginasDeListagem > 0 ||
      resultado.dados.web.paginasSelecionadas > 0 ||
      resultado.dados.web.vagasExtraidas > 0 ||
      resultado.dados.web.importadas > 0 ||
      resultado.dados.web.persistenciaDescoberta.novas > 0 ||
      resultado.dados.web.persistenciaDescoberta.atualizadas > 0 ||
      resultado.dados.web.duplicadas > 0 ||
      resultado.dados.web.falhas > 0 ||
      resultado.dados.web.persistenciaDescoberta.falhas > 0)
  )

  const possuiAnaliseMatcher = Boolean(resultado && resultado.dados.analise.analisadas > 0)

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="shrink-0 text-indigo-600 dark:text-indigo-400" />

                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Atualização de oportunidades
                </h2>
              </div>

              <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500">
                Atualize as fontes diretas e ATS sem custo ou execute a busca web completa para
                procurar novas oportunidades nas principais plataformas.
              </p>
            </div>

            {carregandoStatus ? (
              <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                <LoaderCircle size={14} className="animate-spin" />
                Consultando consumo...
              </div>
            ) : status ? (
              <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 lg:max-w-xl lg:justify-end">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Search size={13} />
                  Brave hoje:
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {chamadasHoje} / {limiteDiario}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Database size={13} />
                  Mês:
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {chamadasMes} / {limiteMensal}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Target size={13} />
                  Estratégias:
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {status.consultasConfiguradas}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Database size={13} />
                  Cache:
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {status.consultasAtivas}
                  </strong>
                </span>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Clock3 size={13} />
                  Última busca:
                  <strong className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatarUltimaAtualizacao(status.ultimaAtualizacao)}
                  </strong>
                </span>
              </div>
            ) : null}
          </div>

          {erro && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />

              {erro}
            </div>
          )}

          <div className="grid items-stretch gap-3 lg:grid-cols-2">
            <article className="flex h-full flex-col rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex flex-1 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Layers3 size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Modo econômico
                    </h3>

                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Sem Brave
                    </span>
                  </div>

                  <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                    Atualiza fontes diretas, consulta ATS aprendidos, reaproveita o cache e executa
                    novamente o matcher sem consumir Brave.
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck size={13} />0 chamadas Brave
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={sincronizando || atualizandoPagina}
                onClick={() => void executarSincronizacao(false)}
                className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {modoEmExecucao === "economico" ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Sincronizar sem Brave
                  </>
                )}
              </button>
            </article>

            <article className="flex h-full flex-col rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
              <div className="flex flex-1 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <Globe2 size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Busca web completa
                    </h3>

                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Busca diária
                    </span>
                  </div>

                  <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                    Pesquisa novas vagas nas estratégias configuradas para Gupy, LinkedIn, Indeed,
                    Workday, Sólides, portais, ATS e demais fontes.
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <Sparkles size={13} />

                    {carregandoStatus
                      ? "Consultando disponibilidade..."
                      : chamadasRestantes > 0
                        ? `${chamadasRestantes} consulta${
                            chamadasRestantes !== 1 ? "s" : ""
                          } disponível${chamadasRestantes !== 1 ? "is" : ""} hoje`
                        : limiteMensalAtingido
                          ? "Limite mensal atingido"
                          : "Limite diário atingido"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!podeUsarBrave || atualizandoPagina}
                onClick={solicitarBuscaBrave}
                className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-600/35 disabled:text-indigo-100/60"
              >
                {modoEmExecucao === "brave" ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Globe2 size={16} />

                    {chamadasRestantes > 0
                      ? "Buscar novas vagas na web"
                      : limiteMensalAtingido
                        ? "Limite mensal atingido"
                        : "Limite diário atingido"}
                  </>
                )}
              </button>
            </article>
          </div>
        </div>
      </section>

      {modal === "confirmar-brave" && status && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacao-brave"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle size={19} />
                </div>

                <h2
                  id="titulo-confirmacao-brave"
                  className="mt-4 text-lg font-bold text-slate-950 dark:text-white"
                >
                  Autorizar busca web?
                </h2>
              </div>

              <button
                type="button"
                disabled={sincronizando}
                onClick={() => setModal(null)}
                aria-label="Fechar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Esta operação autoriza novas pesquisas na Brave e usa somente o saldo ainda disponível
              no orçamento configurado.
            </p>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Limite desta execução
              </div>

              <div className="mt-1 text-3xl font-bold tracking-tight text-amber-800 dark:text-amber-200">
                até {chamadasRestantes}
              </div>

              <p className="mt-1 text-xs leading-5 text-amber-700/80 dark:text-amber-300/80">
                tentativa
                {chamadasRestantes !== 1 ? "s" : ""} disponível
                {chamadasRestantes !== 1 ? "is" : ""} para hoje.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">Hoje</div>

                <div className="mt-1 text-sm font-bold">
                  {chamadasHoje} / {limiteDiario}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-[11px] text-slate-500">Mês</div>

                <div className="mt-1 text-sm font-bold">
                  {chamadasMes} / {limiteMensal}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              O backend aplica tanto o limite diário quanto o limite mensal mesmo depois desta
              autorização.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={sincronizando}
                onClick={() => setModal(null)}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={sincronizando}
                onClick={() => void executarSincronizacao(true)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {modoEmExecucao === "brave" ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Buscando...
                  </>
                ) : (
                  "Autorizar busca"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "resultado" && resultado && resumoResultado && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-resultado-sincronizacao"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={20} />
                </div>

                <div>
                  <h2
                    id="titulo-resultado-sincronizacao"
                    className="text-lg font-bold text-slate-950 dark:text-white"
                  >
                    Sincronização concluída
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {resultado.dados.modo.braveAutorizada
                      ? "Busca web autorizada"
                      : "Modo econômico"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Fechar"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-medium text-slate-500">Consultadas</div>

                <div className="mt-1 text-xl font-bold tabular-nums">
                  {resumoResultado.encontradasFontes}
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  Novas oportunidades
                </div>

                <div className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {resumoResultado.novasOportunidades}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="text-[11px] font-medium text-slate-500">Páginas disponíveis</div>

                <div className="mt-1 text-xl font-bold tabular-nums">
                  {resultado.dados.web.paginasDescobertas}
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-3 dark:bg-indigo-950/20">
                <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                  Tentativas Brave
                </div>

                <div className="mt-1 text-xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                  {resultado.tentativasBrave}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Database size={15} className="text-slate-500" />
                  Fontes diretas e ATS
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="text-slate-500">Fontes verificadas</div>

                  <div className="text-right font-semibold">
                    {resumoResultado.fontesVerificadas}
                  </div>

                  <div className="text-slate-500">Retornadas pelas fontes</div>

                  <div className="text-right font-semibold">
                    {resumoResultado.encontradasFontes}
                  </div>

                  <div className="text-slate-500">Aderentes ao perfil</div>

                  <div className="text-right font-semibold text-indigo-600 dark:text-indigo-400">
                    {resumoResultado.aderentesFontes}
                  </div>

                  <div className="text-slate-500">Novas</div>

                  <div className="text-right font-semibold text-emerald-600">
                    {resumoResultado.novasFontes}
                  </div>

                  <div className="text-slate-500">Duplicadas</div>

                  <div className="text-right font-semibold">{resumoResultado.duplicadasFontes}</div>

                  {resumoResultado.fontesComFalha > 0 && (
                    <>
                      <div className="text-rose-500">Fontes com falha</div>

                      <div className="text-right font-semibold text-rose-600">
                        {resumoResultado.fontesComFalha}
                      </div>
                    </>
                  )}
                </div>

                {resultado.dados.fontes.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    {resultado.dados.fontes.map(fonte => (
                      <div
                        key={fonte.source}
                        className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {obterNomeFonteDireta(fonte.source)}
                          </span>

                          <span className="text-xs font-bold tabular-nums">{fonte.found}</span>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>
                            Aderentes: {fonte.matched ?? fonte.inserted + fonte.duplicates}
                          </span>

                          <span>Novas: {fonte.inserted}</span>

                          <span>Duplicadas: {fonte.duplicates}</span>
                        </div>

                        {fonte.error && (
                          <div className="mt-2 text-[11px] leading-5 text-rose-600 dark:text-rose-400">
                            {fonte.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Globe2 size={15} className="text-indigo-500" />
                  Descoberta web e cache
                </div>

                {possuiDadosWeb ? (
                  <>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      Resultados recentes da descoberta web combinados com páginas ainda válidas no
                      cache.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="text-slate-500">Páginas disponíveis</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.paginasDescobertas}
                      </div>

                      <div className="text-slate-500">Descartadas na triagem</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.descartadasPorTitulo}
                      </div>

                      <div className="text-slate-500">Páginas de listagem</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.paginasDeListagem}
                      </div>

                      <div className="text-slate-500">ATS selecionadas</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.paginasSelecionadas}
                      </div>

                      <div className="text-slate-500">Vagas extraídas</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.vagasExtraidas}
                      </div>

                      <div className="text-slate-500">Compatíveis com Brasil</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.compativeisBrasil}
                      </div>

                      <div className="text-slate-500">Novas estruturadas</div>

                      <div className="text-right font-semibold text-emerald-600">
                        {resultado.dados.web.importadas}
                      </div>

                      <div className="text-slate-500">Novas da descoberta</div>

                      <div className="text-right font-semibold text-emerald-600">
                        {resultado.dados.web.persistenciaDescoberta.novas}
                      </div>

                      <div className="text-slate-500">Atualizadas</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.persistenciaDescoberta.atualizadas}
                      </div>

                      <div className="text-slate-500">Duplicadas estruturadas</div>

                      <div className="text-right font-semibold">
                        {resultado.dados.web.duplicadas}
                      </div>

                      <div className="text-slate-500">Falhas de processamento</div>

                      <div
                        className={[
                          "text-right font-semibold",

                          resumoResultado.falhasWeb > 0 ? "text-rose-600" : ""
                        ].join(" ")}
                      >
                        {resumoResultado.falhasWeb}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                    <div className="flex items-start gap-2">
                      <Globe2 size={15} className="mt-0.5 shrink-0 text-slate-400" />

                      <div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nenhum dado de descoberta web no cache
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          A seção será preenchida após uma nova busca web. As fontes diretas e ATS
                          continuam funcionando normalmente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {plataformasDescobertas.length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Globe2 size={15} className="text-indigo-500" />
                    Plataformas encontradas
                  </div>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Quantidade de páginas disponíveis por origem após classificação e deduplicação.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {plataformasDescobertas.map(plataforma => (
                      <div
                        key={plataforma.provedor}
                        className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950"
                      >
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {obterNomePlataforma(plataforma.provedor)}
                        </span>

                        <strong className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {plataforma.quantidade}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles size={15} className="text-amber-500" />
                  Matcher
                </div>

                {possuiAnaliseMatcher ? (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="text-slate-500">Analisadas</div>

                    <div className="text-right font-semibold">
                      {resultado.dados.analise.analisadas}
                    </div>

                    <div className="text-slate-500">Relevantes</div>

                    <div className="text-right font-semibold text-emerald-600">
                      {resultado.dados.analise.relevantes}
                    </div>

                    <div className="text-slate-500">Descartadas</div>

                    <div className="text-right font-semibold">
                      {resultado.dados.analise.descartadas}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />

                      <div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Nenhuma nova vaga pendente para análise
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          As oportunidades recebidas nesta sincronização já haviam sido analisadas
                          anteriormente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {resultado.dados.modo.braveAutorizada && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    <Search size={15} />
                    Consumo Brave
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="text-slate-500">Tentativas nesta execução</div>

                    <div className="text-right font-semibold">{resultado.tentativasBrave}</div>

                    <div className="text-slate-500">Consumo hoje</div>

                    <div className="text-right font-semibold">
                      {status?.chamadasHoje ?? chamadasHoje} /{" "}
                      {status?.limiteDiario ?? limiteDiario}
                    </div>

                    <div className="text-slate-500">Consumo no mês</div>

                    <div className="text-right font-semibold">
                      {status?.chamadasMes ?? chamadasMes} / {status?.limiteMensal ?? limiteMensal}
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-indigo-700/80 dark:text-indigo-300/80">
                    Tentativas contabilizadas não significam necessariamente respostas
                    bem-sucedidas. O backend registra no terminal quantas consultas concluíram com
                    sucesso, quantas falharam e quantos resultados foram recebidos.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950">
              <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldCheck
                  size={14}
                  className={
                    resultado.dados.modo.braveAutorizada
                      ? "mt-0.5 shrink-0 text-indigo-500"
                      : "mt-0.5 shrink-0 text-emerald-500"
                  }
                />

                <span>
                  {resultado.dados.modo.braveAutorizada
                    ? `${resultado.tentativasBrave} tentativa${
                        resultado.tentativasBrave !== 1 ? "s" : ""
                      } Brave contabilizada${
                        resultado.tentativasBrave !== 1 ? "s" : ""
                      } nesta execução.`
                    : "Nenhuma chamada Brave foi autorizada."}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="cursor-pointer rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
