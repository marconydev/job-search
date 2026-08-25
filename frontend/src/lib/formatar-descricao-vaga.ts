function decodificarEntidadesHtml(valor: string) {
  return valor
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_texto, codigo) => String.fromCharCode(Number(codigo)))
}

function contemHtml(valor: string) {
  return /<\/?[a-z][^>]*>/i.test(valor)
}

/**
 * Converte HTML vindo dos portais em texto estruturado seguro.
 *
 * Não uso dangerouslySetInnerHTML porque a descrição vem de fontes
 * externas.
 *
 * Descrições que já chegam como texto permanecem praticamente
 * inalteradas.
 */
export function formatarDescricaoVaga(descricao: string) {
  const valor = descricao.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

  if (!contemHtml(valor)) {
    return valor.trim()
  }

  const texto = valor
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|ul|ol)>/gi, "\n\n")
    .replace(/<(p|div|section|article|h1|h2|h3|h4|h5|h6|ul|ol)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")

  return decodificarEntidadesHtml(texto)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
