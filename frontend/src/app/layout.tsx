import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "Job Search",

  description: "Painel pessoal para acompanhamento de oportunidades e candidaturas."
}

export default function LayoutRaiz({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
