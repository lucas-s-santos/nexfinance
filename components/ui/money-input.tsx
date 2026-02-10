"use client"

import { NumericFormat } from "react-number-format"
import { Input } from "@/components/ui/input"

interface MoneyInputProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  id?: string
  required?: boolean
}

export function MoneyInput({
  value,
  onValueChange,
  placeholder,
  id,
  required,
}: MoneyInputProps) {
  return (
    <NumericFormat
      id={id}
      value={value}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      customInput={Input}
      placeholder={placeholder}
      required={required}
      onValueChange={(values) => {
        onValueChange(values.value)
      }}
    />
  )
}
