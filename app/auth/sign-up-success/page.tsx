import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Mail, BadgeCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo01.jpg" alt="NexFinance" className="h-9 w-auto" />
            <span className="text-xl font-semibold text-foreground">
              NexFinance
            </span>
          </div>
          <Card className="glass-panel border-0">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">
                Conta criada!
              </CardTitle>
              <CardDescription>
                Verifique seu e-mail para confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
                <BadgeCheck className="mb-2 h-4 w-4" />
                Enviamos um link de confirmacao para seu e-mail. Clique no link
                para ativar sua conta e comecar a usar o NexFinance.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
