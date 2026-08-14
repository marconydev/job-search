"use client"

import {
  useState
} from "react"

import {
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wrench
} from "lucide-react"

import type {
  CursoProfissional,
  ExperienciaProfissional,
  FormacaoProfissional,
  PerfilProfissional,
  PerfilProfissionalComMetadados
} from "@/types/perfil"

type Propriedades = {
  dadosIniciais:
    PerfilProfissionalComMetadados
}

type CompetenciaEditavel = {
  nome: string

  termosTexto: string
}

type ListasTexto = {
  cargosPrincipais: string

  cargosRelacionados: string

  cargosDesvio: string

  localizacoesAceitas: string

  titulosExcluidos: string
}

function listaParaTexto(
  valores:
    string[]
) {
  return valores.join(
    "\n"
  )
}

function textoParaLista(
  valor:
    string
) {
  return [
    ...new Set(
      valor
        .split(/\r?\n/)
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)
    )
  ]
}

function termosParaTexto(
  termos:
    string[]
) {
  return termos.join(
    ", "
  )
}

function textoParaTermos(
  valor:
    string
) {
  return [
    ...new Set(
      valor
        .split(/[,\n]/)
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)
    )
  ]
}

function formatarData(
  valor:
    string | null
) {
  if (!valor) {
    return "Ainda não salvo"
  }

  const data =
    new Date(valor)

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "Data não disponível"
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short"
    }
  ).format(
    data
  )
}

