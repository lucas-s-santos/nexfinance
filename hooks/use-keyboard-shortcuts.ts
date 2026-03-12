/**
 * Hook para atalhos de teclado
 * Permite entrada rápida de gastos (Ctrl+D) e receitas (Ctrl+R)
 * ESC para fechar dialogo
 */

import { useEffect, useCallback } from "react"

export type KeyboardShortcut = {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  callback: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore se está digitando em um input
      const target = event.target as HTMLElement
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"

      // Permitir algumas shortcuts mesmo dentro de input
      const allowInInput = ["Escape"]

      const eventKey = event.key.toLowerCase()

      shortcuts.forEach((shortcut) => {
        const matchKey = shortcut.key.toLowerCase() === eventKey
        const matchCtrl =
          shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey
        const matchShift =
          shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey
        const matchAlt =
          shortcut.altKey === undefined || shortcut.altKey === event.altKey
        const matchMeta =
          shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey

        const isAllowedInInput = allowInInput.includes(shortcut.key)
        const shouldHandle = isAllowedInInput || !isInputElement

        if (
          matchKey &&
          matchCtrl &&
          matchShift &&
          matchAlt &&
          matchMeta &&
          shouldHandle
        ) {
          event.preventDefault()
          shortcut.callback()
        }
      })
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Utilities para definir atalhos comuns
 */
export const CommonShortcuts = {
  addExpense: (callback: () => void): KeyboardShortcut => ({
    key: "d",
    ctrlKey: true,
    callback,
    description: "Adicionar despesa (Ctrl+D)",
  }),

  addIncome: (callback: () => void): KeyboardShortcut => ({
    key: "r",
    ctrlKey: true,
    callback,
    description: "Adicionar receita (Ctrl+R)",
  }),

  close: (callback: () => void): KeyboardShortcut => ({
    key: "Escape",
    callback,
    description: "Fechar diálogo (ESC)",
  }),

  save: (callback: () => void): KeyboardShortcut => ({
    key: "s",
    ctrlKey: true,
    callback,
    description: "Salvar (Ctrl+S)",
  }),

  delete: (callback: () => void): KeyboardShortcut => ({
    key: "Delete",
    callback,
    description: "Deletar (Delete)",
  }),

  search: (callback: () => void): KeyboardShortcut => ({
    key: "f",
    ctrlKey: true,
    callback,
    description: "Pesquisar (Ctrl+F)",
  }),
}
