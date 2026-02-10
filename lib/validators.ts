import { z } from "zod"

export const incomeSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  value: z.number().positive("Valor deve ser positivo"),
  date: z.string().min(1, "Informe a data"),
  category_id: z.string().optional(),
})

export const expenseSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  value: z.number().positive("Valor deve ser positivo"),
  date: z.string().min(1, "Informe a data"),
  category_id: z.string().optional(),
  payment_method: z.string().min(1, "Informe o metodo"),
  is_essential: z.boolean(),
})

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
