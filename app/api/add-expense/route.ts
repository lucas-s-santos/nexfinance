/**
 * API endpoint para adicionar despesa com validação completa
 * Utiliza error handler global, validadores com regras de negócio, e rate limiting
 */

import { NextRequest, NextResponse } from "next/server"
import { expenseSchema } from "@/lib/validators"
import ErrorHandler from "@/lib/error-handler"
import { withRateLimit } from "@/lib/middleware/rate-limit"
import { parseMoneyToNumber } from "@/lib/money"
import { createClient } from "@/lib/supabase/client"

async function handler(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { error: "Método não permitido" },
      { status: 405 }
    )
  }

  try {
    // Parse request body
    const body = await request.json()

    // Get user
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Autenticação necessária" },
        { status: 401 }
      )
    }

    // Validate expense data
    const validation = expenseSchema.safeParse({
      name: body.name,
      value: typeof body.value === "string" 
        ? parseMoneyToNumber(body.value) 
        : body.value,
      date: body.date,
      category_id: body.category_id,
      payment_method: body.payment_method,
      is_essential: body.is_essential ?? false,
    })

    if (!validation.success) {
      const appError = ErrorHandler.fromZodError(validation.error)
      ErrorHandler.log(appError)
      return NextResponse.json(
        {
          error: appError.message,
          details: appError.details,
        },
        { status: 400 }
      )
    }

    const validatedData = validation.data

    // Optional: Check budget limit
    if (body.period_id && body.category_id) {
      const { data: budgets } = await supabase
        .from("budgets")
        .select("limit_value")
        .eq("category_id", body.category_id)
        .eq("period_id", body.period_id)
        .maybeSingle()

      if (budgets) {
        const { data: spent } = await supabase
          .from("expenses")
          .select("value")
          .eq("category_id", body.category_id)
          .eq("period_id", body.period_id)

        const totalSpent =
          (spent?.reduce((sum: number, e: any) => sum + Number(e.value), 0) ?? 0) +
          validatedData.value

        if (totalSpent > budgets.limit_value) {
          return NextResponse.json(
            {
              error: "BUDGET_EXCEEDED",
              message: `Essa despesa excede o orçamento. Limite: R$ ${budgets.limit_value.toFixed(2)}`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Insert expense
    const { error: insertError, data } = await supabase
      .from("expenses")
      .insert({
        ...validatedData,
        user_id: user.id,
        period_id: body.period_id,
      })
      .select()
      .single()

    if (insertError) {
      const appError = ErrorHandler.fromSupabaseError(insertError)
      ErrorHandler.log(appError)
      return NextResponse.json(
        { error: appError.message, details: appError.details },
        { status: appError.statusCode }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Despesa criada com sucesso",
        data,
      },
      { status: 201 }
    )
  } catch (err: any) {
    const appError = ErrorHandler.fromSupabaseError(err)
    ErrorHandler.log(appError)
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}

// Aplicar rate limiting: máximo 30 requisições por minuto
export const POST = withRateLimit(handler, {
  maxRequests: 30,
  windowSeconds: 60,
  message: "Muitas requisições. Máximo 30 por minuto.",
})
