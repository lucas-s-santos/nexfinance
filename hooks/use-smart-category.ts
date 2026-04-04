import { useEffect, useState } from "react"

const KEYWORD_DICTIONARY: Record<string, string[]> = {
  // Despesas
  "Alimentação": ["ifood", "rappi", "zé delivery", "pizza", "hamburguer", "mcdonalds", "burger king", "restaurante", "lanchonete", "padaria", "bar", "mercado", "supermercado", "carrefour", "pão de açúcar", "atacadao", "assai"],
  "Transporte": ["uber", "99", "taxi", "combustivel", "gasolina", "etanol", "posto", "ipiranga", "shell", "br", "estacionamento", "pedagio", "onibus", "metrô", "passagem", "voo", "azul", "gol", "latam"],
  "Moradia": ["aluguel", "condominio", "luz", "agua", "enel", "sabesp", "copel", "cemig", "internet", "claro", "vivo", "tim", "iptu", "telefone", "energia", "gás", "comgas"],
  "Saúde": ["farmacia", "drogaria", "remedio", "convenio", "unimed", "amil", "sulamerica", "consulta", "medico", "dentista", "exame", "hospital"],
  "Lazer": ["cinema", "teatro", "show", "ingresso", "evento", "festa", "viagem", "hotel", "pousada", "airbnb", "netflix", "spotify", "amazon", "prime", "disney", "assinatura"],
  "Educação": ["faculdade", "escola", "curso", "livro", "material", "mensalidade"],
  "Pessoal": ["cabelo", "barbeiro", "salao", "roupa", "vestuario", "sapato", "tenis", "perfume", "cosmetico", "academia", "smartfit"],
  
  // Receitas
  "Salário": ["salario", "adiantamento", "pagamento", "holerite"],
  "Investimento": ["rendimento", "dividendos", "tesouro", "selic", "cdb", "fii", "ações", "lucro", "venda"],
  "Extra": ["freela", "pix", "transferencia", "bico", "servico"],
}

export function useSmartCategory(
  name: string,
  categories: any[],
  currentCategoryId: string,
  setCategoryId: (id: string) => void
) {
  useEffect(() => {
    // Se o usuário ou o sistema já selecionaram uma categoria, não fazemos nada.
    // Assim, evitamos sobrescrever escolhas manuais ou causar loops de re-renderização.
    if (currentCategoryId && currentCategoryId !== "") return

    if (!name || name.trim() === "") return

    const normalizedName = name.toLowerCase().trim()
    
    for (const [categoryName, keywords] of Object.entries(KEYWORD_DICTIONARY)) {
      const match = keywords.some(keyword => normalizedName.includes(keyword))
      
      if (match) {
        const dbCategory = categories.find(
          c => c.name.toLowerCase() === categoryName.toLowerCase()
        )
        
        if (dbCategory) {
          setCategoryId(dbCategory.id)
        }
        break
      }
    }
  }, [name, categories]) // O effect só processa a lógica inteligente se o nome mudar ou categorias carregarem
}
