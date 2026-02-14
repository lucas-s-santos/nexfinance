import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10 sm:items-center sm:px-6 sm:py-12">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/logo01.jpg"
              alt="NexFinance"
              className="h-8 w-auto sm:h-9"
            />
            <span className="text-lg font-semibold text-foreground sm:text-xl">
              NexFinance
            </span>
          </div>
          <Card className="glass-panel border-0 shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display sm:text-3xl">
                Conta criada!
              </CardTitle>
              <CardDescription>
                Sua conta ja esta pronta para uso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                <BadgeCheck className="mb-2 h-4 w-4" />
                Voce pode entrar agora mesmo e comecar a usar o NexFinance.
              </div>
              <div className="mt-4 flex justify-center">
                <Button asChild className="h-11 px-6">
                  <Link href="/auth/login">Entrar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
