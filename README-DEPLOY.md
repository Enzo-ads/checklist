# Fichário Pokémon — publicação online

Este projeto foi preparado para rodar no Railway usando Docker e SQLite em volume persistente.

## O que foi ajustado

- Compatibilidade com Node.js 22.15 e `node:sqlite`.
- Caminho do banco configurável por `DB_PATH`.
- Arquivos servidos por caminho absoluto, sem depender da pasta de execução.
- Rota `/health` para verificar se o servidor está ativo.
- Inicialização que baixa o catálogo e as cartas somente quando o banco persistente ainda não existe ou está vazio.
- Dockerfile e configuração Railway incluídos.

## Como publicar no Railway

1. Extraia este ZIP.
2. Envie o conteúdo da pasta `fichario` para um repositório GitHub seu.
3. Entre em https://railway.com/ e crie um projeto usando **Deploy from GitHub repo**.
4. Selecione o repositório. O Railway detectará o `Dockerfile` e fará a compilação.
5. Nas configurações do serviço, adicione um **Volume** com o caminho de montagem `/app/data`.
6. Em **Settings → Networking**, gere um domínio público (**Generate Domain**).
7. Aguarde o primeiro deploy. Na primeira inicialização, o sistema baixa o banco de cartas e o catálogo Pokémon; isso pode levar alguns minutos.
8. Abra o domínio gerado e teste adicionando um Pokémon e marcando uma carta.

## Persistência

O banco fica em `/app/data/checklist.db`. O volume Railway em `/app/data` é essencial: sem ele, os dados podem ser perdidos quando o container for recriado.

## Importante sobre privacidade e uso simultâneo

A versão recebida não possui contas ou login. Portanto, todos que acessarem o mesmo endereço usarão a mesma lista de Pokémon e as mesmas marcações. Não compartilhe o endereço publicamente se quiser manter o fichário privado. Para uso individual privado ou vários usuários com listas separadas, será necessário adicionar autenticação e separar os dados por conta antes de abrir o acesso.

## Custos e disponibilidade

O Railway pode exigir plano/créditos para manter o serviço e o volume ativos. Consulte os preços e limites atuais antes de publicar: https://railway.com/pricing
