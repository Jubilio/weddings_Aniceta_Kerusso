# Convite de casamento — Aniceta & Kerusso

Convite digital para Aniceta Martins e Kerusso Truth Perhay, com um desenho próprio em chocolate, café, caramelo, bege e marfim.

## Conteúdo

- Cerimónia: Igreja Arco-Íris de Zimpeto, às 10h00.
- Recepção: Cajada 1, às 13h00.
- Paleta e orientações de vestuário.
- Avisos sobre convite pessoal, acompanhantes e crianças.
- Links de pesquisa de localização no Google Maps.

## Executar localmente

O projecto usa HTML e CSS, sem instalação de dependências ou compilação.

```bash
python -m http.server 8000 --directory dist
```

Abra http://localhost:8000 no navegador. Também pode abrir `dist/index.html` directamente.

## Editar

O conteúdo e os estilos estão em `dist/index.html`. As fontes Cormorant Garamond e DM Sans são carregadas através do Google Fonts; existem fontes de substituição locais.

## Publicação

Para alojamento estático, use `dist` como directório de publicação, sem comando de build. Esta organização permite usar Cloudflare Pages ou outro serviço de alojamento estático. Nenhuma integração de publicação automática foi configurada neste repositório.

## Informações pendentes

- Data do casamento.
- Lista de presentes.
- Confirmar a localização exacta dos espaços: os links actuais são pesquisas, não coordenadas verificadas.

## Estado da versão

Esta versão é um convite estático. Não inclui confirmação de presença, base de dados de convidados, painel administrativo ou check-in por QR Code.
