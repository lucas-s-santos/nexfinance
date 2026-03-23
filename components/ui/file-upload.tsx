"use client"

import React, { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, File, X, Loader2, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  onUpload: (file: File) => Promise<string> // Returns the uploaded URL
  value?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  className?: string
}

export function FileUpload({ onUpload, value, onChange, disabled, className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return
      
      try {
        setIsUploading(true)
        const url = await onUpload(file)
        onChange(url)
      } catch (err) {
        console.error("Upload falhou", err)
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: disabled || isUploading,
  })

  // Has Value state
  if (value) {
    const isImage = value.match(/\.(jpeg|jpg|gif|png|webp)/) != null || value.startsWith("http")
    return (
      <div className={cn("relative flex items-center justify-between p-3 border rounded-xl bg-card/50", className)}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isImage ? <ImageIcon className="h-5 w-5" /> : <File className="h-5 w-5" />}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate w-full max-w-[180px]">
              Comprovante Anexado
            </span>
            <a href={value} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              Ver anexo
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="p-2 shrink-0 rounded-full hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // Empty state
  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border",
        (disabled || isUploading) && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <UploadCloud className="h-5 w-5" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {isUploading ? "Enviando..." : isDragActive ? "Solte aquii" : "Ex: Foto da Nota Fiscal"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isUploading ? "Aguarde um momento" : "Arraste ou clique (PNG, JPG, PDF)"}
        </p>
      </div>
    </div>
  )
}
