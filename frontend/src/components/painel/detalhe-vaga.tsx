import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Eye,
  House,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Sparkles,
  Target,
  X
} from "lucide-react"

import type {
  StatusVaga,
  VagaPainel
} from "@/types/painel"

type Propriedades = {
  vaga: VagaPainel

  processando: boolean

  aoFechar:
    () => void

  aoAbrir:
    () => void

  aoAlterarStatus:
    (
      status:
        StatusVaga
    ) => Promise<void>
}

type EtapaAcompanhamento = {
  titulo: string

  data:
    string | null

  concluida:
    boolean

  tipo:
    "encontrada"
    | "vista"
    | "aplicada"
}

function obterRotuloStatus(
  status:
    StatusVaga
) {
  switch (status) {
    case "relevant":
      return "Nova"

    case "viewed":
      return "Vista"

    case "applied":
      return "Aplicada"

    case "ignored":
      return "Ignorada"
  }
}

function obterNomeFonte(
  fonte: string
) {
  const nomes:
    Record<
      string,
      string
    > = {
    linkedin:
      "LinkedIn",

    indeed:
      "Indeed",

    gupy:
      "Gupy",

    lever:
      "Lever",

    greenhouse:
      "Greenhouse",

    workable:
      "Workable",

    smartrecruiters:
      "SmartRecruiters",

    remotive:
      "Remotive",

    "remote-ok":
      "Remote OK",

    agregador:
      "Agregador",

    desconhecido:
      "Outra fonte"
  }

  return (
    nomes[fonte] ??
    fonte
  )
}

function formatarDataHora(
  valor:
    string | null
) {
  if (!valor) {
    return null
  }

  const data =
    new Date(valor)

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return null
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(data)
}

function criarEtapasAcompanhamento(
  vaga:
    VagaPainel
): EtapaAcompanhamento[] {
  return [
    {
      titulo:
        "Encontrada",

      data:
        formatarDataHora(
          vaga.created_at
        ),

      concluida:
        true,

      tipo:
        "encontrada"
    },
    {
      titulo:
        "Vista",

      data:
        formatarDataHora(
          vaga.viewed_at
        ),

      concluida:
        Boolean(
          vaga.viewed_at
        ),

      tipo:
        "vista"
    },
    {
      titulo:
        "Aplicada",

      data:
        formatarDataHora(
          vaga.applied_at
        ),

      concluida:
        Boolean(
          vaga.applied_at
        ),

      tipo:
        "aplicada"
    }
  ]
}

function IconeEtapa({
  etapa
}: {
  etapa:
    EtapaAcompanhamento
}) {
  if (
    !etapa.concluida
  ) {
    return (
      <Circle
        size={16}
        className="text-slate-300 dark:text-slate-700"
      />
    )
  }

  switch (
    etapa.tipo
  ) {
    case "encontrada":
      return (
        <Sparkles
          size={16}
        />
      )

    case "vista":
      return (
        <Eye
          size={16}
        />
      )

    case "aplicada":
      return (
        <CheckCircle2
          size={16}
        />
      )
  }
}

