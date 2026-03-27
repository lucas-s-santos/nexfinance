const fs = require('fs');

const FILE_PATH = 'app/dashboard/import/page.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Add Imports
content = content.replace(
  'import { toast } from "sonner"',
  'import { toast } from "sonner"\nimport { motion, AnimatePresence } from "framer-motion"\nimport { UploadCloud, Check, X } from "lucide-react"'
);

// 2. Add State
content = content.replace(
  'const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set())',
  'const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set())\n  const [step, setStep] = useState<"upload" | "reconciliation" | "review">("upload")\n  const [currentIndex, setCurrentIndex] = useState(0)'
);

// 3. Add PDF advance
content = content.replace(
  '          }))\n        )',
  '          }))\n        )\n        setStep("reconciliation")\n        setCurrentIndex(0)'
);
content = content.replace(
  '          }))\r\n        )',
  '          }))\r\n        )\r\n        setStep("reconciliation")\r\n        setCurrentIndex(0)'
);

// 4. Add OFX advance
content = content.replace(
  '      }))\n    )\n  }',
  '      }))\n    )\n    setStep("reconciliation")\n    setCurrentIndex(0)\n  }'
);
content = content.replace(
  '      }))\r\n    )\r\n  }',
  '      }))\r\n    )\r\n    setStep("reconciliation")\r\n    setCurrentIndex(0)\r\n  }'
);

