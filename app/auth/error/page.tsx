import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10 sm:items-center sm:px-6 sm:py-12">
      <div className="w-full max-w-sm">
        <Card className="shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Erro de autenticacao
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground">
              {params?.error || "Ocorreu um erro inesperado."}
            </p>
            <Button asChild className="h-11 w-full">
              <Link href="/auth/login">Voltar ao login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
