import type { JobCollector } from "../types/collector.js"

import { arbeitnowCollector } from "./arbeitnow.js"

import { jobicyCollector } from "./jobicy.js"

import { remotiveCollector } from "./remotive.js"

import { remoteOkCollector } from "./remote-ok.js"

/**
 * Estas fontes podem ser consultadas diretamente sem depender da Brave.
 *
 * ATS baseados em empresas, como Lever e Greenhouse, serão adicionados
 * separadamente porque primeiro precisamos descobrir qual organização
 * ou job board deve ser consultado.
 */
export const collectors: JobCollector[] = [
  remotiveCollector,
  remoteOkCollector,
  jobicyCollector,
  arbeitnowCollector
]
