# Mearas — Resumo do Projeto

## O que é

Sistema de confirmação de aulas particulares, automatizado via Google Apps Script integrado a uma planilha Google Sheets. Envia lembretes por WhatsApp aos alunos (ou responsáveis) e gerencia confirmações, cancelamentos e reagendamentos sem intervenção manual.

---

## Problema que resolve

Coordenadores e professores perdem tempo confirmando aulas manualmente por WhatsApp. O sistema automatiza esse fluxo: envia lembrete 24h antes, cobra resposta 3h antes e, sem retorno, cancela automaticamente — tudo registrado na planilha em tempo real.

---

## Como funciona

1. **Disparo diário (08h–09h):** `dispararLembretesAmanha()` verifica alunos com aula no dia seguinte e sem status. Envia mensagem com botões via BotConversa.
2. **Ultimato (3h antes):** `executarUltimato()` reforça para alunos que ainda não responderam.
3. **Cancelamento automático (30min após ultimato):** `verificarCancelamentoFinal()` cancela quem não respondeu.
4. **Resposta do aluno:** Ao clicar em *Confirmar*, *Cancelar* ou *Reagendar*, o BotConversa chama `doPost()` no Apps Script, que atualiza a planilha e notifica a coordenadora e o grupo do WhatsApp.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Lógica e automação | Google Apps Script (JS ES5/ES6) |
| Dados | Google Sheets (aba `Alunos`) |
| Mensageria WhatsApp | BotConversa |
| Alertas internos | Trello (via e-mail) |

---

## Estrutura do repositório

```
Mearas/
├── CLAUDE.md           # Instruções para assistentes de IA
├── README.md           # Documentação para o usuário
├── resume.md           # Este arquivo
└── src/
    └── Confirmacao.gs  # Script principal
```

---

## Status atual

- Script principal implementado e funcional
- Fluxo de status: `Lembrete 24h Enviado` → `Ultimato Enviado` → `Confirmado / Cancelado / Reagendamento`
- Pendente: configuração do flow no BotConversa e testes com número real

---

## Melhorias planejadas

- **ID único por aluno** no payload para eliminar ambiguidade com homônimos
- **Validação do webhook** com token secreto no `doPost`
- **Retry automático** com backoff exponencial nas chamadas ao BotConversa
- **Log de erros** em aba dedicada na planilha
