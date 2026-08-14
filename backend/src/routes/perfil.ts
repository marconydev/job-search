import {
  Router
} from "express"

import multer from "multer"

import {
  reanalisarTodasAsVagas
} from "../services/job-analysis.js"

import {
  analisarCurriculo
} from "../services/analisador-curriculo.js"

import {
  arquivoCurriculoEhPermitido,
  extrairTextoCurriculo
} from "../services/leitor-curriculo.js"

import {
  obterPerfilProfissional,
  salvarPerfilProfissional
} from "../services/perfil-profissional-service.js"

const perfilRouter =
  Router()

/**
 * Eu mantenho o currículo somente em memória durante a importação.
 *
 * O arquivo não é salvo fisicamente no servidor porque preciso apenas
 * extrair seu texto e gerar sugestões para o meu perfil profissional.
 */
const uploadCurriculo =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      /**
       * Limito o currículo a 5 MB para evitar uploads desnecessariamente
       * grandes nesta aplicação.
       */
      fileSize:
        5 * 1024 * 1024,

      files:
        1
    },

    fileFilter: (
      _request,
      file,
      callback
    ) => {
      if (
        arquivoCurriculoEhPermitido(
          file.originalname
        )
      ) {
        callback(
          null,
          true
        )

        return
      }

      callback(
        new Error(
          "Envie um currículo em PDF, DOCX ou TXT."
        )
      )
    }
  })

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
            "Não foi possível carregar o perfil profissional."
        })
    }
  }
)

/**
 * Eu recebo um currículo somente para análise.
 *
 * Esta rota:
 *
 * - não altera o perfil;
 * - não salva o currículo;
 * - não reanalisa vagas;
 * - não utiliza Brave;
 * - não realiza nenhuma candidatura.
 *
 * Ela apenas devolve informações que consegui identificar para que eu
 * possa revisar antes de aplicar ao meu perfil.
 */
perfilRouter.post(
  "/importar",

  uploadCurriculo.single(
    "arquivo"
  ),

  async (
    request,
    response
  ) => {
    try {
      if (
        !request.file
      ) {
        return response
          .status(400)
          .json({
            message:
              "Selecione um currículo para importar."
          })
      }

      /**
       * Utilizo o perfil atual porque as competências já cadastradas
       * ajudam o analisador a reconhecer tecnologias e conhecimentos
       * encontrados dentro do currículo.
       */
      const dadosPerfil =
        await obterPerfilProfissional()

      const texto =
        await extrairTextoCurriculo(
          request.file
        )

      const resultado =
        analisarCurriculo(
          {
            nome:
              request.file.originalname,

            tipo:
              request.file.mimetype,

            tamanho:
              request.file.size
          },

          texto,

          dadosPerfil.perfil
        )

      return response.json(
        resultado
      )
    } catch (error) {
      console.error(
        "Erro ao importar currículo:",
        error
      )

      return response
        .status(400)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível analisar o currículo."
        })
    }
  }
)

/**
 * Eu salvo o perfil completo porque a interface funciona como um editor
 * único das minhas informações profissionais.
 *
 * Depois de salvar, recalculo as vagas que já estão no PostgreSQL para
 * que mudanças de cargos, competências, experiências, formação e cursos
 * possam refletir no score.
 *
 * Esta reanálise não executa pesquisas na Brave.
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
       * O perfil já foi salvo neste ponto.
       *
       * Por isso trato a reanálise separadamente. Se houver uma falha na
       * atualização dos scores, não quero informar incorretamente que o
       * perfil deixou de ser salvo.
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
              : "Perfil profissional inválido."
        })
    }
  }
)

export {
  perfilRouter
}