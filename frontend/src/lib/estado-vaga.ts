import type { FiltroStatus, ResumoPainel, VagaPainel } from "@/types/painel"

export type EstadoVisualVaga = "nova" | "aberta" | "vista" | "aplicada" | "ignorada"

export function vagaEstaEmAberto(vaga: VagaPainel) {
  return vaga.status === "relevant"
}

function vagaFoiVista(vaga: VagaPainel) {
  return vaga.viewed_at !== null
}

function vagaEhNova(vaga: VagaPainel) {
  return vagaEstaEmAberto(vaga) && vaga.nova_sincronizacao && !vagaFoiVista(vaga)
}

export function obterEstadoVisualVaga(vaga: VagaPainel): EstadoVisualVaga {
  if (vaga.status === "applied") {
    return "aplicada"
  }

  if (vaga.status === "ignored") {
    return "ignorada"
  }

  if (vagaFoiVista(vaga)) {
    return "vista"
  }

  return vagaEhNova(vaga) ? "nova" : "aberta"
}

export function obterRotuloEstadoVaga(vaga: VagaPainel) {
  const estado = obterEstadoVisualVaga(vaga)

  switch (estado) {
    case "nova":
      return "Nova"

    case "aberta":
      return "Em aberto"

    case "vista":
      return "Vista"

    case "aplicada":
      return "Aplicada"

    case "ignorada":
      return "Ignorada"
  }
}

export function vagaPertenceAoFiltro(vaga: VagaPainel, filtro: FiltroStatus) {
  switch (filtro) {
    case "abertas":
      return vagaEstaEmAberto(vaga)

    case "relevant":
      return vagaEhNova(vaga)

    case "viewed":
      return vagaEstaEmAberto(vaga) && vagaFoiVista(vaga)

    case "applied":
      return vaga.status === "applied"

    case "ignored":
      return vaga.status === "ignored"
  }
}

function vagaEhDeHoje(vaga: VagaPainel) {
  const data = new Date(vaga.created_at)

  if (Number.isNaN(data.getTime())) {
    return false
  }

  const hoje = new Date()

  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  )
}

export function calcularResumoPainel(vagas: VagaPainel[]): ResumoPainel {
  let novas = 0
  let vistas = 0
  let aplicadas = 0
  let ignoradas = 0
  let novasHoje = 0
  let parciais = 0
  let somaScores = 0

  for (const vaga of vagas) {
    somaScores += vaga.local_score

    if (vaga.partial) {
      parciais++
    }

    if (vaga.status === "applied") {
      aplicadas++

      continue
    }

    if (vaga.status === "ignored") {
      ignoradas++

      continue
    }

    if (vagaFoiVista(vaga)) {
      vistas++
    } else if (vagaEhNova(vaga)) {
      novas++
    }

    if (vagaEhDeHoje(vaga)) {
      novasHoje++
    }
  }

  return {
    novas,

    vistas,

    aplicadas,

    ignoradas,

    novas_hoje: novasHoje,

    parciais,

    total: vagas.length,

    pontuacao_media: vagas.length > 0 ? Math.round(somaScores / vagas.length) : 0
  }
}
