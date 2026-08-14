import {
  Router
} from "express"

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
 * Eu salvo o perfil completo porque a interface trabalhará como um
 * editor único das informações profissionais.
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

      return response.json(
        salvo
      )
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