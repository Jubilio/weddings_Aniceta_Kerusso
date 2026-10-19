import {personal} from './common.js';
import {icon} from './ui.js';
document.querySelector('#back').href=personal('/');for(const node of document.querySelectorAll('[data-icon]'))node.prepend(icon(node.dataset.icon));
for(const b of document.querySelectorAll('[data-copy-payment]'))b.onclick=async()=>{const status=document.querySelector('#payment-copy-status');try{await navigator.clipboard.writeText(b.dataset.copyPayment);status.textContent='Dados copiados com sucesso.';const original=b.textContent;b.textContent='Copiado ✓';setTimeout(()=>b.textContent=original,2000)}catch{status.textContent='Seleccione e copie este número: '+b.dataset.copyPayment}};
