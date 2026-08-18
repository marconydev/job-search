import { randomUUID } from "node:crypto"

import {
  atualizarHeartbeatSincronizacao,
  concluirSincronizacao,
  falharSincronizacao,
  obterEstadoSincronizacao,
  tentarIniciarSincronizacao
} from "../repositories/estado-sincronizacao-repository.js"

import type {
  EstadoSincronizacao,
  ModoExecucaoSincronizacao
} from "../repositories/estado-sincronizacao-repository.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

import { syncJobs, type EtapaSincronizacao } from "./job-sync.js"

type OpcoesSincronizacaoAssincrona = {
  usarBrave: boolean

  limiteChamadasBrave: number
}

export type ResultadoInicioSincronizacao = {
  iniciada: boolean

  execucao: EstadoSincronizacao
}

const INTERVALO_HEARTBEAT_MS = 20 * 1000

/**
 * Além das mudanças de etapa, eu atualizo periodicamente o heartbeat.
 *
 * Se o processo do Render for encerrado, essa atualização para. Assim o
 * PostgreSQL consegue distinguir uma execução lenta de uma execução que
 * realmente morreu.
 */
function iniciarHeartbeat(execucaoId: string) {
  let atualizando = false

  const temporizador = setInterval(() => {
    if (atualizando) {
      return
    }

    atualizando = true

    void atualizarHeartbeatSincronizacao(execucaoId)
      .catch(erro => {
        console.error("Erro ao atualizar heartbeat da sincronização:", erro)
      })
      .finally(() => {
        atualizando = false
      })
  }, INTERVALO_HEARTBEAT_MS)

  return temporizador
}

async function atualizarEtapa(execucaoId: string, etapa: EtapaSincronizacao) {
  await atualizarHeartbeatSincronizacao(execucaoId, etapa)
}

/**
 * Esta função executa o trabalho depois que a requisição HTTP já recebeu
 * a confirmação de início.
 *
 * Qualquer falha é registrada no PostgreSQL e nos logs do servidor.
 */
async function executarSincronizacao(
  execucaoId: string,
  perfil: PerfilProfissional,
  limiteImportacao: number,
  opcoes: OpcoesSincronizacaoAssincrona
) {
  const heartbeat = iniciarHeartbeat(execucaoId)

  try {
    const resultado = await syncJobs(perfil, limiteImportacao, {
      usarBrave: opcoes.usarBrave,

      limiteChamadasBrave: opcoes.limiteChamadasBrave,

      aoAtualizarEtapa: etapa => atualizarEtapa(execucaoId, etapa)
    })

    await concluirSincronizacao(execucaoId, resultado)

    console.log("")
    console.log(`Sincronização ${execucaoId} concluída.`)
  } catch (erro) {
    console.error(`Erro na sincronização ${execucaoId}:`, erro)

    const detalhe = erro instanceof Error ? erro.message : "Erro desconhecido"

    try {
      await falharSincronizacao(execucaoId, `A sincronização não foi concluída: ${detalhe}`)
    } catch (erroRegistro) {
      console.error("Não foi possível registrar a falha da sincronização:", erroRegistro)
    }
  } finally {
    clearInterval(heartbeat)
  }
}

/**
 * Eu adquiro a trava no PostgreSQL antes de iniciar qualquer coleta.
 *
 * Se já houver uma execução ativa, devolvo o estado dela e não crio uma
 * segunda sincronização concorrente.
 */
export async function iniciarSincronizacaoAssincrona(
  perfil: PerfilProfissional,
  limiteImportacao: number,
  opcoes: OpcoesSincronizacaoAssincrona
): Promise<ResultadoInicioSincronizacao> {
  const execucaoId = randomUUID()

  const modo: ModoExecucaoSincronizacao = opcoes.usarBrave ? "brave" : "economico"

  const execucao = await tentarIniciarSincronizacao(execucaoId, modo)

  if (!execucao) {
    return {
      iniciada: false,

      execucao: await obterEstadoSincronizacao()
    }
  }

  /**
   * setImmediate deixa a resposta HTTP ser concluída antes do trabalho
   * pesado começar.
   */
  setImmediate(() => {
    void executarSincronizacao(execucaoId, perfil, limiteImportacao, opcoes)
  })

  return {
    iniciada: true,

    execucao
  }
}
