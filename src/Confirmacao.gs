// =============================================================================
// Mearas — Sistema de Confirmação de Aulas Particulares
// Google Apps Script
//
// Configuração (salvar nas Propriedades do Script, nunca hardcodar aqui):
//   SPREADSHEET_ID        — ID da planilha Google Sheets
//   BOTCONVERSA_WEBHOOK_URL — URL de webhook automation do BotConversa
//   CELULAR_COORDENADORA  — Número da coordenadora (ex: 5561999999999)
//   EMAIL_TRELLO          — E-mail do board Trello para criação de cards
//   WEBHOOK_SECRET        — Token secreto para validar chamadas ao doPost
// =============================================================================

var NOME_ABA = 'Alunos';

// Índices de coluna (base-0, pois getValues() retorna array base-0)
var COL_NOME       = 0;  // A
var COL_DIA_AULA   = 1;  // B
var COL_HORARIO    = 2;  // C
var COL_PROFESSOR  = 3;  // D
var COL_WHATSAPP   = 4;  // E
var COL_ID_GRUPO   = 5;  // F
var COL_STATUS     = 6;  // G
var COL_DATA_CLICK = 7;  // H
var COL_LINK_TRELLO = 8; // I
var COL_ID_UNICO   = 9;  // J

// Status possíveis
var STATUS_LEMBRETE  = 'Lembrete 24h Enviado';
var STATUS_ULTIMATO  = 'Ultimato Enviado';
var STATUS_CONF      = 'Confirmado';
var STATUS_CANC      = 'Cancelado';
var STATUS_REAG      = 'Reagendamento';

// =============================================================================
// LEITURA DE CONFIGURAÇÕES SENSÍVEIS
// =============================================================================

function getProps() {
  return PropertiesService.getScriptProperties();
}

function getSpreadsheet() {
  var id = getProps().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(id);
}

function getAbaAlunos() {
  return getSpreadsheet().getSheetByName(NOME_ABA);
}

// =============================================================================
// 1. DISPARO DE LEMBRETES — executa diariamente entre 08h e 09h
// =============================================================================

