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
              <CardTitle className="text-2xl font-display">
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
                <Button asChild>
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
