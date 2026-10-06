# Publicação e configuração

Este projecto usa Cloudflare Workers com Static Assets e D1. Use Workers, não Pages estático, para permitir gestão de convidados e reservas partilhadas.

## Workers ligado ao GitHub

Repositório: `Jubilio/weddings_Aniceta_Kerusso`. Branch: `main`. Nome: `weddings-aniceta-kerusso`. Comando de build: vazio. Comando de deploy: `npx wrangler deploy`. Directório raiz: `/`.

O `wrangler.jsonc` declara a base D1 `weddings-aniceta-kerusso-db` com o binding `DB`. As versões actuais do Wrangler podem provisionar automaticamente a base ao publicar. Se o painel solicitar configuração manual, crie essa base em Storage & Databases → D1 e associe-a ao Worker com o nome `DB`. Para manter a associação em futuras publicações Git, adicione o UUID real da base como `database_id` na entrada `d1_databases` de `wrangler.jsonc`. Nunca use um ID fictício.

As tabelas e os seis presentes de exemplo são criados automaticamente na primeira chamada da API. O processo usa `CREATE TABLE IF NOT EXISTS` e `INSERT OR IGNORE`, preservando os dados existentes.

## Palavra-passe do painel admin

No Worker, abra Settings → Variables and Secrets e adicione um **Secret** chamado `ADMIN_PASSWORD`, com um código de pelo menos 4 caracteres (pode usar os 4 dígitos pretendidos). Guarde/aplique a alteração e publique se o painel pedir. Não coloque a palavra-passe no GitHub ou no chat. Sem este segredo, o painel recusa o acesso. O login aceita no máximo 5 tentativas por endereço IP em cada janela de 15 minutos. Um código de 4 dígitos é mais fácil de adivinhar; mantenha-o reservado aos noivos.

## Utilização

- `/admin/`: adicionar/editar convidados, activar/desactivar convites, ajustar presença, copiar links, abrir WhatsApp, exportar CSV e gerir presentes.
- Cada convidado recebe um link `/?convite=TOKEN`. Esse link permite responder e reservar em nome desse convidado, pelo que deve ser partilhado apenas com ele.
- A confirmação de presença é guardada na base. O botão de WhatsApp abre uma mensagem para a noiva no número `+258848675125`; o convidado precisa de enviar a mensagem no WhatsApp.
- `/presentes/?convite=TOKEN`: reservar, libertar uma reserva ainda não comprada e confirmar compra. Sem token é possível apenas consultar.
- Os presentes iniciais são exemplos. Edite-os no admin antes de enviar os convites. Uma reserva não realiza pagamentos ou encomendas.
- O estado dos presentes é actualizado a cada 15 segundos; conflitos de reserva são verificados atomicamente no servidor. A lista pública não mostra nomes de quem reservou.
- Desactivar um convidado invalida o link e liberta reservas ainda não compradas. Os presentes marcados como comprados permanecem indisponíveis até um administrador os libertar.
- A música é servida em `/music/TEEKS_-_First_Time.mp3`, copiada para `dist/music` no repositório. O som automático depende do navegador; o botão “Ouvir música” permite iniciar/pausar.

## Verificação após publicação

Abra `/admin/`, crie dois convidados e teste os links em navegadores separados. Confirme a presença de um deles. Reserve um presente: o outro não deve conseguir reservá-lo. Confirme a compra e verifique o estado no admin. Verifique também a música e o link WhatsApp.
