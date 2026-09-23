# Ailton Manager — Orçamentos v2.1

## Acesso restrito — Firebase Authentication
- Login por e-mail/senha no projeto `ailton-manager`, sem formulário de cadastro público.
- Sessão persistida no navegador pelo SDK do Firebase e botão **Sair**.
- O orçamento só é inicializado depois da confirmação da sessão. Falha ao carregar o serviço mantém a tela bloqueada e permite tentar novamente.
- Rascunho e numeração continuam neste navegador, com as mesmas chaves locais; não há Firestore, histórico ou sincronização nesta etapa.
- O acesso à interface é controlado no cliente. Os arquivos estáticos continuam públicos; dados locais continuam compartilhados por quem usa o mesmo perfil do navegador. Futuras operações na nuvem devem ser autorizadas por regras do servidor.
- Usuários são administrados no Firebase Console. Nenhuma senha é incluída no repositório.

### Verificação desta etapa
Testes de navegador cobriram login aceito/rejeitado com autenticação simulada, sessão após recarga, saída, falha de carregamento do SDK, bloqueio na impressão, layout de 390 px, rascunho, numeração, navegação, entrada automática de 30%, limite da entrada e geração real de PDF. O login com as duas contas reais precisa ser validado pelos titulares, pois suas credenciais não foram fornecidas.

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
