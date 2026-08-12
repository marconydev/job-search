import {
  Building2,
  ChevronRight,
  Clock3,
  House,
  MapPin,
  Sparkles
} from "lucide-react"

import type {
  VagaPainel
} from "@/types/painel"

type Propriedades = {
  vaga: VagaPainel

  selecionada: boolean

  aoSelecionar:
    () => void
}

function obterRotuloStatus(
  status:
    VagaPainel["status"]
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

function formatarData(
  valor: string | null
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
        "short"
    }
  ).format(data)
}

export function CartaoVaga({
  vaga,
  selecionada,
  aoSelecionar
}: Propriedades) {
  const data =
    formatarData(
      vaga.published_at ??
      vaga.created_at
    )

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        selecionada
          ? "border-indigo-300 bg-indigo-50/70 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      ].join(" ")}
    >
      {selecionada && (
        <div
          className="absolute inset-y-0 left-0 w-1 bg-indigo-500"
        />
      )}

      <button
        type="button"
        onClick={
          aoSelecionar
        }
        aria-pressed={
          selecionada
        }
        className="w-full cursor-pointer p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <div className="flex items-start gap-4">
          <div
            className="flex min-w-0 flex-1 flex-col"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                  vaga.status ===
                  "relevant"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : vaga.status ===
                      "viewed"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      : vaga.status ===
                        "applied"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                ].join(" ")}
              >
                {obterRotuloStatus(
                  vaga.status
                )}
              </span>

              {vaga.partial && (
                <span
                  title="Informações obtidas durante a descoberta da vaga"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  <Sparkles
                    size={12}
                  />

                  Dados parciais
                </span>
              )}
            </div>

            <h3
              className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-950 dark:text-slate-100"
            >
              {vaga.title}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Building2
                size={15}
                className="shrink-0"
              />

              <span className="truncate">
                {vaga.company}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-500">
              {vaga.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin
                    size={13}
                  />

                  {vaga.location}
                </span>
              )}

              {vaga.remote && (
                <span className="inline-flex items-center gap-1.5">
                  <House
                    size={13}
                  />

                  Remota
                </span>
              )}

              {data && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3
                    size={13}
                  />

                  {data}
                </span>
              )}
            </div>

            {vaga.matched_skills.length >
              0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {vaga.matched_skills
                  .slice(
                    0,
                    4
                  )
                  .map(
                    (
                      competencia
                    ) => (
                      <span
                        key={
                          competencia
                        }
                        className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                      >
                        {competencia}
                      </span>
                    )
                  )}

                {vaga
                  .matched_skills
                  .length >
                  4 && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-500">
                    +
                    {vaga
                      .matched_skills
                      .length -
                      4}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-4">
            <div
              className={[
                "flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-bold tabular-nums",
                vaga.local_score >=
                85
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : vaga.local_score >=
                    75
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
              ].join(" ")}
              title="Compatibilidade com seu perfil"
            >
              {vaga.local_score}%
            </div>

            <ChevronRight
              size={18}
              className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-700"
            />
          </div>
        </div>
      </button>
    </article>
  )
}