function dispararLembretesAmanha() {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  var amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  var amanhaStr = Utilities.formatDate(amanha, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var diaAula = linha[COL_DIA_AULA];
    var status  = linha[COL_STATUS];

    // Normaliza a data da planilha para string dd/MM/yyyy
    var diaAulaStr = '';
    if (diaAula instanceof Date) {
      diaAulaStr = Utilities.formatDate(diaAula, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    } else {
      diaAulaStr = String(diaAula).trim();
    }

    // Envia lembrete apenas se a aula é amanhã e ainda sem status
    if (diaAulaStr === amanhaStr && status === '') {
      var phone     = String(linha[COL_WHATSAPP]).trim();
      var nomeAluno = String(linha[COL_NOME]).trim();
      var horario   = _formatarHorario(linha[COL_HORARIO]);
      var professor = String(linha[COL_PROFESSOR]).trim();

      enviarLembreteViaBotConversa(phone, nomeAluno, diaAulaStr, horario, professor);

      // Atualiza status na planilha (linha i+1 pois planilha é base-1)
      aba.getRange(i + 1, COL_STATUS + 1).setValue(STATUS_LEMBRETE);

      // Cria trigger dinâmico para o ultimato (3h antes da aula)
      agendarUltimato(i + 1, diaAulaStr, horario);
    }
  }
}

// =============================================================================
// 2. ULTIMATO — dispara 3h antes da aula (trigger dinâmico)
// =============================================================================

function agendarUltimato(linhaNum, diaAulaStr, horario) {
  // Monta o horário de disparo = horário da aula - 3h
  var partes = horario.split(':');
  var horaAula = parseInt(partes[0], 10);
  var minAula  = parseInt(partes[1], 10);

  var dataDisparo = _parseDateStr(diaAulaStr);
  dataDisparo.setHours(horaAula - 3, minAula, 0, 0);

  // Só agenda se o horário de disparo ainda está no futuro
  if (dataDisparo > new Date()) {
    limparGatilhosTemporarios('executarUltimato');
    ScriptApp.newTrigger('executarUltimato')
      .timeBased()
      .at(dataDisparo)
      .create();
  }
}

function executarUltimato() {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  var agora = new Date();

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (linha[COL_STATUS] !== STATUS_LEMBRETE) continue;

    var diaAula = linha[COL_DIA_AULA];
    var diaAulaStr = (diaAula instanceof Date)
      ? Utilities.formatDate(diaAula, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      : String(diaAula).trim();
    var horario = _formatarHorario(linha[COL_HORARIO]);

    // Verifica se esta aula é nas próximas ~3h
    var dataAula = _parseDateStr(diaAulaStr);
    var partesHora = horario.split(':');
    dataAula.setHours(parseInt(partesHora[0], 10), parseInt(partesHora[1], 10), 0, 0);
    var diffHoras = (dataAula - agora) / (1000 * 60 * 60);

    if (diffHoras >= 0 && diffHoras <= 3.5) {
      var phone     = String(linha[COL_WHATSAPP]).trim();
      var nomeAluno = String(linha[COL_NOME]).trim();
      var professor = String(linha[COL_PROFESSOR]).trim();

      var msg = 'Oi! Aula de ' + nomeAluno + ' com ' + professor + ' é HOJE às ' + horario
        + '. Confirma presença? Responde rápido, faltam menos de 3h! 👇';

      enviarLembreteViaBotConversa(phone, nomeAluno, diaAulaStr, horario, professor);
      aba.getRange(i + 1, COL_STATUS + 1).setValue(STATUS_ULTIMATO);

      // Agenda verificação de cancelamento automático (30min após ultimato)
      agendarCancelamentoFinal(dataAula);
    }
  }

  limparGatilhosTemporarios('executarUltimato');
}

// =============================================================================
// 3. CANCELAMENTO AUTOMÁTICO — 30min após o ultimato sem resposta
// =============================================================================

function agendarCancelamentoFinal(dataAula) {
  var dataDisparo = new Date(dataAula.getTime() - (2 * 60 + 30) * 60 * 1000); // aula - 2h30
  if (dataDisparo > new Date()) {
    ScriptApp.newTrigger('verificarCancelamentoFinal')
      .timeBased()
      .at(dataDisparo)
      .create();
  }
}

function verificarCancelamentoFinal() {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  var agora = new Date();

  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (linha[COL_STATUS] !== STATUS_ULTIMATO) continue;

    var diaAula = linha[COL_DIA_AULA];
    var diaAulaStr = (diaAula instanceof Date)
      ? Utilities.formatDate(diaAula, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      : String(diaAula).trim();
    var horario = _formatarHorario(linha[COL_HORARIO]);

    var dataAulaDate = _parseDateStr(diaAulaStr);
    var partes = horario.split(':');
    dataAulaDate.setHours(parseInt(partes[0], 10), parseInt(partes[1], 10), 0, 0);
    var diffMin = (dataAulaDate - agora) / (1000 * 60);

    // Cancela automaticamente se faltam menos de 2h30 e ainda sem resposta
    if (diffMin <= 150 && diffMin >= 0) {
      processarResposta('canc', String(linha[COL_NOME]).trim(), true);
    }
  }

  limparGatilhosTemporarios('verificarCancelamentoFinal');
}

// =============================================================================
// 4. WEBHOOK — recebe cliques dos botões do WhatsApp via BotConversa
// =============================================================================

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Validação do token secreto
    var secret = getProps().getProperty('WEBHOOK_SECRET');
    if (secret && payload.token !== secret) {
      return ContentService.createTextOutput('Unauthorized');
    }

    var acao      = payload.acao;       // 'conf', 'canc' ou 'reag'
    var nomeAluno = payload.nome_aluno; // Nome do aluno

    if (!acao || !nomeAluno) {
      return ContentService.createTextOutput('Payload inválido');
    }

    processarResposta(acao, nomeAluno, false);
    return ContentService.createTextOutput('OK');

  } catch (err) {
    console.error('Erro no doPost: ' + err.message);
    return ContentService.createTextOutput('Erro: ' + err.message);
  }
}

// =============================================================================
// 5. PROCESSAR RESPOSTA — atualiza planilha + notifica grupo + Trello
// =============================================================================

