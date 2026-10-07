import type { Metadata } from "next"
import Link from "next/link"
import { ContactLink, LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Excluir conta — NexFinance",
  description: "Como excluir sua conta do NexFinance e todos os seus dados.",
}

export default function DeleteAccountPage() {
  return (
    <LegalPage title="Excluir sua conta" updatedAt="7 de outubro de 2026">
      <p>
        Você pode excluir sua conta do NexFinance a qualquer momento. A exclusão apaga todos os seus dados e não pode ser
        desfeita.
      </p>

      <LegalSection title="Pelo app">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Abra o NexFinance e toque em <strong>Menu</strong>, no topo da tela.
          </li>
          <li>
            Entre em <strong>Perfil</strong> e toque em <strong>Excluir conta</strong>.
          </li>
          <li>
            Digite <strong>DELETAR</strong> e confirme em <strong>Excluir permanentemente</strong>.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Pelo site">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/auth/login" className="font-medium text-primary underline underline-offset-4">
              Entre na sua conta
            </Link>{" "}
            e abra <strong>Perfil</strong>.
          </li>
          <li>
            Clique em <strong>Excluir conta</strong>, digite <strong>DELETAR</strong> e confirme.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="Sem acesso à conta">
        <p>
          Envie um e-mail para <ContactLink /> a partir do endereço cadastrado, com o assunto “Excluir conta NexFinance”. A
          conta é excluída em até 15 dias e você recebe a confirmação por e-mail.
        </p>
      </LegalSection>

      <LegalSection title="O que é apagado">
        <p>
          Tudo: login, apelido, lançamentos, contas a pagar, orçamentos, metas, reservas e investimentos, categorias,
          saldos, histórico de importações e de alterações, e todos os comprovantes anexados. Nada fica guardado depois da
          exclusão.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
