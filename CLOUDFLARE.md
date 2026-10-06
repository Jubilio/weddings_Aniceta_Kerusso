# Publicação no Cloudflare

## Cloudflare Workers ligado ao GitHub

1. No painel Cloudflare, abra Workers & Pages e crie uma aplicação a partir de um repositório GitHub.
2. Seleccione `Jubilio/weddings_Aniceta_Kerusso` e a branch `main`.
3. Nome do Worker: `weddings-aniceta-kerusso`.
4. Deixe o comando de build vazio: o HTML já está em `dist`.
5. Comando de deploy: `npx wrangler deploy`.
6. Publique e aguarde a confirmação de sucesso no painel.

A configuração `wrangler.jsonc` serve os ficheiros de `dist` através de Workers Static Assets. O endereço final deve ser copiado do painel após a publicação.

## Pelo terminal

```bash
git clone https://github.com/Jubilio/weddings_Aniceta_Kerusso.git
cd weddings_Aniceta_Kerusso
npx wrangler login
npx wrangler deploy
```

A autenticação é realizada directamente pelo Cloudflare. Não guarde tokens no código.

## Alternativa: Cloudflare Pages

Seleccione o mesmo repositório, a branch `main`, sem framework e sem comando de build. Defina `dist` como directório de publicação.

## Estado

O repositório está preparado para publicação. A publicação na conta Cloudflare ainda precisa de ser concluída; adicionar estes ficheiros não publica o site por si só.
