# Mearas — Sistema de Confirmação de Aulas Particulares

Automação em Google Apps Script que envia lembretes de aulas via WhatsApp e gerencia confirmações, cancelamentos e reagendamentos dos alunos.

---

## Como funciona

```
Apps Script (lembrete 24h antes)
  └─► POST → BotConversa
        └─► Aluno recebe mensagem WhatsApp com botões [Confirmar / Cancelar / Reagendar]
              └─► Aluno clica
                    └─► BotConversa → doPost (Apps Script)
                          └─► Planilha atualizada + Grupo notificado + Card Trello criado
```

---

## Pré-requisitos

- Conta Google (Google Sheets + Google Apps Script)
- Conta no [BotConversa](https://botconversa.com.br) com flow configurado
- Board no Trello com endereço de e-mail para criação de cards

---

## Deploy passo a passo

### 1. Criar a planilha

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto
2. Cole o conteúdo de `src/Setup.gs` e `src/Confirmacao.gs` em arquivos separados
3. Execute a função `criarPlanilha()` — ela cria a planilha com a estrutura correta e retorna o ID
4. Copie o **ID da planilha** exibido no log

### 2. Configurar as Propriedades do Script

Em **Projeto → Configurações do Projeto → Propriedades do Script**, adicione:

| Chave | Valor |
|---|---|
| `SPREADSHEET_ID` | ID da planilha criada no passo anterior |
| `BOTCONVERSA_WEBHOOK_URL` | URL de webhook automation do BotConversa |
| `CELULAR_COORDENADORA` | Número da coordenadora com DDI, sem `+` (ex: `5561999999999`) |
| `EMAIL_TRELLO` | E-mail do board Trello para criação de cards |
| `WEBHOOK_SECRET` | Token secreto à sua escolha (ex: uma string aleatória longa) |

> **Nunca** coloque esses valores diretamente no código.

### 3. Implantar como Web App

1. Clique em **Implantar → Nova implantação**
2. Tipo: **Web App**
3. Executar como: **Minha conta**
4. Quem tem acesso: **Qualquer pessoa**
5. Clique em **Implantar** e copie a **URL do Web App**
6. Configure essa URL no BotConversa como webhook de saída do flow

### 4. Configurar trigger diário

1. Vá em **Gatilhos** (ícone de relógio no menu lateral)
2. Adicione novo gatilho:
   - Função: `dispararLembretesAmanha`
   - Tipo: **Baseado em tempo → Temporizador de dia**
   - Hora: **8h–9h**

### 5. Configurar o flow no BotConversa

1. Crie um flow com:
   - Mensagem natural com variáveis: `{{nome_aluno}}`, `{{data_aula}}`, `{{horario}}`, `{{professor}}`
   - 3 botões de resposta rápida: **Confirmar**, **Cancelar**, **Reagendar**
2. Configure o **webhook automation** para receber o payload do Apps Script:
   ```json
   {
     "phone": "{{phone}}",
     "nome_aluno": "{{nome_aluno}}",
     "data_aula": "{{data_aula}}",
     "horario": "{{horario}}",
     "professor": "{{professor}}"
   }
   ```
3. Configure a ação de cada botão para chamar a URL do Web App com:
   ```json
   {
     "token": "<SEU_WEBHOOK_SECRET>",
     "acao": "conf",
     "nome_aluno": "{{nome_aluno}}"
   }
   ```
   *(use `"canc"` e `"reag"` para os outros botões)*

---

## Estrutura da planilha (aba `Alunos`)

| Coluna | Campo | Exemplo |
|---|---|---|
| A | Nome | João Silva |
| B | Dia Aula | 02/03/2026 |
| C | Horário | 14:00 |
| D | Professor | Israel |
| E | WhatsApp Pai | 5561999999999 |
| F | ID Grupo | 5561999999999-1234567890@g.us |
| G | Status | *(gerenciado automaticamente)* |
| H | Data Clique | *(preenchido automaticamente)* |
| I | Link Trello | *(reservado)* |
| J | ID Único | *(reservado — anti-homônimos)* |

### Fluxo de Status

```
(vazio)
  └─► Lembrete 24h Enviado
        └─► Ultimato Enviado
              ├─► Confirmado
              ├─► Cancelado
              └─► Reagendamento
```

---

## Testes

Use as funções em `src/Testes.gs` para validar o sistema antes de ir a produção:

| Função | O que testa |
|---|---|
| `testeEnviarLembrete()` | Envia lembrete real via BotConversa para um número de teste |
| `testeDoPostConfirmar()` | Simula clique em "Confirmar" |
| `testeDoPostCancelar()` | Simula clique em "Cancelar" |
| `testeDoPostReagendar()` | Simula clique em "Reagendar" |
| `testeFluxoCompleto()` | Roda o fluxo de ponta a ponta com dados fictícios |
| `testeTokenInvalido()` | Verifica que payload sem token é rejeitado |
| `limparDadosTeste()` | Remove linhas de teste da planilha |

Execute cada função pelo editor do Apps Script e veja o resultado no painel **Execuções**.

---

## Estrutura do repositório

```
Mearas/
├── CLAUDE.md          # Instruções para assistentes de IA
├── README.md          # Este arquivo
├── resume.md          # Resumo do projeto
└── src/
    ├── Confirmacao.gs # Script principal
    ├── Setup.gs       # Criação e inicialização da planilha
    └── Testes.gs      # Funções de teste manual
```

---

## Problemas comuns

**`doPost` não recebe as chamadas do BotConversa**
- Verifique se o Web App foi implantado com acesso "Qualquer pessoa"
- Confirme que a URL configurada no BotConversa é a URL atual da implantação

**Aluno não encontrado no `processarResposta`**
- O nome no payload deve ser idêntico ao da planilha (incluindo acentos e maiúsculas)
- Futuramente, usar `id_aluno` (coluna J) eliminará esse problema

**Trigger de `executarUltimato` não disparou**
- Verifique se o fuso horário do projeto está correto em **Configurações do Script → Fuso horário**
- Confira os logs em **Execuções** para ver se houve erro

---

## Contribuindo

Siga o workflow de branches descrito no `CLAUDE.md`. Nunca faça push direto em `main`.
