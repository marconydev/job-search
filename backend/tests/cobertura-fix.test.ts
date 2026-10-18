import { describe, it, expect } from "vitest"
import { avaliarElegibilidadeBrasil } from "../src/services/elegibilidade-localizacao.js"
import { identificarFonteAtsDaPagina } from "../src/services/fontes-ats.js"

describe("Correcoes de Cobertura", () => {
  describe("Fallback Geografico Nacional", () => {
    it("assume Brasil para Gupy/Solides sem localizacao", () => {
      const r = avaliarElegibilidadeBrasil(null, "vaga top", "analista", false, [], "unknown", "gupy")
      expect(r.situacao).toBe("compativel")
    })
  })

  describe("Identificacao Gupy Subdominio", () => {
    it("reconhece attus.gupy.io como fonte ATS", () => {
      const pagina = { url: "https://attus.gupy.io/job/123", provedor: "desconhecido" as any, titulo: "x" }
      const fonte = identificarFonteAtsDaPagina(pagina)
      expect(fonte).not.toBeNull()
      expect(fonte?.provedor).toBe("gupy")
      expect(fonte?.identificador).toBe("attus")
    })
  })
})