function processarResposta(acao, nomeAluno, automatico) {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  var linhaIdx = -1;

  // Busca o aluno pelo nome (coluna A)
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][COL_NOME]).trim().toLowerCase() === nomeAluno.toLowerCase()) {
      linhaIdx = i;
      break;
    }
  }

  if (linhaIdx === -1) {
    console.error('Aluno não encontrado: ' + nomeAluno);
    return;
  }

  var linha     = dados[linhaIdx];
  var professor = String(linha[COL_PROFESSOR]).trim();
  var horario   = _formatarHorario(linha[COL_HORARIO]);
  var diaAula   = linha[COL_DIA_AULA];
  var diaAulaStr = (diaAula instanceof Date)
    ? Utilities.formatDate(diaAula, Session.getScriptTimeZone(), 'dd/MM/yyyy')
    : String(diaAula).trim();
  var grupoId   = String(linha[COL_ID_GRUPO]).trim();

  // Mapeamento acao → status
  var novoStatus = '';
  var msgGrupo   = '';

  if (acao === 'conf') {
    novoStatus = STATUS_CONF;
    msgGrupo   = '✅ ' + nomeAluno + ' confirmou a aula de ' + diaAulaStr + ' às ' + horario + ' com ' + professor + '.';
  } else if (acao === 'canc') {
    novoStatus = STATUS_CANC;
    var sufixo = automatico ? ' (cancelado automaticamente por falta de resposta)' : '';
    msgGrupo   = '❌ ' + nomeAluno + ' cancelou a aula de ' + diaAulaStr + ' às ' + horario + sufixo + '.';
  } else if (acao === 'reag') {
    novoStatus = STATUS_REAG;
    msgGrupo   = '🔄 ' + nomeAluno + ' quer reagendar a aula de ' + diaAulaStr + ' às ' + horario + '. Aguardando confirmação.';
  } else {
    console.error('Ação desconhecida: ' + acao);
    return;
  }

  // Atualiza planilha
  aba.getRange(linhaIdx + 1, COL_STATUS + 1).setValue(novoStatus);
  aba.getRange(linhaIdx + 1, COL_DATA_CLICK + 1).setValue(new Date());

  // Notifica grupo WhatsApp
  if (grupoId) {
    enviarTextoGrupo(grupoId, msgGrupo);
  }

  // Notifica coordenadora em caso de reagendamento
  if (acao === 'reag') {
    _notificarCoordenadora(nomeAluno, diaAulaStr, horario, professor);
  }

  // Cria card no Trello para cancelamentos e reagendamentos
  if (acao === 'canc' || acao === 'reag') {
    _criarCardTrello(nomeAluno, diaAulaStr, horario, professor, novoStatus);
  }
}

// =============================================================================
// 6. INTEGRAÇÃO BOTCONVERSA — envia lembrete via webhook automation
// =============================================================================

function enviarLembreteViaBotConversa(phone, nomeAluno, dataAula, horario, professor) {
  var url = getProps().getProperty('BOTCONVERSA_WEBHOOK_URL');
  if (!url) {
    console.error('BOTCONVERSA_WEBHOOK_URL não configurada nas Propriedades do Script.');
    return;
  }

  // BotConversa exige telefone com + no início
  var phoneFmt = phone.charAt(0) === '+' ? phone : '+' + phone;

  var payload = {
    phone:               phoneFmt,
    aluno:               nomeAluno,
    ProfessorParticular: professor,
    horario_aulaPP:      horario.replace(':', 'h'),
    data_aulaPP:         _dataParaISO(dataAula, horario)
  };
  // TODO: data_aulaPP retorna 400 — verificar tipo/formato esperado no BotConversa

  var opcoes = {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // Retry com exponential backoff (3 tentativas: 2s, 4s, 8s)
  console.log('Payload BotConversa: ' + JSON.stringify(payload));
  var tentativas = 3;
  var espera = 2000;
  for (var t = 0; t < tentativas; t++) {
    try {
      var resp = UrlFetchApp.fetch(url, opcoes);
      var code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        console.log('BotConversa OK para ' + nomeAluno + ' (' + phone + ')');
        return;
      }
      console.warn('BotConversa retornou HTTP ' + code + ' para ' + nomeAluno + '. Tentativa ' + (t + 1) + ' — Resposta: ' + resp.getContentText());
      // Erro 4xx = problema no payload, não adianta retentar
      if (code >= 400 && code < 500) break;
    } catch (err) {
      console.warn('Erro ao chamar BotConversa: ' + err.message + '. Tentativa ' + (t + 1));
    }
    if (t < tentativas - 1) Utilities.sleep(espera);
    espera *= 2;
  }
  console.error('BotConversa falhou após ' + tentativas + ' tentativas para ' + nomeAluno);
}

