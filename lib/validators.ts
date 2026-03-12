import { z } from "zod"

// ===== VALIDADORES BASE =====

export const incomeSchema = z.object({
  name: z.string()
    .min(1, "Informe o nome")
    .max(255, "Nome muito longo")
    .trim(),
  value: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito grande"),
  date: z.string()
    .min(1, "Informe a data")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  category_id: z.string().optional(),
  description: z.string().max(500).optional(),
})

export const expenseSchema = z.object({
  name: z.string()
    .min(1, "Informe o nome")
    .max(255, "Nome muito longo")
    .trim(),
  value: z.number()
    .positive("Valor deve ser positivo")
    .max(999999999, "Valor muito grande"),
  date: z.string()
    .min(1, "Informe a data")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  category_id: z.string().optional(),
  payment_method: z.enum(
    ["debit", "credit", "pix", "cash", "voucher"],
    { errorMap: () => ({ message: "Método de pagamento inválido" }) }
  ),
  is_essential: z.boolean().default(false),
  description: z.string().max(500).optional(),
})

// ===== VALIDADORES COM REGRAS DE NEGÓCIO =====

/**
 * Valida despesa considerando limite de orçamento
 * @param budgetLimit - Limite de orçamento da categoria
 * @param currentSpent - Quanto já foi gasto
 */
export function createBudgetValidatedExpenseSchema(
  budgetLimit: number | undefined,
  currentSpent: number = 0
) {
  return expenseSchema.refine(
    (data) => {
      if (!budgetLimit) return true
      const totalAfter = currentSpent + data.value
      return totalAfter <= budgetLimit
    },
    {
      message: `Essa despesa excede o orçamento. Limite: R$ ${budgetLimit?.toFixed(2)}`,
      path: ["value"],
    }
  )
}

/**
 * Valida receita contra conta bancária
 */
export function createBalanceValidatedIncomeSchema(minBalance: number = 0) {
  return incomeSchema.refine(
    (data) => data.value >= minBalance,
    {
      message: `Valor mínimo: R$ ${minBalance.toFixed(2)}`,
      path: ["value"],
    }
  )
}

export const billSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  value: z.number().positive("Valor deve ser positivo"),
  due_date: z.string().min(1, "Informe o vencimento"),
  is_planned: z.boolean(),
  is_paid: z.boolean(),
})

export const reserveSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  value: z.number().positive("Valor deve ser positivo"),
  date: z.string().min(1, "Informe a data"),
  type: z.string().min(1, "Informe o tipo"),
})

export const goalSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  target_value: z.number().positive("Valor alvo deve ser positivo"),
  current_value: z.number().min(0, "Valor atual nao pode ser negativo"),
  deadline: z.string().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  type: z.enum(["income", "expense"], { required_error: "Informe o tipo" }),
})

export const budgetSchema = z.object({
  category_id: z.string().min(1, "Informe a categoria"),
  month: z.number().min(1).max(12),
  year: z.number().min(2000),
  limit_value: z.number().positive("Limite deve ser positivo"),
})
