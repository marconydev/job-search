import { perfilBusca } from "./search-profile.js"

import type { PerfilProfissional } from "../types/perfil-profissional.js"

/**
 * O search-profile continua sendo o fallback inicial da aplicação.
 *
 * Centralizo a montagem do perfil completo aqui para evitar manter
 * versões diferentes do mesmo fallback em vários serviços.
 */
export function criarPerfilProfissionalPadrao(): PerfilProfissional {
  return {
    resumoProfissional: "",

    cargosPrincipais: [...perfilBusca.cargosPrincipais],

    cargosRelacionados: [...perfilBusca.cargosRelacionados],

    cargosDesvio: [...perfilBusca.cargosDesvio],

    competencias: perfilBusca.competencias.map(competencia => ({
      nome: competencia.nome,
      termos: [...competencia.termos]
    })),

    experiencias: [],

    formacoes: [],

    cursos: [],

    localizacoesAceitas: [...perfilBusca.localizacoesAceitas],

    titulosExcluidos: [...perfilBusca.titulosExcluidos]
  }
}
