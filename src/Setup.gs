// =============================================================================
// Setup.gs — Criação e inicialização da planilha Mearas
//
// Execute criarPlanilha() UMA VEZ para criar a planilha com a estrutura correta.
// Após a execução, copie o ID exibido no log e salve em:
//   Projeto → Configurações → Propriedades do Script → SPREADSHEET_ID
// =============================================================================

/**
 * Cria uma nova planilha Google Sheets com a estrutura completa do sistema.
 * Exibe o ID da planilha no log ao final.
 */
function criarPlanilha() {
  var planilha = SpreadsheetApp.create('Mearas — Confirmação de Aulas');
  var aba = planilha.getActiveSheet();
  aba.setName('Alunos');

  // Cabeçalhos (linha 1)
  var cabecalhos = [
    'Nome',
    'Dia Aula',
    'Horário',
    'Professor',
    'WhatsApp Pai',
    'ID Grupo',
    'Status',
    'Data Clique',
    'Link Trello',
    'ID Único'
  ];
  aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);

  // Formata cabeçalho
  var headerRange = aba.getRange(1, 1, 1, cabecalhos.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a86e8');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');

  // Larguras de coluna
  aba.setColumnWidth(1, 200); // Nome
  aba.setColumnWidth(2, 110); // Dia Aula
  aba.setColumnWidth(3, 80);  // Horário
  aba.setColumnWidth(4, 150); // Professor
  aba.setColumnWidth(5, 160); // WhatsApp
  aba.setColumnWidth(6, 260); // ID Grupo
  aba.setColumnWidth(7, 180); // Status
  aba.setColumnWidth(8, 160); // Data Clique
  aba.setColumnWidth(9, 200); // Link Trello
  aba.setColumnWidth(10, 90); // ID Único

  // Formatação da coluna B (Dia Aula) como texto para evitar conversão automática de datas
  aba.getRange('B2:B1000').setNumberFormat('@STRING@');

  // Formatação da coluna H (Data Clique) como data/hora
  aba.getRange('H2:H1000').setNumberFormat('dd/MM/yyyy HH:mm');

  // Validação de dados para coluna G (Status)
  var statusValidos = [
    '',
    'Lembrete 24h Enviado',
    'Ultimato Enviado',
    'Confirmado',
    'Cancelado',
    'Reagendamento'
  ];
  var regra = SpreadsheetApp.newDataValidation()
    .requireValueInList(statusValidos.slice(1), true)
    .setAllowInvalid(true)
    .build();
  aba.getRange('G2:G1000').setDataValidation(regra);

  // Insere 2 alunos de exemplo
  var exemplos = [
    ['Maria Souza',  '05/04/2026', '10:00', 'Israel', '5561911111111', '', '', '', '', 'A001'],
    ['Pedro Lima',   '05/04/2026', '14:00', 'Israel', '5561922222222', '', '', '', '', 'A002']
  ];
  aba.getRange(2, 1, exemplos.length, exemplos[0].length).setValues(exemplos);

  // Congela a linha de cabeçalho
  aba.setFrozenRows(1);

  // Exibe o ID da planilha para ser salvo nas Propriedades do Script
  var id = planilha.getId();
  console.log('==============================================');
  console.log('Planilha criada com sucesso!');
  console.log('ID: ' + id);
  console.log('URL: ' + planilha.getUrl());
  console.log('==============================================');
  console.log('Próximo passo: salve o ID acima em');
  console.log('Projeto → Configurações → Propriedades do Script → SPREADSHEET_ID');

  return id;
}

/**
 * Exibe no log o ID e a URL da planilha já configurada.
 * Útil para confirmar que SPREADSHEET_ID está correto.
 */
function verificarPlanilha() {
  try {
    var planilha = getSpreadsheet();
    var aba = getAbaAlunos();
    var numLinhas = aba.getLastRow() - 1; // desconta cabeçalho
    console.log('Planilha: ' + planilha.getName());
    console.log('URL: ' + planilha.getUrl());
    console.log('Alunos cadastrados: ' + numLinhas);
  } catch (e) {
    console.error('Erro ao acessar a planilha: ' + e.message);
    console.error('Verifique se SPREADSHEET_ID está correto nas Propriedades do Script.');
  }
}

/**
 * Cria (ou recria) as abas Professores e Config na planilha existente.
 * Execute uma vez após criarPlanilha(), ou quando precisar adicionar as abas.
 *
 * Aba Professores — colunas:
 *   A: Nome  |  B: Telefone (com DDI, sem +, ex: 5561999999999)
 *
 * Aba Config — colunas:
 *   A: Chave  |  B: Valor
 *   Chaves usadas pelo sistema:
 *     CELULAR_SECRETARIA — número da secretária
 */
function criarAbasProfessoresEConfig() {
  var planilha = getSpreadsheet();

  // --- Aba Professores ---
  var abaProfessores = planilha.getSheetByName(NOME_ABA_PROFESSORES);
  if (!abaProfessores) {
    abaProfessores = planilha.insertSheet(NOME_ABA_PROFESSORES);
  } else {
    abaProfessores.clearContents();
  }

  var headerProf = [['Nome', 'Telefone']];
  abaProfessores.getRange(1, 1, 1, 2).setValues(headerProf);
  abaProfessores.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff');
  abaProfessores.setColumnWidth(1, 180);
  abaProfessores.setColumnWidth(2, 180);

  // Linha de exemplo
  abaProfessores.getRange(2, 1, 1, 2).setValues([['Israel', '5561999999999']]);

  console.log('Aba "' + NOME_ABA_PROFESSORES + '" criada. Preencha com os professores reais.');

  // --- Aba Config ---
  var abaConfig = planilha.getSheetByName(NOME_ABA_CONFIG);
  if (!abaConfig) {
    abaConfig = planilha.insertSheet(NOME_ABA_CONFIG);
  } else {
    abaConfig.clearContents();
  }

  var headerConfig = [['Chave', 'Valor']];
  abaConfig.getRange(1, 1, 1, 2).setValues(headerConfig);
  abaConfig.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#4a86e8').setFontColor('#ffffff');
  abaConfig.setColumnWidth(1, 220);
  abaConfig.setColumnWidth(2, 220);

  // Chaves do sistema
  abaConfig.getRange(2, 1, 1, 2).setValues([['CELULAR_SECRETARIA', '5561999999999']]);

  console.log('Aba "' + NOME_ABA_CONFIG + '" criada. Preencha com os valores reais.');
}

/**
 * Reseta o status de todos os alunos para vazio.
 * USE APENAS EM AMBIENTE DE TESTE.
 */
function resetarStatusTodos() {
  var aba = getAbaAlunos();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return;
  aba.getRange(2, COL_STATUS + 1, ultimaLinha - 1, 1).clearContent();
  aba.getRange(2, COL_DATA_CLICK + 1, ultimaLinha - 1, 1).clearContent();
  console.log('Status resetados para ' + (ultimaLinha - 1) + ' alunos.');
}