export function EditorPerfil({
  dadosIniciais
}: Propriedades) {
  const [
    perfil,
    setPerfil
  ] =
    useState<
      PerfilProfissional
    >(
      dadosIniciais.perfil
    )

  const [
    competencias,
    setCompetencias
  ] =
    useState<
      CompetenciaEditavel[]
    >(
      dadosIniciais
        .perfil
        .competencias
        .map(
          competencia => ({
            nome:
              competencia.nome,

            termosTexto:
              termosParaTexto(
                competencia.termos
              )
          })
        )
    )

  const [
    listasTexto,
    setListasTexto
  ] =
    useState<ListasTexto>({
      cargosPrincipais:
        listaParaTexto(
          dadosIniciais
            .perfil
            .cargosPrincipais
        ),

      cargosRelacionados:
        listaParaTexto(
          dadosIniciais
            .perfil
            .cargosRelacionados
        ),

      cargosDesvio:
        listaParaTexto(
          dadosIniciais
            .perfil
            .cargosDesvio
        ),

      localizacoesAceitas:
        listaParaTexto(
          dadosIniciais
            .perfil
            .localizacoesAceitas
        ),

      titulosExcluidos:
        listaParaTexto(
          dadosIniciais
            .perfil
            .titulosExcluidos
        )
    })

  const [
    salvando,
    setSalvando
  ] =
    useState(false)

  const [
    mensagem,
    setMensagem
  ] =
    useState<
      string | null
    >(
      null
    )

  const [
    erro,
    setErro
  ] =
    useState<
      string | null
    >(
      null
    )

  const [
    atualizadoEm,
    setAtualizadoEm
  ] =
    useState<
      string | null
    >(
      dadosIniciais
        .atualizadoEm
    )

  function alterarListaTexto(
    campo:
      keyof ListasTexto,

    valor:
      string
  ) {
    setListasTexto(
      atual => ({
        ...atual,

        [campo]:
          valor
      })
    )
  }

  function adicionarCompetencia() {
    setCompetencias(
      atuais => [
        ...atuais,

        {
          nome:
            "",

          termosTexto:
            ""
        }
      ]
    )
  }

  function alterarNomeCompetencia(
    indice:
      number,

    valor:
      string
  ) {
    setCompetencias(
      atuais =>
        atuais.map(
          (
            competencia,
            posicao
          ) =>
            posicao ===
            indice
              ? {
                  ...competencia,

                  nome:
                    valor
                }
              : competencia
        )
    )
  }

  function alterarTermosCompetencia(
    indice:
      number,

    valor:
      string
  ) {
    setCompetencias(
      atuais =>
        atuais.map(
          (
            competencia,
            posicao
          ) =>
            posicao ===
            indice
              ? {
                  ...competencia,

                  termosTexto:
                    valor
                }
              : competencia
        )
    )
  }

  function removerCompetencia(
    indice:
      number
  ) {
    setCompetencias(
      atuais =>
        atuais.filter(
          (
            _competencia,
            posicao
          ) =>
            posicao !==
            indice
        )
    )
  }

  function adicionarExperiencia() {
    setPerfil(
      atual => ({
        ...atual,

        experiencias: [
          ...atual.experiencias,

          {
            empresa:
              "",

            cargo:
              "",

            periodo:
              "",

            descricao:
              ""
          }
        ]
      })
    )
  }

  function alterarExperiencia(
    indice:
      number,

    campo:
      keyof ExperienciaProfissional,

    valor:
      string
  ) {
    setPerfil(
      atual => ({
        ...atual,

        experiencias:
          atual
            .experiencias
            .map(
              (
                experiencia,
                posicao
              ) =>
                posicao ===
                indice
                  ? {
                      ...experiencia,

                      [campo]:
                        valor
                    }
                  : experiencia
            )
      })
    )
  }

  function removerExperiencia(
    indice:
      number
  ) {
    setPerfil(
      atual => ({
        ...atual,

        experiencias:
          atual
            .experiencias
            .filter(
              (
                _experiencia,
                posicao
              ) =>
                posicao !==
                indice
            )
      })
    )
  }

  function adicionarFormacao() {
    setPerfil(
      atual => ({
        ...atual,

        formacoes: [
          ...atual.formacoes,

          {
            instituicao:
              "",

            curso:
              "",

            nivel:
              "",

            periodo:
              ""
          }
        ]
      })
    )
  }

  function alterarFormacao(
    indice:
      number,

    campo:
      keyof FormacaoProfissional,

    valor:
      string
  ) {
    setPerfil(
      atual => ({
        ...atual,

        formacoes:
          atual
            .formacoes
            .map(
              (
                formacao,
                posicao
              ) =>
                posicao ===
                indice
                  ? {
                      ...formacao,

                      [campo]:
                        valor
                    }
                  : formacao
            )
      })
    )
  }

  function removerFormacao(
    indice:
      number
  ) {
    setPerfil(
      atual => ({
        ...atual,

        formacoes:
          atual
            .formacoes
            .filter(
              (
                _formacao,
                posicao
              ) =>
                posicao !==
                indice
            )
      })
    )
  }

  function adicionarCurso() {
    setPerfil(
      atual => ({
        ...atual,

        cursos: [
          ...atual.cursos,

          {
            nome:
              "",

            instituicao:
              "",

            ano:
              ""
          }
        ]
      })
    )
  }

  function alterarCurso(
    indice:
      number,

    campo:
      keyof CursoProfissional,

    valor:
      string
  ) {
    setPerfil(
      atual => ({
        ...atual,

        cursos:
          atual
            .cursos
            .map(
              (
                curso,
                posicao
              ) =>
                posicao ===
                indice
                  ? {
                      ...curso,

                      [campo]:
                        valor
                    }
                  : curso
            )
      })
    )
  }

  function removerCurso(
    indice:
      number
  ) {
    setPerfil(
      atual => ({
        ...atual,

        cursos:
          atual
            .cursos
            .filter(
              (
                _curso,
                posicao
              ) =>
                posicao !==
                indice
            )
      })
    )
  }

  function montarPerfilParaSalvar():
    PerfilProfissional {
    return {
      ...perfil,

      cargosPrincipais:
        textoParaLista(
          listasTexto
            .cargosPrincipais
        ),

      cargosRelacionados:
        textoParaLista(
          listasTexto
            .cargosRelacionados
        ),

      cargosDesvio:
        textoParaLista(
          listasTexto
            .cargosDesvio
        ),

      localizacoesAceitas:
        textoParaLista(
          listasTexto
            .localizacoesAceitas
        ),

      titulosExcluidos:
        textoParaLista(
          listasTexto
            .titulosExcluidos
        ),

      competencias:
        competencias
          .map(
            competencia => ({
              nome:
                competencia
                  .nome
                  .trim(),

              termos:
                textoParaTermos(
                  competencia
                    .termosTexto
                )
            })
          )
          .filter(
            competencia =>
              Boolean(
                competencia.nome
              )
          )
    }
  }

  async function salvarPerfil() {
    setSalvando(
      true
    )

    setMensagem(
      null
    )

    setErro(
      null
    )

    try {
      const perfilParaSalvar =
        montarPerfilParaSalvar()

      const resposta =
        await fetch(
          "/api/perfil",
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                perfilParaSalvar
              )
          }
        )

      const retorno =
        await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          retorno.mensagem ??
          "Não foi possível salvar o perfil."
        )
      }

      setPerfil(
        retorno.perfil
      )

      setAtualizadoEm(
        retorno.atualizadoEm ??
        new Date()
          .toISOString()
      )

      setMensagem(
        "Perfil salvo com sucesso."
      )
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o perfil."
      )
    } finally {
      setSalvando(
        false
      )
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <UserRound
              size={20}
            />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Resumo profissional
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Descreva de forma curta sua experiência e objetivo profissional.
            </p>
          </div>
        </div>

        <textarea
          value={
            perfil
              .resumoProfissional
          }
          onChange={
            evento =>
              setPerfil(
                atual => ({
                  ...atual,

                  resumoProfissional:
                    evento
                      .target
                      .value
                })
              )
          }
          rows={6}
          placeholder="Ex.: Profissional de TI com experiência em suporte, sistemas hospitalares, infraestrutura, análise de incidentes..."
          className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-950"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <BriefcaseBusiness
              size={20}
            />
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Cargos buscados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Coloque um cargo por linha. Os cargos principais recebem maior peso no matcher.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cargos principais
            </label>

            <textarea
              value={
                listasTexto
                  .cargosPrincipais
              }
              onChange={
                evento =>
                  alterarListaTexto(
                    "cargosPrincipais",
                    evento
                      .target
                      .value
                  )
              }
              rows={12}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Cargos relacionados
            </label>

            <textarea
              value={
                listasTexto
                  .cargosRelacionados
              }
              onChange={
                evento =>
                  alterarListaTexto(
                    "cargosRelacionados",
                    evento
                      .target
                      .value
                  )
              }
              rows={12}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <Wrench
                size={20}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Competências e tecnologias
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Os termos ajudam o sistema a reconhecer diferentes formas de escrever a mesma competência.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              adicionarCompetencia
            }
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus
              size={16}
            />

            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {competencias.map(
            (
              competencia,
              indice
            ) => (
              <div
                key={
                  indice
                }
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[minmax(180px,0.35fr)_1fr_auto]"
              >
                <input
                  value={
                    competencia.nome
                  }
                  onChange={
                    evento =>
                      alterarNomeCompetencia(
                        indice,
                        evento
                          .target
                          .value
                      )
                  }
                  placeholder="Competência"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
                />

                <input
                  value={
                    competencia
                      .termosTexto
                  }
                  onChange={
                    evento =>
                      alterarTermosCompetencia(
                        indice,
                        evento
                          .target
                          .value
                      )
                  }
                  placeholder="Termos relacionados separados por vírgula"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950"
                />

                <button
                  type="button"
                  onClick={() =>
                    removerCompetencia(
                      indice
                    )
                  }
                  aria-label="Remover competência"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                >
                  <Trash2
                    size={17}
                  />
                </button>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <BriefcaseBusiness
                size={20}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Experiência profissional
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Registre suas experiências reais. Elas serão especialmente úteis quando adicionarmos a análise contextual.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              adicionarExperiencia
            }
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Plus
              size={16}
            />

            Adicionar experiência
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {perfil
            .experiencias
            .map(
              (
                experiencia,
                indice
              ) => (
                <div
                  key={
                    indice
                  }
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={
                        experiencia.empresa
                      }
                      onChange={
                        evento =>
                          alterarExperiencia(
                            indice,
                            "empresa",
                            evento.target.value
                          )
                      }
                      placeholder="Empresa"
                      className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                    />

                    <input
                      value={
                        experiencia.cargo
                      }
                      onChange={
                        evento =>
                          alterarExperiencia(
                            indice,
                            "cargo",
                            evento.target.value
                          )
                      }
                      placeholder="Cargo"
                      className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                    />

                    <input
                      value={
                        experiencia.periodo
                      }
                      onChange={
                        evento =>
                          alterarExperiencia(
                            indice,
                            "periodo",
                            evento.target.value
                          )
                      }
                      placeholder="Período — ex.: 2024 a 2026"
                      className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 md:col-span-2"
                    />
                  </div>

                  <textarea
                    value={
                      experiencia.descricao
                    }
                    onChange={
                      evento =>
                        alterarExperiencia(
                          indice,
                          "descricao",
                          evento.target.value
                        )
                    }
                    rows={5}
                    placeholder="Principais responsabilidades, projetos e resultados..."
                    className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        removerExperiencia(
                          indice
                        )
                      }
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2
                        size={14}
                      />

                      Remover
                    </button>
                  </div>
                </div>
              )
            )}

          {perfil.experiencias.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhuma experiência cadastrada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <GraduationCap
                size={20}
              />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Formação acadêmica
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={
              adicionarFormacao
            }
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold"
          >
            <Plus
              size={16}
            />

            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {perfil.formacoes.map(
            (
              formacao,
              indice
            ) => (
              <div
                key={
                  indice
                }
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-2"
              >
                <input
                  value={
                    formacao.instituicao
                  }
                  onChange={
                    evento =>
                      alterarFormacao(
                        indice,
                        "instituicao",
                        evento.target.value
                      )
                  }
                  placeholder="Instituição"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={
                    formacao.curso
                  }
                  onChange={
                    evento =>
                      alterarFormacao(
                        indice,
                        "curso",
                        evento.target.value
                      )
                  }
                  placeholder="Curso"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={
                    formacao.nivel
                  }
                  onChange={
                    evento =>
                      alterarFormacao(
                        indice,
                        "nivel",
                        evento.target.value
                      )
                  }
                  placeholder="Nível — Graduação, Especialização..."
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <div className="flex gap-2">
                  <input
                    value={
                      formacao.periodo
                    }
                    onChange={
                      evento =>
                        alterarFormacao(
                          indice,
                          "periodo",
                          evento.target.value
                        )
                    }
                    placeholder="Período"
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removerFormacao(
                        indice
                      )
                    }
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Cursos e certificações
            </h2>
          </div>

          <button
            type="button"
            onClick={
              adicionarCurso
            }
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold"
          >
            <Plus
              size={16}
            />

            Adicionar
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {perfil.cursos.map(
            (
              curso,
              indice
            ) => (
              <div
                key={
                  indice
                }
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-[1fr_1fr_140px_auto]"
              >
                <input
                  value={
                    curso.nome
                  }
                  onChange={
                    evento =>
                      alterarCurso(
                        indice,
                        "nome",
                        evento.target.value
                      )
                  }
                  placeholder="Curso ou certificação"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={
                    curso.instituicao
                  }
                  onChange={
                    evento =>
                      alterarCurso(
                        indice,
                        "instituicao",
                        evento.target.value
                      )
                  }
                  placeholder="Instituição"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <input
                  value={
                    curso.ano
                  }
                  onChange={
                    evento =>
                      alterarCurso(
                        indice,
                        "ano",
                        evento.target.value
                      )
                  }
                  placeholder="Ano"
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                />

                <button
                  type="button"
                  onClick={() =>
                    removerCurso(
                      indice
                    )
                  }
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2
                    size={16}
                  />
                </button>
              </div>
            )
          )}
        </div>
      </section>

      <details className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-6">
          <SlidersHorizontal
            size={19}
            className="text-slate-500"
          />

          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configurações avançadas do matcher
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Cargos de desvio, localizações aceitas e títulos excluídos.
            </div>
          </div>
        </summary>

        <div className="grid gap-5 border-t border-slate-100 p-6 dark:border-slate-900 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Cargos de outra trilha
            </label>

            <textarea
              value={
                listasTexto
                  .cargosDesvio
              }
              onChange={
                evento =>
                  alterarListaTexto(
                    "cargosDesvio",
                    evento.target.value
                  )
              }
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Localizações aceitas
            </label>

            <textarea
              value={
                listasTexto
                  .localizacoesAceitas
              }
              onChange={
                evento =>
                  alterarListaTexto(
                    "localizacoesAceitas",
                    evento.target.value
                  )
              }
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Títulos excluídos
            </label>

            <textarea
              value={
                listasTexto
                  .titulosExcluidos
              }
              onChange={
                evento =>
                  alterarListaTexto(
                    "titulosExcluidos",
                    evento.target.value
                  )
              }
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        </div>
      </details>

      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {mensagem && (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2
                  size={17}
                />

                {mensagem}
              </div>
            )}

            {erro && (
              <div className="text-sm font-medium text-rose-600">
                {erro}
              </div>
            )}

            {!mensagem &&
              !erro && (
              <div className="text-xs text-slate-500">
                Última atualização:{" "}
                {formatarData(
                  atualizadoEm
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={
              salvando
            }
            onClick={
              salvarPerfil
            }
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save
                size={17}
              />
            )}

            {salvando
              ? "Salvando..."
              : "Salvar perfil"}
          </button>
        </div>
      </div>
    </div>
  )
}