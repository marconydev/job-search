import {
  Router
} from "express"

import {
  reanalisarTodasAsVagas
} from "../services/job-analysis.js"

import {
  obterPerfilProfissional,
  salvarPerfilProfissional
} from "../services/perfil-profissional-service.js"

const perfilRouter =
  Router()

/**
 * Eu retorno o perfil atualmente utilizado pela aplicação.
 */
perfilRouter.get(
  "/",
  async (
    _request,
    response
  ) => {
    try {
      const dados =
        await obterPerfilProfissional()

      return response.json(
        dados
      )
    } catch (error) {
      console.error(
        "Erro ao carregar perfil profissional:",
        error
      )

      return response
        .status(500)
        .json({
          message:
            "Não foi possível carregar o perfil profissional"
        })
    }
  }
)

/**
 * Eu salvo o perfil e em seguida recalculo as oportunidades existentes.
 *
 * Essa reanálise utiliza apenas os dados já armazenados no PostgreSQL e
 * não executa nenhuma pesquisa na Brave.
 */
perfilRouter.put(
  "/",
  async (
    request,
    response
  ) => {
    try {
      const salvo =
        await salvarPerfilProfissional(
          request.body
        )

      /**
       * O perfil já está salvo neste ponto.
       *
       * Se ocorrer algum problema durante a reanálise eu não retorno um
       * falso erro de salvamento, porque isso faria a interface acreditar
       * que o perfil não foi gravado.
       */
      try {
        const reanalise =
          await reanalisarTodasAsVagas()

        return response.json({
          ...salvo,

          reanalise: {
            concluida:
              true,

            analisadas:
              reanalise.analyzed,

            relevantes:
              reanalise.relevant,

            descartadas:
              reanalise.discarded
          }
        })
      } catch (error) {
        console.error(
          "Perfil salvo, mas ocorreu erro durante a reanálise das vagas:",
          error
        )

        return response.json({
          ...salvo,

          reanalise: {
            concluida:
              false,

            analisadas:
              0,

            relevantes:
              0,

            descartadas:
              0
          }
        })
      }
    } catch (error) {
      console.error(
        "Erro ao salvar perfil profissional:",
        error
      )

      return response
        .status(400)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Perfil profissional inválido"
        })
    }
  }
)

export {
  perfilRouter
}