const newRender = `  const activeTx = filteredRows[currentIndex]

  useEffect(() => {
    if (step !== "reconciliation" || !activeTx) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault()
        setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: false }))
        setCurrentIndex((prev) => prev + 1)
      } else if (e.key === "ArrowLeft" || e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: true }))
        setCurrentIndex((prev) => prev + 1)
      } else if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key) - 1
        const cats = activeTx.baseType === "income" ? incomeCategories : expenseCategories
        if (cats && cats[num]) {
          e.preventDefault()
          setIgnoredOverrides((prev) => ({ ...prev, [activeTx.id]: false }))
          setCategoryOverrides((prev) => ({ ...prev, [activeTx.id]: cats[num].id }))
          setCurrentIndex((prev) => prev + 1)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [step, activeTx, incomeCategories, expenseCategories])

  useEffect(() => {
    if (step === "reconciliation" && filteredRows.length > 0 && currentIndex >= filteredRows.length) {
      setStep("review")
    }
  }, [currentIndex, filteredRows.length, step])

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importação Inteligente</h1>
        <p className="text-muted-foreground">
          Importe OFX, PDF ou CSV de forma fluida e focada.
        </p>
      </div>

      {step === "upload" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-8">
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-colors cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if(f) handleFile(f) }}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Arraste seu extrato aqui</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Suporta .OFX, .PDF e .CSV
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".ofx,.csv,.pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
                <Button variant="secondary" className="pointer-events-none">Selecionar Arquivo</Button>
              </div>

              {fileType === "csv" && csvData && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-muted/30 rounded-xl p-6 border border-border">
                    <h3 className="font-semibold mb-2">Configure as Colunas do CSV</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                       <div className="grid gap-2"><Label>Data</Label><Select value={csvMap.date||"none"} onValueChange={(v)=>setCsvMap({...csvMap,date:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                       <div className="grid gap-2"><Label>Valor</Label><Select value={csvMap.amount||"none"} onValueChange={(v)=>setCsvMap({...csvMap,amount:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                       <div className="grid gap-2"><Label>Descricao</Label><Select value={csvMap.name||"none"} onValueChange={(v)=>setCsvMap({...csvMap,name:v==="none"?"":v})}><SelectTrigger><SelectValue placeholder="Escolher"/></SelectTrigger><SelectContent><SelectItem value="none">Ignorar</SelectItem>{csvData.headers.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <Button onClick={() => { setStep("reconciliation"); setCurrentIndex(0) }} className="w-full">
                       Iniciar Reconciliação
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "reconciliation" && activeTx && (
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 text-sm font-medium text-muted-foreground">
            <span>Analisando {currentIndex + 1} de {filteredRows.length}</span>
            <Button variant="ghost" size="sm" onClick={() => setStep("review")}>
              Pular para Resumo
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeTx.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: ignoredOverrides[activeTx.id] ? -100 : 100 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
                <div className={\`h-2 w-full \${activeTx.baseType === 'income' ? 'bg-success' : activeTx.baseType === 'investment' ? 'bg-primary' : 'bg-destructive'}\`} />
                <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                  
                  {duplicateIds.has(activeTx.id) && (
                    <Badge variant="destructive" className="mb-2">⚠️ Possível Duplicata Detectada</Badge>
                  )}

                  <div className="space-y-1 w-full">
                    <p className="text-sm font-medium text-muted-foreground">{formatDate(activeTx.tx.date)}</p>
                    <Input 
                      className="text-2xl font-bold text-center border-none shadow-none focus-visible:ring-0 focus-visible:outline-none h-auto py-2 px-0 bg-transparent"
                      value={descriptionOverrides[activeTx.id] ?? activeTx.tx.name}
                      onChange={(e) => setDescriptionOverrides(prev => ({ ...prev, [activeTx.id]: e.target.value }))}
                      onBlur={() => {
                         const current = (descriptionOverrides[activeTx.id] ?? "").trim()
                         if (!current || current === activeTx.tx.name) {
                            setDescriptionOverrides(prev => { const n = {...prev}; delete n[activeTx.id]; return n; })
                         }
                      }}
                    />
                    {activeTx.tx.memo && (
                      <p className="text-sm text-muted-foreground">{activeTx.tx.memo}</p>
                    )}
                  </div>

                  <div className={\`text-5xl font-black \${activeTx.baseType === 'income' ? 'text-success' : activeTx.baseType === 'investment' ? 'text-primary' : 'text-destructive'}\`}>
                     {formatCurrency(Math.abs(activeTx.tx.amount))}
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 pt-6">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="h-16 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-lg"
                      onClick={() => {
                        setIgnoredOverrides(prev => ({...prev, [activeTx.id]: true}))
                        setCurrentIndex(prev => prev + 1)
                      }}
                    >
                      <X className="w-6 h-6 mr-2" /> <span className="hidden sm:inline">Ignorar</span> (←)
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="h-16 text-lg"
                      onClick={() => {
                        setIgnoredOverrides(prev => ({...prev, [activeTx.id]: false}))
                        setCurrentIndex(prev => prev + 1)
                      }}
                    >
                      <Check className="w-6 h-6 mr-2" /> <span className="hidden sm:inline">Aprovar</span> (→)
                    </Button>
                  </div>

                  <div className="w-full pt-6 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-left">
                      Categorias Rápidas (Teclado 1-9)
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(activeTx.baseType === "income" ? incomeCategories : expenseCategories).slice(0, 9).map((cat, idx) => (
                        <Button
                          key={cat.id}
                          variant={categoryOverrides[activeTx.id] === cat.id ? "default" : "secondary"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                             setCategoryOverrides(prev => ({...prev, [activeTx.id]: cat.id}))
                             if (categoryOverrides[activeTx.id] === cat.id) {
                               setIgnoredOverrides(prev => ({...prev, [activeTx.id]: false}))
                               setCurrentIndex(prev => prev + 1)
                             }
                          }}
                        >
                          <span className="opacity-50 mr-2 text-xs">[{idx + 1}]</span>
                          {cat.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {step === "review" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
           <Card>
             <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Revisão Concluída</h2>
                <p className="text-muted-foreground mb-8">
                  Você analisou {filteredRows.length} transações.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                  <div className="bg-muted/50 p-4 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Aprovadas</p>
                    <p className="text-2xl font-bold">{filteredRows.filter(r => !r.skipped).length}</p>
                  </div>
                  <div className="bg-success/10 p-4 rounded-xl">
                    <p className="text-sm text-success mb-1">Receitas</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(previewSummary.income)}</p>
                  </div>
                  <div className="bg-destructive/10 p-4 rounded-xl">
                    <p className="text-sm text-destructive mb-1">Despesas</p>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(previewSummary.expense)}</p>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-xl">
                    <p className="text-sm text-primary mb-1">Investimentos</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(previewSummary.investment)}</p>
                  </div>
                </div>

                <div className="flex gap-4 w-full max-w-sm">
                  <Button variant="outline" className="flex-1" onClick={() => { setStep("reconciliation"); setCurrentIndex(0); }}>
                    Revisar Novamente
                  </Button>
                  <Button className="flex-1" size="lg" onClick={handleImport} disabled={loading || checkingDuplicates}>
                    {loading ? "Salvando..." : "Salvar no Banco"}
                  </Button>
                </div>
             </CardContent>
           </Card>
        </motion.div>
      )}

    </div>
  )
}
`;

const renderRegex = /  return \([\s\S]*\}\s*$/;
if (!renderRegex.test(content)) {
  console.error("Return block not found!");
  process.exit(1);
}

content = content.replace(renderRegex, newRender);
fs.writeFileSync(FILE_PATH, content);
console.log("UI updated safely!");
