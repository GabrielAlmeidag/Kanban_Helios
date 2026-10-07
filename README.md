# Projeto Helios - Web Service colaborativo

Aplicação Node.js com Express, PostgreSQL e WebSockets. Não usa Supabase e não salva o quadro somente no navegador.

## Publicação no Render

1. Substitua todo o conteúdo do repositório por estes arquivos.
2. Faça commit e push para a branch `main`.
3. No Render, clique em **New > Blueprint**.
4. Selecione o repositório e confirme o arquivo `render.yaml`.
5. O Render criará o Web Service `kanban-helios` e o PostgreSQL `helios-db`.
6. Aguarde os dois recursos ficarem disponíveis.

## Funcionamento

- `GET /api/board`: carrega o quadro compartilhado.
- `PUT /api/board`: grava todas as alterações no PostgreSQL.
- `/ws`: envia a versão atualizada para todos os navegadores conectados.
- Cada raia possui rolagem interna e o quadro permanece limitado à altura da tela.
