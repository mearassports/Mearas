// =============================================================================
// Testes.gs — Testes manuais para o sistema Mearas
//
// Execute cada função pelo editor do Apps Script e veja o resultado em:
//   Executar → Execuções (painel lateral)
//
// ATENÇÃO: Todos os testes que escrevem na planilha usam a linha de teste
// inserida por _inserirLinhaTesteSePreciso(). Use limparDadosTeste() ao final.
// =============================================================================

var NOME_ALUNO_TESTE  = '__Teste Mearas__';
var PHONE_TESTE       = ''; // Preencha com um número real para testar envio
var PROFESSOR_TESTE   = 'Israel';
var DATA_AULA_TESTE   = ''; // Preenchida dinamicamente com amanhã

// =============================================================================
// UTILITÁRIOS DE TESTE
// =============================================================================

function _resultado(nome, passou, detalhes) {
  var icone = passou ? '✅ PASSOU' : '❌ FALHOU';
  console.log('[' + nome + '] ' + icone + (detalhes ? ' — ' + detalhes : ''));
  return passou;
}

function _amanhaStr() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function _inserirLinhaTesteSePreciso() {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][COL_NOME] === NOME_ALUNO_TESTE) return i + 1; // linha já existe
  }
  // Insere nova linha de teste
  var novaLinha = aba.getLastRow() + 1;
  var amanha = _amanhaStr();
  aba.getRange(novaLinha, 1, 1, 10).setValues([[
    NOME_ALUNO_TESTE,
    amanha,
    '10:00',
    PROFESSOR_TESTE,
    PHONE_TESTE || '5500000000000',
    '',
    '',
    '',
    '',
    'TEST001'
  ]]);
  console.log('Linha de teste inserida na linha ' + novaLinha);
  return novaLinha;
}

function _lerStatusAluno(nomeAluno) {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][COL_NOME] === nomeAluno) {
      return dados[i][COL_STATUS];
    }
  }
  return null;
}

// =============================================================================
// TESTES UNITÁRIOS
// =============================================================================

/**
 * Verifica que a planilha existe e está acessível.
 */
function testeConexaoPlanilha() {
  console.log('\n--- testeConexaoPlanilha ---');
  try {
    var aba = getAbaAlunos();
    var ok = aba !== null && aba.getName() === NOME_ABA;
    _resultado('Conexão com planilha', ok, 'Aba "' + NOME_ABA + '" encontrada');
  } catch (e) {
    _resultado('Conexão com planilha', false, e.message);
  }
}

/**
 * Verifica que todas as Propriedades do Script obrigatórias estão configuradas.
 */
function testePropriedadesConfiguradas() {
  console.log('\n--- testePropriedadesConfiguradas ---');
  var props = getProps();
  var obrigatorias = ['SPREADSHEET_ID', 'BOTCONVERSA_WEBHOOK_URL', 'WEBHOOK_SECRET'];
  var opcionais    = ['CELULAR_COORDENADORA', 'EMAIL_TRELLO'];

  obrigatorias.forEach(function(chave) {
    var val = props.getProperty(chave);
    _resultado(chave, val !== null && val !== '', 'Obrigatória');
  });
  opcionais.forEach(function(chave) {
    var val = props.getProperty(chave);
    _resultado(chave, val !== null && val !== '', 'Opcional (aviso apenas)');
  });
}

/**
 * Verifica a lógica de data: amanhã é detectada corretamente.
 */
function testeFiltroDataAmanha() {
  console.log('\n--- testeFiltroDataAmanha ---');
  var amanha = _amanhaStr();
  var hoje   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
  _resultado('Amanhã calculado',  amanha !== hoje,  'amanhã=' + amanha + ', hoje=' + hoje);
  _resultado('Formato dd/MM/yyyy', /^\d{2}\/\d{2}\/\d{4}$/.test(amanha), amanha);
}

/**
 * Simula o doPost com ação "confirmar" e verifica atualização na planilha.
 */
function testeDoPostConfirmar() {
  console.log('\n--- testeDoPostConfirmar ---');
  _inserirLinhaTesteSePreciso();

  var secret = getProps().getProperty('WEBHOOK_SECRET') || '';
  var payload = JSON.stringify({
    token:      secret,
    acao:       'conf',
    nome_aluno: NOME_ALUNO_TESTE
  });

  var e = { postData: { contents: payload } };
  var resposta = doPost(e);
  var corpo = resposta.getContent();

  _resultado('HTTP 200 / resposta OK', corpo === 'OK', 'Resposta: ' + corpo);

  var status = _lerStatusAluno(NOME_ALUNO_TESTE);
  _resultado('Status = Confirmado', status === STATUS_CONF, 'Status atual: ' + status);
}

/**
 * Simula o doPost com ação "cancelar".
 */
function testeDoPostCancelar() {
  console.log('\n--- testeDoPostCancelar ---');
  _inserirLinhaTesteSePreciso();

  // Reseta status antes do teste
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][COL_NOME] === NOME_ALUNO_TESTE) {
      aba.getRange(i + 1, COL_STATUS + 1).setValue('');
      break;
    }
  }

  var secret = getProps().getProperty('WEBHOOK_SECRET') || '';
  var payload = JSON.stringify({
    token:      secret,
    acao:       'canc',
    nome_aluno: NOME_ALUNO_TESTE
  });

  var e = { postData: { contents: payload } };
  doPost(e);

  var status = _lerStatusAluno(NOME_ALUNO_TESTE);
  _resultado('Status = Cancelado', status === STATUS_CANC, 'Status atual: ' + status);
}

