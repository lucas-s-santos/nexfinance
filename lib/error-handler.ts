/**
 * Global error handler para o sistema financeiro
 * Centraliza tratamento de erros da API, Supabase e validações
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "DATABASE_ERROR"
  | "RATE_LIMIT_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR"
  | "BUDGET_EXCEEDED"
  | "INSUFFICIENT_BALANCE"

export interface AppError {
  code: ErrorCode
  message: string
  details?: Record<string, any>
  statusCode: number
}

class ErrorHandler {
  /**
   * Parse erro do Supabase para AppError
   */
  static fromSupabaseError(error: any): AppError {
    if (!error) {
      return {
        code: "UNKNOWN_ERROR",
        message: "Erro desconhecido",
        statusCode: 500,
      }
    }

    const message = error.message?.toLowerCase() || ""

    // Auth errors
    if (message.includes("auth") || error.status === 401) {
      return {
        code: "AUTH_ERROR",
        message: "Falha na autenticação. Faça login novamente.",
        statusCode: 401,
        details: { original: error },
      }
    }

    // Rate limit
    if (error.status === 429 || message.includes("rate")) {
      return {
        code: "RATE_LIMIT_ERROR",
        message: "Muitas requisições. Espere um momento.",
        statusCode: 429,
        details: { original: error },
      }
    }

    // Database constraint violations
    if (error.code === "23505") {
      return {
        code: "VALIDATION_ERROR",
        message: "Este registro já existe",
        statusCode: 400,
        details: { constraint: error.details },
      }
    }

    if (error.code === "23503") {
      return {
        code: "VALIDATION_ERROR",
        message: "Registro relacionado não encontrado",
        statusCode: 400,
        details: { constraint: error.details },
      }
    }

    // Generic database error
    if (error.status === 400 || error.code) {
      return {
        code: "DATABASE_ERROR",
        message: error.message || "Erro ao acessar banco de dados",
        statusCode: error.status || 500,
        details: { original: error },
      }
    }

    return {
      code: "DATABASE_ERROR",
      message: error.message || "Erro ao acessar banco de dados",
      statusCode: error.status || 500,
      details: { original: error },
    }
  }

  /**
   * Parse erro de validação Zod
   */
  static fromZodError(error: any): AppError {
    const errors = error.errors?.map((e: any) => ({
      path: e.path.join("."),
      message: e.message,
    })) || []

    return {
      code: "VALIDATION_ERROR",
      message: "Dados inválidos. Verifique os campos abaixo.",
      statusCode: 400,
      details: { errors },
    }
  }

  /**
   * Parse erros de API genéricos
   */
  static fromResponse(
    status: number,
    error: any
  ): AppError {
    if (status === 401) {
      return {
        code: "AUTH_ERROR",
        message: "Autenticação necessária",
        statusCode: 401,
      }
    }

    if (status === 429) {
      return {
        code: "RATE_LIMIT_ERROR",
        message: "Você está fazendo muitas requisições. Tente novamente em alguns segundos.",
        statusCode: 429,
      }
    }

    if (status === 400) {
      return {
        code: "VALIDATION_ERROR",
        message: error?.message || "Dados inválidos",
        statusCode: 400,
        details: error,
      }
    }

    if (status >= 500) {
      return {
        code: "DATABASE_ERROR",
        message: "Erro no servidor. Tente novamente mais tarde.",
        statusCode: status,
      }
    }

    return {
      code: "UNKNOWN_ERROR",
      message: error?.message || "Erro desconhecido",
      statusCode: status || 500,
    }
  }

  /**
   * Log de erro no console e/ou serviço remoto
   */
  static log(error: AppError) {
    console.error(`[${error.code}]:`, error.message, error.details)

    // TODO: Integrar com Sentry ou similar
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error)
    // }
  }

  /**
   * Mensagem amigável ao usuário
   */
  static getPublicMessage(error: AppError): string {
    const messages: Record<ErrorCode, string> = {
      VALIDATION_ERROR: "Os dados fornecidos estão inválidos.",
      AUTH_ERROR: "Sua sessão expirou. Faça login novamente.",
      DATABASE_ERROR: "Erro ao salvar. Tente novamente.",
      RATE_LIMIT_ERROR: "Você está enviando muitas requisições. Aguarde um momento.",
      NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
      UNKNOWN_ERROR: "Ocorreu um erro desconhecido. Tente novamente.",
      BUDGET_EXCEEDED: "Esta despesa excede seu orçamento para a categoria.",
      INSUFFICIENT_BALANCE: "Saldo insuficiente para esta operação.",
    }

    return messages[error.code] || error.message
  }
}

export default ErrorHandler
