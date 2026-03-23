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
  const [userOverrode, setUserOverrode] = useState(false)

  // Track if user manually changed the category so we don't overwrite it
  useEffect(() => {
    if (currentCategoryId && currentCategoryId !== "") {
      setUserOverrode(true)
    }
  }, [currentCategoryId])

  useEffect(() => {
    // If the input is empty, reset the override flag so it can work again
    if (!name || name.trim() === "") {
      setUserOverrode(false)
      return
    }

    // Do nothing if the user already selected a category manually for this item
    if (userOverrode) return

    const normalizedName = name.toLowerCase().trim()
    
    // Find matching category in the dictionary
    for (const [categoryName, keywords] of Object.entries(KEYWORD_DICTIONARY)) {
      const match = keywords.some(keyword => normalizedName.includes(keyword))
      
      if (match) {
        // Find the actual DB category ID that matches this name (case insensitive)
        const dbCategory = categories.find(
          c => c.name.toLowerCase() === categoryName.toLowerCase()
        )
        
        if (dbCategory) {
          setCategoryId(dbCategory.id)
          // Note: we don't set userOverrode to true here because THIS was an auto-action, not user action.
        }
        break
      }
    }
  }, [name, categories, userOverrode, setCategoryId])
}
