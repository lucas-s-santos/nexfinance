import type { Metadata } from "next"
import Link from "next/link"
import { ContactLink, LegalPage, LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Política de privacidade — NexFinance",
  description: "Quais dados o NexFinance guarda, para que servem e como apagar tudo.",
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updatedAt="7 de outubro de 2026">
      <p>
        Esta política vale para o aplicativo NexFinance para Android e para o site nexfinance-ten.vercel.app. Ela
        explica quais dados ficam guardados, para que servem e como você pode apagá-los. Dúvidas ou pedidos:{" "}
        <ContactLink />.
      </p>

      <LegalSection title="Dados que guardamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Conta:</strong> seu e-mail, sua senha (guardada cifrada pelo serviço de login, nunca em texto puro) e
            o apelido que você escolher.
          </li>
          <li>
            <strong>Suas finanças:</strong> o que você cadastra ou importa — receitas, despesas, contas a pagar,
            orçamentos, metas, reservas e investimentos, categorias, saldos e lançamentos recorrentes.
          </li>
          <li>
            <strong>Comprovantes:</strong> fotos ou PDFs que você anexa a um lançamento. O app só usa a câmera ou a
            galeria quando você toca para anexar.
          </li>
          <li>
            <strong>Histórico de alterações:</strong> o registro do que foi criado, alterado ou apagado na sua conta, para
            você conferir e desfazer importações.
          </li>
          <li>
            <strong>No seu aparelho:</strong> a sessão de login, no armazenamento seguro do sistema, e preferências como o
            tema claro ou escuro.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Extratos importados">
        <p>
          Arquivos OFX e CSV são lidos no seu aparelho ou navegador. Arquivos PDF são enviados ao nosso servidor só para
          extrair o texto e são apagados logo depois da leitura. Da importação ficam guardados apenas os lançamentos que
          você confirmar e o nome do arquivo, no histórico de importações.
        </p>
      </LegalSection>

      <LegalSection title="O que não fazemos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Não pedimos senha de banco nem nos conectamos à sua conta bancária. O NexFinance não movimenta dinheiro.</li>
          <li>Não coletamos localização, contatos nem identificadores de publicidade.</li>
          <li>Não exibimos anúncios, não usamos ferramentas de rastreamento e não vendemos nem compartilhamos seus dados.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Para que usamos">
        <p>
          Só para o NexFinance funcionar: mostrar seus lançamentos, relatórios, gráficos, alertas de orçamento e metas, e
          manter você conectado.
        </p>
      </LegalSection>

      <LegalSection title="Onde os dados ficam">
        <p>
          Os dados ficam na Supabase (banco de dados, login e arquivos); o site e a leitura de PDFs rodam na Vercel. Esses
          provedores tratam os dados apenas para prestar o serviço. Toda a comunicação é cifrada (HTTPS) e as regras do
          banco só deixam cada conta ver os próprios dados.
        </p>
        <p>
          Cada comprovante é guardado num endereço aleatório, salvo apenas no seu lançamento. Quem tiver esse endereço
          consegue abrir o arquivo, então não compartilhe o link de um comprovante.
        </p>
      </LegalSection>

      <LegalSection title="Por quanto tempo">
        <p>
          Enquanto sua conta existir. Você pode apagar qualquer lançamento a qualquer momento. Ao excluir a conta, todos os
          dados e comprovantes são apagados na hora e não podem ser recuperados.
        </p>
      </LegalSection>

      <LegalSection title="Seus direitos">
        <p>
          Pela Lei Geral de Proteção de Dados (LGPD), você pode confirmar quais dados temos, acessá-los, corrigi-los, pedir
          uma cópia e pedir a exclusão. Quase tudo dá para fazer no próprio app: editar e apagar lançamentos, exportar as
          despesas em planilha (CSV) e{" "}
          <Link href="/excluir-conta" className="font-medium text-primary underline underline-offset-4">
            excluir a conta
          </Link>
          . Para o resto, escreva para <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="Idade mínima">
        <p>O NexFinance é destinado a maiores de 18 anos.</p>
      </LegalSection>

      <LegalSection title="Mudanças e contato">
        <p>
          Se esta política mudar, a data no topo da página é atualizada. O responsável pelos dados é o desenvolvedor do
          NexFinance, que atende pelo e-mail <ContactLink />.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
