"use client"

import { useState } from "react"

import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  RefreshCw
} from "lucide-react"

import {
  calcularAlturaBarraSerie,
  calcularLarguraBarra,
  calcularPercentual,
  formatarDiaCurto,
  formatarMotivoDescarte,
  formatarNumero,
  maiorColetaSerie,
  maiorTotalDescartes,
  normalizarJanela,
  resumoVazio,
  totalDescartes,
  validarResumo
} from "@/lib/telemetria-utils"

import type { JanelaDias, ResumoTelemetria } from "@/types/telemetria"

type Propriedades = {
  resumoInicial: ResumoTelemetria | null
}

const JANELAS: JanelaDias[] = [7, 14, 30]

export function Telemetria({ resumoInicial }: Propriedades) {
  const [aberto, setAberto] = useState(false)

  const janelaInicial = normalizarJanela(resumoInicial?.janelaDias ?? 7)

  const [dias, setDias] = useState<JanelaDias>(janelaInicial)

  const [resumo, setResumo] = useState<ResumoTelemetria>(
    resumoInicial ?? resumoVazio(janelaInicial)
  )

  const [carregando, setCarregando] = useState(false)

  const [erro, setErro] = useState<string | null>(null)

  async function recarregar(novaJanela: JanelaDias) {
    setCarregando(true)
    setErro(null)
    try {
      const resposta = await fetch(`/api/telemetria/resumo?dias=${novaJanela}`, {
        cache: "no-store"
      })

      const texto = await resposta.text()
      let dados: unknown = {}
      if (texto.trim()) {
        try {
          dados = JSON.parse(texto)
        } catch {
          throw new Error("O servidor devolveu uma resposta invalida.")
        }
      }

      if (!resposta.ok) {
        const mensagem =
          typeof dados === "object" && dados !== null && "mensagem" in dados &&
          typeof (dados as { mensagem?: unknown }).mensagem === "string"
            ? (dados as { mensagem: string }).mensagem
            : "Nao foi possivel consultar a telemetria."
        throw new Error(mensagem)
      }

      const validado = validarResumo(dados)
      if (!validado) {
        throw new Error("Resposta de telemetria em formato inesperado.")
      }

      setResumo(validado)
      setDias(novaJanela)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Nao foi possivel consultar a telemetria.")
    } finally {
      setCarregando(false)
    }
  }

  const funil = resumo.ultimaExecucao?.funil ?? null

  const maxDescartes = maiorTotalDescartes(resumo.topDescartes)

  const totalDesc = totalDescartes(resumo.topDescartes)

  const maxSerie = maiorColetaSerie(resumo.serieDiaria)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        aria-controls="painel-telemetria"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <BarChart3 size={17} />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Telemetria do funil
            </div>
            <div className="text-xs text-slate-500">
              Diagnostico da ultima sincronizacao e serie temporal
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {aberto ? <EyeOff size={15} /> : <Eye size={15} />}
          {aberto ? "Ocultar Telemetria" : "Ver Telemetria"}
        </div>
      </button>

      {aberto && (
        <div
          id="painel-telemetria"
          className="border-t border-slate-200 px-4 py-4 dark:border-slate-800"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              {JANELAS.map(j => (
                <button
                  key={j}
                  type="button"
                  onClick={() => void recarregar(j)}
                  disabled={carregando}
                  aria-pressed={dias === j}
                  className={[
                    "min-h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                    dias === j
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  ].join(" ")}
                >
                  {j}d
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void recarregar(dias)}
              disabled={carregando}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
            >
              {carregando ? (
                <LoaderCircle size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              Atualizar
            </button>
          </div>

          {erro && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {erro}
            </div>
          )}

          <section
            aria-labelledby="titulo-funil"
            className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <h3
              id="titulo-funil"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Ultima execucao
            </h3>
            {funil ? (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <ItemFunil rotulo="Coletadas" valor={funil.coletadas} />
                <ItemFunil rotulo="Apos janela" valor={funil.aposJanela} />
                <ItemFunil rotulo="Apos local" valor={funil.aposElegibilidade} />
                <ItemFunil rotulo="Apos matcher" valor={funil.aposMatcher} />
                <ItemFunil rotulo="Importadas" valor={funil.importadas} destaque />
                <ItemFunil rotulo="Duplicadas" valor={funil.duplicadas} />
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Nenhuma execucao registrada ainda.
              </p>
            )}
          </section>

          <section
            aria-labelledby="titulo-serie"
            className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <h3
              id="titulo-serie"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Serie diaria (ultimos {dias} dias)
            </h3>
            {resumo.serieDiaria.length > 0 ? (
              <div className="mt-3 flex h-32 items-end gap-1.5">
                {resumo.serieDiaria.map(p => (
                  <div
                    key={p.dia}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${p.dia}: ${p.coletadas} coletadas / ${p.importadas} importadas`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-indigo-500 transition-all"
                        style={{
                          height: `${calcularAlturaBarraSerie(p.coletadas, maxSerie)}%`
                        }}
                        aria-label={`${p.coletadas} coletadas em ${p.dia}`}
                      />
                    </div>
                    <span className="text-[9px] tabular-nums text-slate-400">
                      {formatarDiaCurto(p.dia)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Sem coletas registradas nesta janela.
              </p>
            )}
          </section>

          <section
            aria-labelledby="titulo-descartes"
            className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <h3
              id="titulo-descartes"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Top motivos de descarte
            </h3>
            {resumo.topDescartes.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {resumo.topDescartes.map(d => {
                  const largura = calcularLarguraBarra(d.total, maxDescartes)
                  const perc = calcularPercentual(d.total, totalDesc)
                  return (
                    <li key={d.motivo}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                          {formatarMotivoDescarte(d.motivo)}
                        </span>
                        <span className="ml-2 tabular-nums text-slate-500">
                          {formatarNumero(d.total)}{" "}
                          <span className="text-slate-400">({perc}%)</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${largura}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Sem descartes registrados.</p>
            )}
          </section>

          {resumo.ultimaExecucao && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Clock3 size={12} />
              Execucao {resumo.ultimaExecucao.execucaoId.slice(0, 8)} finalizada em{" "}
              {new Date(resumo.ultimaExecucao.finalizadaEm).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ItemFunil({
  rotulo,
  valor,
  destaque
}: {
  rotulo: string
  valor: number
  destaque?: boolean
}) {
  return (
    <li
      className={[
        "rounded-xl px-2.5 py-2",
        destaque
          ? "bg-emerald-50 dark:bg-emerald-950/30"
          : "bg-slate-50 dark:bg-slate-950"
      ].join(" ")}
    >
      <div
        className={[
          "text-[10px] font-medium",
          destaque
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-500"
        ].join(" ")}
      >
        {rotulo}
      </div>
      <div
        className={[
          "mt-0.5 text-base font-bold tabular-nums",
          destaque
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-900 dark:text-slate-100"
        ].join(" ")}
      >
        {formatarNumero(valor)}
      </div>
    </li>
  )
}