/**
 * Simula o doPost com ação "reagendar".
 */
function testeDoPostReagendar() {
  console.log('\n--- testeDoPostReagendar ---');
  _inserirLinhaTesteSePreciso();

  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][COL_NOME] === NOME_ALUNO_TESTE) {
      aba.getRange(i + 1, COL_STATUS + 1).setValue('');
      break;
    }
  }

  var secret = getProps().getProperty('WEBHOOK_SECRET') || '';
  var payload = JSON.stringify({
    token:      secret,
    acao:       'reag',
    nome_aluno: NOME_ALUNO_TESTE
  });

  var e = { postData: { contents: payload } };
  doPost(e);

  var status = _lerStatusAluno(NOME_ALUNO_TESTE);
  _resultado('Status = Reagendamento', status === STATUS_REAG, 'Status atual: ' + status);
}

/**
 * Verifica que payload sem token (ou com token errado) é rejeitado.
 */
function testeTokenInvalido() {
  console.log('\n--- testeTokenInvalido ---');
  var secret = getProps().getProperty('WEBHOOK_SECRET');

  if (!secret) {
    console.log('⚠️  WEBHOOK_SECRET não configurado — teste pulado.');
    return;
  }

  var payload = JSON.stringify({
    token:      'token_errado_12345',
    acao:       'conf',
    nome_aluno: NOME_ALUNO_TESTE
  });

  var e = { postData: { contents: payload } };
  var resposta = doPost(e);
  var corpo = resposta.getContent();

  _resultado('Rejeita token inválido', corpo === 'Unauthorized', 'Resposta: ' + corpo);
}

/**
 * Verifica que payload sem campo obrigatório retorna erro adequado.
 */
function testePayloadIncompleto() {
  console.log('\n--- testePayloadIncompleto ---');
  var secret = getProps().getProperty('WEBHOOK_SECRET') || '';

  // Falta o campo "acao"
  var payload = JSON.stringify({ token: secret, nome_aluno: NOME_ALUNO_TESTE });
  var e = { postData: { contents: payload } };
  var resposta = doPost(e);
  var corpo = resposta.getContent();

  _resultado('Rejeita payload sem acao', corpo === 'Payload inválido', 'Resposta: ' + corpo);
}

/**
 * Testa o envio real de lembrete via BotConversa.
 * Requer PHONE_TESTE preenchido e BOTCONVERSA_WEBHOOK_URL configurada.
 */
function testeEnviarLembrete() {
  console.log('\n--- testeEnviarLembrete ---');

  if (!PHONE_TESTE) {
    console.log('⚠️  PHONE_TESTE não definido neste arquivo — preencha antes de executar.');
    return;
  }

  try {
    enviarLembreteViaBotConversa(
      PHONE_TESTE,
      NOME_ALUNO_TESTE,
      _amanhaStr(),
      '10:00',
      PROFESSOR_TESTE
    );
    _resultado('Envio lembrete BotConversa', true, 'Verifique o WhatsApp de ' + PHONE_TESTE);
  } catch (e) {
    _resultado('Envio lembrete BotConversa', false, e.message);
  }
}

/**
 * Roda dispararLembretesAmanha() e verifica se o aluno de teste recebeu o status correto.
 * A linha de teste deve ter data de amanhã (inserida por _inserirLinhaTesteSePreciso).
 */
function testeDispararLembretesAmanha() {
  console.log('\n--- testeDispararLembretesAmanha ---');
  _inserirLinhaTesteSePreciso();

  // Garante status vazio antes do teste
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][COL_NOME] === NOME_ALUNO_TESTE) {
      aba.getRange(i + 1, COL_STATUS + 1).setValue('');
      break;
    }
  }

  dispararLembretesAmanha();

  var status = _lerStatusAluno(NOME_ALUNO_TESTE);
  _resultado('Status após lembrete', status === STATUS_LEMBRETE, 'Status: ' + status);
}

// =============================================================================
// SUÍTE COMPLETA
// =============================================================================

/**
 * Executa todos os testes em sequência.
 * Ideal para rodar antes de implantar uma nova versão.
 */
function testeFluxoCompleto() {
  console.log('========================================');
  console.log('SUÍTE DE TESTES — Mearas');
  console.log('========================================');

  testeConexaoPlanilha();
  testePropriedadesConfiguradas();
  testeFiltroDataAmanha();
  testePayloadIncompleto();
  testeTokenInvalido();
  testeDoPostConfirmar();
  testeDoPostCancelar();
  testeDoPostReagendar();

  console.log('\n========================================');
  console.log('FIM DA SUÍTE — verifique os ✅ e ❌ acima');
  console.log('Use limparDadosTeste() para remover dados de teste da planilha.');
  console.log('========================================');
}

// =============================================================================
// LIMPEZA
// =============================================================================

/**
 * Remove todas as linhas de teste da planilha (nome = NOME_ALUNO_TESTE).
 */
function limparDadosTeste() {
  var aba = getAbaAlunos();
  var dados = aba.getDataRange().getValues();
  var removidas = 0;

  // Percorre de baixo para cima para não bagunçar os índices ao deletar
  for (var i = dados.length - 1; i >= 1; i--) {
    if (dados[i][COL_NOME] === NOME_ALUNO_TESTE) {
      aba.deleteRow(i + 1);
      removidas++;
    }
  }

  console.log('Limpeza concluída. Linhas removidas: ' + removidas);
}
