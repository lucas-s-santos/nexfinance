# ⚡ COMEÇAR AGORA - Guia Rápido

**Tempo estimado**: 5 minutos

---

## 1️⃣ Executar Script SQL (3 min)

### 📱 Opção Web (Mais Fácil)

```
1. Abra supabase.com
2. Faça login
3. Selecione projeto "nexfinance"
4. Vá para SQL Editor (lado esquerdo)
5. Clique em "New Query"
6. Copie tudo de: scripts/010_account_balances.sql
7. Cole lá no Supabase
8. Clique em "RUN" (azul)
9. Espere: "Success. No rows returned" ✅
```

**Problemas?** Leia `SQL_EXECUTION_GUIDE.md`

---

## 2️⃣ Reinicie o Servidor Next.js (1 min)

```bash
# Terminal - onde Node está rodando
Ctrl+C  # Para o servidor

# Reinicia
pnpm dev
```

---

## 3️⃣ Teste na Dashboard (1 min)

```
1. Acesse http://localhost:3000
2. Faça login
3. Vá para Dashboard
4. Procure pelo card: "🔄 Sincronização Nubank"
5. Procure pelo botão: "Atualizar"
```

**Se viu os dois:** ✅ Funcionando!

---

## 4️⃣ Sincronize Seu Saldo Agora (Opcional)

```
1. Abra app Nubank
2. Veja seu saldo (ex: R$ 5.000,00)
3. Volta para Dashboard
4. Card "Sincronização" → Clique "Atualizar"
5. Insira o saldo
6. Clique "Atualizar Saldo"
7. Veja status virar 🟢 "Sincronizado"
```

---

## ❓ Dúvidas Frequentes

### "Não vejo o card de sincronização"
- [ ] Executou o script SQL?
- [ ] Reiniciou o servidor (`pnpm dev`)?
- [ ] Está na página Dashboard (não home)?
- [ ] Quer passo a passo? Leia `SETUP_CHECKLIST.md`

### "Clico em 'Atualizar' mas não salva"
- [ ] Verifique console (F12 → Console) se há erros
- [ ] Script SQL foi executado mesmo?
- [ ] Teste com o Supabase web se tabelas existem

### "Mostra 'Desincronizado' sempre"
- Normal na primeira vez!
- Clique em "Atualizar" e insira seu saldo
- Pronto, muda para "Sincronizado"

### "Qual é a diferença entre 'Sistema' e 'Nubank'?"
- **Sistema**: Receitas - Despesas (calculado no app)
- **Nubank**: O saldo REAL que você tem no banco
- Devem ser iguais se tudo está sincronizado ✅

---

## 🎯 O Que Agora Você Tem

✅ Saldo lado a lado (sistema vs banco)  
✅ Botão para sincronizar com 1 clique  
✅ Status visual (verde=ok, amarelo=diferença)  
✅ Histórico de todas as atualizações  
✅ Alertas automáticos quando há desincronização  

---

## 📖 Para Entender Melhor

| Se quer... | Leia... |
|-----------|---------|
| Usar o sistema completo | `SYNC_SYSTEM_GUIDE.md` |
| Passo a passo detalhado | `SETUP_CHECKLIST.md` |
| Técnico/Como funciona | `IMPLEMENTATION_SUMMARY.md` |
| Ajuda com SQL | `SQL_EXECUTION_GUIDE.md` |
| Resumo visual | `README_SYNC_FINAL.md` |

---

## 🚨 Erro? Siga Este Checklist

```
1. Script SQL não executou?
   → Leia SQL_EXECUTION_GUIDE.md

2. Código com erro?
   → Leia terminal pnpm dev (Ctrl+C para ver logs)

3. BD sem conexão?
   → Verifique Supabase está online (supabase.com)

4. Button não funciona?
   → Abra F12 (DevTools) → Console → veja erro

5. Algo não mostra na página?
   → Limpe cache (Ctrl+Shift+Del) → recarregue (F5)
```

---

## 💡 Dicas de Ouro

- **Sincronize sempre depois de importar OFX** - Caso contrário pode parecer desincronizado
- **O botão fica em cada card** - Você pode atualizar saldo direto de onde vê ele
- **Histórico salva tudo** - Sistema registra cada mudança com hora exata
- **Multi-conta preparado** - O código já suporta Nubank + Banco do Brasil + Itaú (futuro)

---

## ✨ Pronto!

Você tem tudo que pediu:

> _"queria que o sistema ficasse lado a lado do banco da nubank"_

**Agora tem!** 🎉

Dashboard mostra:
- Seu saldo calculado pelo app
- Seu saldo real do Nubank
- A diferença entre eles (se houver)
- Um botão para sincronizar sempre que quiser

---

## 🎬 Vamos?

1. Execute script SQL (5 min)
2. Reinicie servidor
3. Sincronize seu saldo
4. **Pronto!** Sistema funcionando 🚀

**Qualquer dúvida, os guides estão prontos para você!**

---

**Aproveita! 💰**
