# Ailton Manager — Orçamentos v2.2

## Acesso restrito — Firebase Authentication
- Login por e-mail/senha no projeto `ailton-manager`, sem formulário de cadastro público.
- Sessão persistida no navegador pelo SDK do Firebase e botão **Sair**.
- O orçamento só é inicializado depois da confirmação da sessão. Falha ao carregar o serviço mantém a tela bloqueada e permite tentar novamente.
- Rascunhos compartilhados são salvos no Firestore, mantendo uma cópia do último rascunho neste navegador.
- O acesso à interface é controlado no cliente. Os arquivos estáticos continuam públicos; dados locais continuam compartilhados por quem usa o mesmo perfil do navegador. O Firestore exige autenticação nas regras do servidor.
- Usuários são administrados no Firebase Console. Nenhuma senha é incluída no repositório.

### Verificação desta etapa
`node tests/drafts.cjs` (Node, Playwright, pdf-lib e Chrome) verifica dois navegadores com Firebase simulado: salvar, reabrir, editar, persistir a cópia local, evitar sobrescrita de versão mais recente, lidar com falta de conexão e permissão, repetir sem duplicar, paginar, manter número e entrada de 30%, gerar PDF real, sair e bloquear impressão sem login. O SDK real foi consultado e o Firestore rejeitou leitura sem autenticação. O salvamento com as contas reais precisa ser validado pelos titulares, pois suas credenciais não foram fornecidas.

## Rascunhos na nuvem
1. Entre com um dos usuários autorizados.
2. Preencha o formulário (rascunhos podem estar incompletos) e clique em **Salvar rascunho**.
3. Aguarde **Salvo na nuvem**. No outro aparelho, entre e abra **Rascunhos salvos**.
4. Use **Atualizar lista**, escolha **Abrir rascunho**, edite e salve novamente.

- Banco `(default)`, coleção compartilhada `budgetDrafts`, projeto `ailton-manager`. Usa as regras existentes que exigem `request.auth != null`; todos os usuários autorizados do projeto compartilham a lista.
- Cada documento usa um ID independente da numeração visível. O campo é editável e o botão **Automático** sugere o próximo número anual (`001/2026`, `002/2026`), considerando o histórico da nuvem e o contador local. Cada ano inicia sua própria sequência. Números manuais no formato anual também alimentam a sequência.
- Ao salvar ou exportar, o histórico completo é consultado em páginas de 100 documentos para detectar duplicidade (inclusive `42/2026` versus `042/2026`), excluindo o próprio rascunho. Esta consulta não é uma reserva atômica: salvamentos simultâneos em aparelhos diferentes ainda podem coincidir. Não há garantia absoluta de exclusividade entre aparelhos.
- PDF e impressão exigem salvar na nuvem com sucesso antes da exportação. Sem conexão, o rascunho fica local e a exportação é interrompida com aviso. O número escolhido aparece no PDF e no nome do arquivo; reabrir e reimprimir não incrementa a sequência. Limpar inicia outro rascunho e mantém os documentos da nuvem.
- Cada salvamento explícito usa uma transação com controle de revisão. Uma edição antiga não sobrescreve alterações feitas por outro usuário. Em conflito, a cópia local é mantida; reabra a versão atual antes de continuar.
- A lista lê até 20 documentos por página, sem atualização contínua em segundo plano. Não há upload de PDFs, Cloud Storage, Cloud Functions, alteração de plano ou ativação de faturamento. Compatível com as cotas do plano Spark; o consumo pode ser acompanhado no Firebase Console.
- O PDF continua sendo gerado no aparelho com o mesmo arquivo `js/pdf.js`. Rascunhos anteriores ficam locais até que o usuário clique em **Salvar rascunho**.
- O salvamento requer conexão. Em falha, o aviso diferencia nuvem e cópia local; só a confirmação **Salvo na nuvem** garante disponibilidade no outro aparelho.

## Alterações
- PDF real redesenhado para ficar visualmente semelhante à versão clássica de impressão.
- Rodapé posicionado logo após o texto de agradecimento.
- QR Code menor e melhor integrado ao rodapé.
- Bloco de investimento no mesmo estilo escuro da versão preferida.
- Marca-d'água mais discreta.
- Entrada nunca pode ser maior que o valor total.
- Ao sair do campo de entrada, o sistema limita automaticamente ao valor total.
- A validação impede gerar ou compartilhar PDF com valor de entrada inválido.

## Publicação
Substitua todos os arquivos do repositório `orcamentos` pelo conteúdo desta pasta.
