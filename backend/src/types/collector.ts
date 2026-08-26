import type { NewJob } from "./job.js"

import type { PerfilProfissional } from "./perfil-profissional.js"

export type JobCollection = {
  source: string

  jobs: NewJob[]

  /**
   * Identifica uma origem específica dentro de um provedor.
   *
   * Exemplo:
   * ats:lever:global:jobgether
   *
   * Isso permite diferenciar dois boards Lever sem alterar o campo
   * source utilizado pelo restante do sistema.
   */
  sourceKey?: string

  /**
   * Indica que o coletor conseguiu percorrer a lista inteira daquela
   * origem nesta execução.
   *
   * Somente uma coleta comprovadamente completa pode ser usada para
   * concluir que uma vaga desapareceu do board.
   */
  complete?: boolean
}

/**
 * O perfil é opcional para manter compatibilidade com os coletores
 * antigos, que não precisam conhecer os cargos buscados.
 *
 * Coletores de portais agregadores, como Gupy, podem usar o perfil
 * para executar buscas equivalentes às que o usuário faria
 * manualmente no portal.
 */
export type JobCollector = {
  name: string

  collect: (limit?: number, perfil?: PerfilProfissional) => Promise<JobCollection>
}