// =============================================================================
// 7. ENVIO DE MENSAGEM AO GRUPO WHATSAPP
// =============================================================================

function enviarTextoGrupo(grupoId, mensagem) {
  // O envio ao grupo usa o mesmo webhook do BotConversa com o campo "group_id"
  var url = getProps().getProperty('BOTCONVERSA_WEBHOOK_URL');
  if (!url) {
    console.error('BOTCONVERSA_WEBHOOK_URL não configurada.');
    return;
  }

  var payload = {
    group_id: grupoId,
    mensagem: mensagem
  };

  var opcoes = {
    method:      'post',
    contentType: 'application/json',
    payload:     JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var resp = UrlFetchApp.fetch(url, opcoes);
    console.log('Grupo notificado (' + grupoId + '): HTTP ' + resp.getResponseCode());
  } catch (err) {
    console.error('Erro ao notificar grupo: ' + err.message);
  }
}

// =============================================================================
// 8. LIMPEZA DE GATILHOS TEMPORÁRIOS
// =============================================================================

function limparGatilhosTemporarios(nomeFuncao) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === nomeFuncao) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// =============================================================================
// FUNÇÕES INTERNAS AUXILIARES
// =============================================================================

function _notificarCoordenadora(nomeAluno, diaAulaStr, horario, professor) {
  var celular = getProps().getProperty('CELULAR_COORDENADORA');
  if (!celular) return;

  var url = getProps().getProperty('BOTCONVERSA_WEBHOOK_URL');
  if (!url) return;

  var msg = '🔄 Reagendamento solicitado: ' + nomeAluno
    + ', aula de ' + diaAulaStr + ' às ' + horario
    + ' com ' + professor + '. Por favor, entre em contato para remarcar.';

  var payload = { phone: celular, mensagem: msg };
  var opcoes  = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(url, opcoes);
  } catch (err) {
    console.error('Erro ao notificar coordenadora: ' + err.message);
  }
}

function _criarCardTrello(nomeAluno, diaAulaStr, horario, professor, status) {
  var email = getProps().getProperty('EMAIL_TRELLO');
  if (!email) return;

  var assunto = '[' + status + '] ' + nomeAluno + ' — ' + diaAulaStr + ' ' + horario;
  var corpo   = 'Aluno: ' + nomeAluno + '\n'
    + 'Data: ' + diaAulaStr + '\n'
    + 'Horário: ' + horario + '\n'
    + 'Professor: ' + professor + '\n'
    + 'Status: ' + status;

  try {
    GmailApp.sendEmail(email, assunto, corpo);
  } catch (err) {
    console.error('Erro ao criar card Trello: ' + err.message);
  }
}

// Converte string 'dd/MM/yyyy' em objeto Date
function _parseDateStr(dateStr) {
  var partes = dateStr.split('/');
  // partes[0]=dia, partes[1]=mes, partes[2]=ano
  return new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
}

// Converte 'dd/MM/yyyy' + 'HHhmm' para formato ISO 'yyyy-MM-dd HH:mm:00' esperado pelo BotConversa
function _dataParaISO(dataStr, horarioStr) {
  var partes = dataStr.split('/');
  var hora = horarioStr ? horarioStr.replace('h', ':') : '00:00';
  return partes[2] + '-' + partes[1] + '-' + partes[0] + ' ' + hora + ':00';
}

// Normaliza horário vindo do Sheets: pode ser Date (coluna formatada como hora) ou string
function _formatarHorario(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(val).trim();
}