export function DetalheVaga({
  vaga,
  processando,
  aoFechar,
  aoAbrir,
  aoAlterarStatus
}: Propriedades) {
  const etapas =
    criarEtapasAcompanhamento(
      vaga
    )

  const candidaturaAplicada =
    vaga.status ===
    "applied"

  const oportunidadeIgnorada =
    vaga.status ===
    "ignored"

  const statusRetorno =
    vaga.viewed_at
      ? "viewed"
      : "relevant"

  return (
    <aside
      className="
        fixed inset-0 z-50 overflow-y-auto bg-white
        dark:bg-slate-950
        lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100vh-3rem)]
        lg:rounded-3xl lg:border lg:border-slate-200
        lg:shadow-sm dark:lg:border-slate-800
      "
    >
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur-xl dark:border-slate-900 dark:bg-slate-950/95 lg:rounded-t-3xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  candidaturaAplicada
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : oportunidadeIgnorada
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      : vaga.status ===
                        "viewed"
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                ].join(" ")}
              >
                {obterRotuloStatus(
                  vaga.status
                )}
              </span>

              <span className="text-xs font-medium text-slate-500">
                {obterNomeFonte(
                  vaga.source
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={
                aoFechar
              }
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-900 dark:hover:text-slate-100 lg:hidden"
              aria-label="Fechar detalhes"
            >
              <X
                size={19}
              />
            </button>
          </div>
        </header>

        <div className="flex-1 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <h2 className="text-xl font-bold leading-8 tracking-tight text-slate-950 dark:text-white">
                {vaga.title}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                <Building2
                  size={17}
                />

                {vaga.company}
              </div>
            </div>

            <div
              className={[
                "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl",
                vaga.local_score >=
                85
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              ].join(" ")}
            >
              <span className="text-lg font-bold tabular-nums">
                {vaga.local_score}%
              </span>

              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
                match
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {vaga.location && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <MapPin
                  size={14}
                />

                {vaga.location}
              </span>
            )}

            {vaga.remote ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <House
                  size={14}
                />

                Trabalho remoto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-500">
                <CircleDot
                  size={14}
                />

                Modalidade não confirmada
              </span>
            )}

            {vaga.partial && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <Sparkles
                  size={14}
                />

                Dados parciais
              </span>
            )}
          </div>

          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Clock3
                size={17}
                className="text-indigo-500"
              />

              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Acompanhamento
              </h3>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              {etapas.map(
                (
                  etapa,
                  indice
                ) => (
                  <div
                    key={
                      etapa.titulo
                    }
                    className={[
                      "flex items-center gap-3 px-4 py-3",
                      indice <
                      etapas.length -
                        1
                        ? "border-b border-slate-100 dark:border-slate-900"
                        : ""
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        etapa.concluida
                          ? etapa.tipo ===
                            "aplicada"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600"
                      ].join(" ")}
                    >
                      <IconeEtapa
                        etapa={
                          etapa
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={[
                          "text-xs font-semibold",
                          etapa.concluida
                            ? "text-slate-800 dark:text-slate-200"
                            : "text-slate-400 dark:text-slate-600"
                        ].join(" ")}
                      >
                        {etapa.titulo}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        {etapa.data ??
                          "Ainda não"}
                      </div>
                    </div>

                    {etapa.concluida && (
                      <Check
                        size={15}
                        className="shrink-0 text-emerald-500"
                      />
                    )}
                  </div>
                )
              )}
            </div>

            {oportunidadeIgnorada && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                Oportunidade ignorada em{" "}
                <strong className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatarDataHora(
                    vaga.status_updated_at
                  ) ??
                    "data não registrada"}
                </strong>
                .
              </div>
            )}
          </section>

          {candidaturaAplicada && (
            <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2
                    size={18}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Candidatura registrada
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">
                    Você marcou esta oportunidade como aplicada
                    {vaga.applied_at
                      ? ` em ${formatarDataHora(vaga.applied_at)}`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            </section>
          )}

          {vaga.matched_skills.length >
            0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Target
                  size={17}
                  className="text-indigo-500"
                />

                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Competências encontradas
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {vaga
                  .matched_skills
                  .map(
                    competencia => (
                      <span
                        key={
                          competencia
                        }
                        className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      >
                        {competencia}
                      </span>
                    )
                  )}
              </div>
            </section>
          )}

          {vaga.reasons.length >
            0 && (
            <section className="mt-8">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Por que esta vaga combina com seu perfil
              </h3>

              <div className="mt-3 space-y-2.5">
                {vaga.reasons.map(
                  motivo => (
                    <div
                      key={
                        motivo
                      }
                      className="flex gap-2.5 text-sm leading-6 text-slate-600 dark:text-slate-400"
                    >
                      <Check
                        size={16}
                        className="mt-1 shrink-0 text-emerald-500"
                      />

                      <span>
                        {motivo}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sobre a oportunidade
            </h3>

            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-400">
              {vaga.description}
            </p>
          </section>
        </div>

        <footer className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur-xl dark:border-slate-900 dark:bg-slate-950/95 lg:rounded-b-3xl">
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={
                vaga.url
              }
              target="_blank"
              rel="noreferrer"
              onClick={
                aoAbrir
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Abrir vaga

              <ArrowUpRight
                size={17}
              />
            </a>

            {!candidaturaAplicada &&
              !oportunidadeIgnorada && (
              <button
                type="button"
                disabled={
                  processando
                }
                onClick={() =>
                  aoAlterarStatus(
                    "applied"
                  )
                }
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processando ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Check
                    size={17}
                  />
                )}

                Marcar como aplicada
              </button>
            )}

            {candidaturaAplicada && (
              <button
                type="button"
                disabled={
                  processando
                }
                onClick={() =>
                  aoAlterarStatus(
                    statusRetorno
                  )
                }
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                {processando ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RotateCcw
                    size={16}
                  />
                )}

                Desfazer candidatura
              </button>
            )}

            {oportunidadeIgnorada ? (
              <button
                type="button"
                disabled={
                  processando
                }
                onClick={() =>
                  aoAlterarStatus(
                    "relevant"
                  )
                }
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                {processando ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RotateCcw
                    size={16}
                  />
                )}

                Reabrir oportunidade
              </button>
            ) : (
              !candidaturaAplicada && (
                <button
                  type="button"
                  disabled={
                    processando
                  }
                  onClick={() =>
                    aoAlterarStatus(
                      "ignored"
                    )
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 sm:col-span-2"
                >
                  <X
                    size={16}
                  />

                  Ignorar oportunidade
                </button>
              )
            )}
          </div>
        </footer>
      </div>
    </aside>
  )
}