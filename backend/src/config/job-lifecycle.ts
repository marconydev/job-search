/**
 * Política de ciclo de vida das oportunidades.
 *
 * Mantida em um único ponto para que coleta, persistência e dashboard
 * utilizem exatamente as mesmas regras.
 */
export const JOB_LIFECYCLE = {
  /**
   * Depois deste período a oportunidade deixa de ser considerada atual,
   * mesmo que alguma fonte ainda mantenha a publicação acessível.
   */
  maxAgeDays: 21,

  /**
   * A partir desta idade não basta a vaga existir no banco:
   * precisamos de uma confirmação recente da fonte.
   */
  requireConfirmationAfterDays: 15,

  /**
   * Quanto tempo uma confirmação da fonte continua sendo considerada
   * recente para oportunidades entre 15 e 21 dias.
   */
  confirmationFreshnessDays: 7
} as const
