# Aniceta & Kerusso — Convite de casamento

Casamento de Aniceta Martins e Kerusso Truth Perhay, em **20 de Fevereiro de 2027**.

Convite com moldura floral, paleta de chocolate e marfim, ícones, música, convidados personalizados, confirmação de presença e gestão de presentes.

## Funcionalidades

- Música TEEKS – First Time: tentativa de reprodução automática com botão de iniciar/pausar quando bloqueada pelo navegador.
- Links pessoais para cada convidado e confirmação de presença guardada em D1.
- WhatsApp da noiva: +258848675125. O site abre uma mensagem; o envio é feito pelo convidado.
- `/admin/`: convidados, edição, activação/desactivação, estados de presença, links, exportação CSV e gestão dos presentes.
- `/presentes/`: lista inicial de exemplos, reserva exclusiva por presente, libertação de reservas e confirmação de compra.
- Reservas partilhadas entre dispositivos, com actualização periódica e verificação atómica no servidor.

## Tecnologia e publicação

HTML, CSS e JavaScript, Cloudflare Worker e Cloudflare D1. Não necessita de build. A pasta `dist` contém os assets, `src/worker.js` contém a API e `src/schema.js` inicializa as tabelas e os exemplos.

Consulte [CLOUDFLARE.md](CLOUDFLARE.md) para configurar D1, o segredo `ADMIN_PASSWORD` e publicar. Uma publicação apenas estática não suporta RSVP ou reservas.

```bash
npx wrangler dev
```

Para testes de API e regras de reserva, com Node.js 22.13 ou superior:

```bash
node --test src/worker.test.mjs
```

## Dados do evento

- Cerimónia: Igreja Arco-Íris de Zimpeto, 10h00.
- Recepção: Cajada 1, 13h00.
- Data: 20/02/2027.
- Os links de mapa são pesquisas. Confirme a localização exacta.
- Ajuste a lista de presentes de exemplo no admin antes de partilhar convites.
- Os links pessoais dão acesso à resposta e reservas do convidado; partilhe-os apenas com o destinatário.

O painel usa uma sessão protegida por cookie HttpOnly, Secure e SameSite. O segredo administrativo nunca é enviado ao frontend nem guardado no repositório.
