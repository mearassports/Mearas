# CLAUDE.md — Guia para Assistentes de IA · Mearas

Este arquivo fornece contexto e instruções para assistentes de IA (Claude, Copilot, etc.) que trabalham neste repositório. Mantenha-o atualizado conforme o projeto evolui.

---

## Visão Geral do Projeto

**Sistema de Confirmação de Aulas Particulares** — automação em Google Apps Script integrada a uma planilha Google Sheets para enviar lembretes de aulas via WhatsApp e gerenciar confirmações, cancelamentos e reagendamentos dos alunos.

**Repositório:** [mearassports/Mearas](https://github.com/mearassports/Mearas)

---

## Stack Tecnológica

| Camada | Tecnologia | Papel |
|--------|-----------|-------|
| Lógica principal | **Google Apps Script** (JavaScript ES5/ES6) | Orquestração, triggers, webhooks |
| Banco de dados | **Google Sheets** (aba `Alunos`) | Armazenamento de alunos e status |
| Mensageria | **BotConversa** | Envio/recebimento de mensagens WhatsApp |
| Notificação interna | **Trello** (via e-mail) | Alertas para a secretária/coordenadora |
| Webhook de entrada | `doPost(e)` (Apps Script Web App) | Recebe cliques nos botões do WhatsApp |

---

## Arquitetura de Comunicação

```
Apps Script
  └─► POST → BotConversa Webhook Automation URL
                └─► Flow BotConversa dispara mensagem WhatsApp
                        └─► Aluno recebe: texto + botões [Confirmar / Cancelar / Reagendar]
                                └─► Aluno clica botão
                                        └─► BotConversa POST → doPost (Apps Script)
                                                └─► Apps Script atualiza planilha + notifica grupo/coordenadora/Trello
```

### Payload enviado ao BotConversa

```json
{
  "phone": "5561999999999",
  "nome_aluno": "João Silva",
  "data_aula": "02/03/2026",
  "horario": "14:00",
  "professor": "Israel"
}
```

### Payload recebido do BotConversa (`doPost`)

```json
{
  "acao": "conf",
  "nome_aluno": "João Silva"
}
```

Valores possíveis de `acao`: `conf`, `canc`, `reag`.

> **Atenção:** A busca do aluno na planilha é feita pelo campo `nome_aluno` (coluna A). Homônimos causam ambiguidade — ver backlog de melhorias.

---

## Estrutura da Planilha (aba `Alunos`)

| Coluna | Campo | Notas |
|--------|-------|-------|
| A | Nome | Nome do aluno |
| B | Dia Aula | Data da aula (dd/mm/yyyy) |
| C | Horário | Hora da aula (HH:mm) |
| D | Professor | Nome do professor |
| E | WhatsApp Pai | Número com DDI, sem `+` (ex: `5561999999999`) |
| F | ID Grupo | ID do grupo WhatsApp (`@g.us`) |
| G | Status | Ver fluxo de status abaixo |
| H | Data Clique | Timestamp da resposta do aluno |
| I | Link Trello | Reservado |
| J | ID Único | Reservado — **ainda não utilizado**, mas previsto para resolver homônimos |

### Fluxo de Status (coluna G)

```
(vazio)
  └─► "Lembrete 24h Enviado"    ← dispararLembretesAmanha()
        └─► "Ultimato Enviado"  ← executarUltimato()  (3h antes da aula)
              ├─► "Confirmado"  ← doPost acao=conf
              ├─► "Cancelado"   ← doPost acao=canc  OU  verificarCancelamentoFinal()
              └─► "Reagendamento" ← doPost acao=reag
```

---

## Funções Principais

| Função | Trigger | Descrição |
|--------|---------|-----------|
| `dispararLembretesAmanha()` | Diário 08h–09h | Envia lembrete 24h antes via BotConversa para alunos sem status |
| `executarUltimato()` | Dinâmico, 3h antes da aula | Envia aviso urgente se status = "Lembrete 24h Enviado" |
| `verificarCancelamentoFinal()` | Dinâmico, 30min após ultimato | Cancela automaticamente se sem resposta |
| `doPost(e)` | Webhook (HTTP POST) | Recebe cliques dos botões do WhatsApp via BotConversa |
| `processarResposta(acao, nomeAluno, automatico)` | Chamada interna | Atualiza planilha, notifica grupo e coordenadora, cria card Trello |
| `enviarLembreteViaBotConversa(phone, nomeAluno, dataAula, horario, professor)` | Chamada interna | Chama a URL de webhook automation do BotConversa |
| `enviarTextoGrupo(grupoId, msg)` | Chamada interna | Envia texto simples ao grupo WhatsApp |
| `limparGatilhosTemporarios(nomeFuncao)` | Chamada interna | Remove triggers pontuais após execução para economizar cotas |

---

## Configurações (Constantes no Topo do Script)

Estas constantes ficam no início do arquivo `.gs` principal:

| Constante | Descrição | Sensível? |
|-----------|-----------|-----------|
| `BOTCONVERSA_WEBHOOK_URL` | URL de webhook automation do BotConversa | **SIM — nunca commitar** |
| `CELULAR_COORDENADORA` | Número que recebe alertas de reagendamento | Sim |
| `EMAIL_TRELLO` | E-mail do board Trello para criação de cards | Sim |
| `NOME_ABA` | Nome da aba na planilha (padrão: `"Alunos"`) | Não |

> Armazene valores sensíveis nas **Propriedades do Script** (`PropertiesService.getScriptProperties()`) em vez de hardcoded no código. Nunca commitar tokens, URLs de webhook ou e-mails pessoais.

---

## Estrutura do Repositório

```
Mearas/
├── CLAUDE.md              # Este arquivo
├── README.md              # Documentação voltada ao usuário
└── src/
    └── Confirmacao.gs     # Script principal (Google Apps Script)
```

> O código roda diretamente no editor do Google Apps Script. O repositório serve como backup/versionamento do código `.gs`.

---

## Workflow de Desenvolvimento

### Branching

- **`main`** — código em produção (implantado no Apps Script); branch protegida
- **`develop`** — integração de funcionalidades completas
- **`feature/<descricao>`** — novas funcionalidades, ramificado de `develop`
- **`fix/<descricao>`** — correções de bugs
- **`claude/<descricao>`** — branches criadas por assistentes de IA

Nunca fazer push direto em `main`. Toda mudança passa por Pull Request.

### Mensagens de Commit (Conventional Commits)

```
<tipo>(<escopo>): <resumo curto>
```

**Tipos:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Exemplos:
```
feat(webhook): adicionar verificação de token secreto no doPost
fix(planilha): corrigir índice de coluna ao ler horário (era 2, deve ser 3)
refactor(triggers): extrair limpeza de gatilhos para função reutilizável
docs: atualizar CLAUDE.md com fluxo de status atualizado
```

### Deploy no Google Apps Script

1. Copiar o conteúdo do `.gs` para o editor do Apps Script
2. Salvar e criar nova versão em **Implantar → Gerenciar implantações**
3. Para `doPost` funcionar: implantar como **Web App** com acesso "Qualquer pessoa"
4. Atualizar a URL do Web App no BotConversa se ela mudar

---

## Pendências Operacionais

- [ ] Criar flow no BotConversa com mensagem natural + botões (Confirmar / Cancelar / Reagendar)
- [ ] Configurar ação "Enviar Fluxo" no webhook automation do BotConversa
- [ ] Mapear variáveis do payload (`nome_aluno`, `data_aula`, `horario`, `professor`) no flow
- [ ] Configurar webhook de saída no flow (ao clicar botão → chama `doPost` do Apps Script)
- [ ] Adaptar `enviarLembreteViaBotConversa()` com a URL e campos corretos
- [ ] Configurar trigger diário para `dispararLembretesAmanha()` no Apps Script (08h–09h)
- [ ] Testar fluxo completo de botões com número real

---

## Backlog de Melhorias (Prioridade)

### 1. ID Único no Payload dos Botões *(alta prioridade)*
A busca atual é por `nome_aluno` (coluna A) — falha com homônimos. Usar `ID Único` (coluna J):
- Payload: `{ "acao": "conf", "id_aluno": "1001" }` em vez de `nome_aluno`
- Coluna J já existe na planilha, basta preencher e adaptar `processarResposta()`

### 2. Validação do Webhook *(alta prioridade — segurança)*
`doPost` atualmente aceita qualquer payload sem autenticação. Implementar:
```javascript
const token = JSON.parse(e.postData.contents).token;
if (token !== PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET')) {
  return ContentService.createTextOutput('Unauthorized');
}
```

### 3. Retry com Exponential Backoff *(média prioridade)*
Chamadas `UrlFetchApp.fetch` não têm tratamento de falha. Se o BotConversa oscilar, a mensagem é perdida silenciosamente. Implementar retry 3x com espera 2s/4s/8s.

### 4. Log de Erros *(média prioridade)*
Criar aba `Logs` na planilha ou usar `console.log` estruturado para registrar falhas e respostas de webhook.

### 5. Desacoplamento de Provedor *(baixa prioridade)*
Manter `enviarLembreteViaBotConversa()` com interface genérica para facilitar migração futura (ex: Evolution API self-hosted). Isolar detalhes do BotConversa em um módulo separado.

---

## Notas Técnicas Importantes

- **Gatilhos Dinâmicos:** `executarUltimato()` e `verificarCancelamentoFinal()` são criados programaticamente com `ScriptApp.newTrigger()` para cada aula, evitando consumo desnecessário de cotas do Google. Sempre chamar `limparGatilhosTemporarios()` após execução.
- **Cotas do Apps Script:** Limite de 6 min/execução, 90 min/dia (conta pessoal) ou 6h/dia (Workspace). Lembrar disso ao processar muitos alunos de uma vez.
- **BotConversa sem API Key separada:** Autenticação é pela própria URL de webhook automation (secreta por natureza — não expor).
- **Trello via e-mail:** A notificação da secretária é feita enviando e-mail para o endereço do board Trello (`EMAIL_TRELLO`), sem API direta. Simples mas frágil — considerar API do Trello no futuro.
- **Indexação de arrays:** O código usa `getValues()` que retorna arrays base-0; a planilha usa colunas base-1. Atenção redobrada ao mapear colunas: coluna A = índice `[0]`, coluna G = índice `[6]`, etc. *(4 bugs de indexação já foram corrigidos em versões anteriores.)*
- **Mensagem ao aluno:** Texto corrido natural, não lista de campos. Ex: *"Olá! Lembrando que João Silva tem aula com Israel amanhã, dia 02/03, às 14h. Confirma presença? 👇"*

---

## Instruções para Assistentes de IA

### Fazer
- Ler este `CLAUDE.md` no início de cada sessão
- Trabalhar em branch `claude/<descricao>`, nunca em `main`
- Respeitar a indexação base-0 dos arrays do `getValues()` ao manipular colunas da planilha
- Usar `PropertiesService.getScriptProperties()` para ler constantes sensíveis, nunca hardcodar
- Preservar os comentários de fluxo existentes no código — eles documentam intenções de negócio
- Commits com mensagens no formato Conventional Commits (pode ser em português)

### Não Fazer
- Commitar `BOTCONVERSA_WEBHOOK_URL`, `EMAIL_TRELLO`, `CELULAR_COORDENADORA` ou qualquer segredo
- Refatorar código não relacionado à tarefa solicitada
- Adicionar dependências externas (o ambiente é Google Apps Script puro — sem npm)
- Usar APIs do Node.js (`require`, `fs`, `http`) — não existem no Apps Script
- Criar Pull Request sem instrução explícita do usuário
- Alterar a estrutura de colunas da planilha sem confirmar — isso quebra todos os índices

### Armadilhas Comuns no Apps Script
- `SpreadsheetApp.getActiveSpreadsheet()` só funciona quando executado pela UI; em triggers use `SpreadsheetApp.openById(ID)`
- `Logger.log()` não persiste entre execuções — use `console.log()` ou grave na planilha
- Triggers de tempo usam fuso do projeto (verificar em Configurações do Script)
- `doPost` deve retornar `ContentService.createTextOutput(...)`, não pode retornar `null`

---

## Getting Help

- Bugs e melhorias: [GitHub Issues](https://github.com/mearassports/Mearas/issues)
- Dúvidas sobre Claude Code: `/help` no CLI ou https://github.com/anthropics/claude-code/issues
