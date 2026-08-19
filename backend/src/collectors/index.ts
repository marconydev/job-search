import type { JobCollector } from "../types/collector.js"

import { gupyCollector } from "./gupy.js"

import { arbeitnowCollector } from "./arbeitnow.js"

import { jobicyCollector } from "./jobicy.js"

import { remotiveCollector } from "./remotive.js"

import { remoteOkCollector } from "./remote-ok.js"

/**
 * Estas fontes podem ser consultadas diretamente sem depender da Brave.
 *
 * A Gupy fica primeiro porque é uma das fontes brasileiras de maior
 * interesse para o perfil e agora possui coleta nativa.
 *
 * ATS baseados em empresas, como Lever e Greenhouse, continuam sendo
 * tratados separadamente porque primeiro precisamos descobrir qual
 * organização ou job board deve ser consultado.
 */
export const collectors: JobCollector[] = [
  gupyCollector,
  remotiveCollector,
  remoteOkCollector,
  jobicyCollector,
  arbeitnowCollector
]