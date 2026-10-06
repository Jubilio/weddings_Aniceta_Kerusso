import {api,token,personal,el,button,message,confirmAction} from './common.js';
import {icon} from './ui.js';
document.querySelector('#back').href=personal('/');
for(const node of document.querySelectorAll('[data-icon]'))node.prepend(icon(node.dataset.icon));
const container=document.querySelector('#gifts'),status=document.querySelector('#gift-status');
const labels={available:'Disponível',reserved:'Reservado',purchased:'Já oferecido'};
let loading=false,gifts=[],filter='all';
function render(){container.replaceChildren();const visible=gifts.filter(g=>filter==='all'||filter==='mine'&&g.mine||filter==='available'&&g.status==='available');
for(const gift of visible){const card=el('article',undefined,'registry-item '+gift.status),number=el('span',String(gifts.indexOf(gift)+1).padStart(2,'0'),'gift-number'),copy=el('div',undefined,'gift-copy');copy.append(el('h2',gift.name),el('p',gift.description),el('span',gift.mine?(gift.status==='purchased'?'Comprado por si':'Reservado por si'):labels[gift.status],'tag '+gift.status));card.append(number,copy);const actions=el('div',undefined,'actions');
async function action(a){if(a==='purchased'&&!await confirmAction('Já comprou este presente? A confirmação mantém esta escolha reservada para o vosso convite.'))return;if(a==='release'&&!await confirmAction('Libertar esta reserva para outro convidado?'))return;try{await api('/api/gifts/'+encodeURIComponent(gift.id),{method:'POST',body:{action:a}});await message(a==='reserve'?'Escolha guardada com carinho. Depois de comprar, confirme aqui.':a==='purchased'?'Compra confirmada. Obrigado pelo carinho!':'Reserva libertada.')}finally{await load()}}
function actionButton(text,a,type=''){const b=button(text,()=>action(a),type);b.prepend(icon(a==='purchased'?'check':a==='reserve'?'gift':'refresh'));return b}
if(gift.status==='available'&&token)actions.append(actionButton('Reservar presente','reserve'));
if(gift.mine&&gift.status==='reserved')actions.append(actionButton('Já comprei','purchased'),actionButton('Libertar','release','secondary'));
if(gift.mine&&gift.status==='purchased')actions.append(el('span','Obrigado pelo carinho ♡','gift-thanks'));
if(!token&&gift.status==='available'){const note=el('span','Link pessoal necessário','small');note.prepend(icon('lock'));actions.append(note)}
card.append(actions);container.append(card)}if(!visible.length)container.append(el('p',filter==='mine'?'Ainda não reservou um presente. Explore a lista e escolha com carinho.':'Não há presentes disponíveis nesta selecção.','small'));}
async function load(){if(loading||document.querySelector('dialog[open]'))return;loading=true;try{const data=await api('/api/gifts');gifts=data.gifts;status.textContent=token?'Reserve uma opção para evitar presentes repetidos. Depois de comprar, confirme a sua oferta.':'Abra esta lista através do seu convite pessoal para reservar um presente.';render()}catch(e){status.textContent=e.message}finally{loading=false}}
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;for(const x of document.querySelectorAll('[data-filter]'))x.setAttribute('aria-pressed',String(x===b));render()};
load();setInterval(load,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
