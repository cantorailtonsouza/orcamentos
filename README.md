# Ailton Manager — Orçamentos v1.2

Versão preparada para publicar no GitHub Pages.

## Alterações finais
- Logo preta oficial aplicada no PDF
- QR Code ampliado
- Favicon oficial do site principal
- Numeração anual automática corrigida
- Reimprimir o mesmo orçamento não altera o número
- O próximo número só é criado ao iniciar um novo orçamento
- Reinício automático por ano: 001/2026, 001/2027 etc.

## Como usar
1. Abra `index.html`.
2. Preencha o orçamento.
3. Clique em **Gerar PDF**.
4. Escolha **Salvar como PDF**.

## GitHub
Envie o conteúdo desta pasta para o repositório `orcamentos`.


## Correção v1.2.1
- Corrigido erro de sintaxe no JavaScript que impedia todos os botões de funcionar.
- Adicionado cache-busting no carregamento do `app.js`.
- O botão **Novo orçamento** agora inicia um novo orçamento mediante confirmação.
