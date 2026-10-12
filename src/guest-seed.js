// Initial guest list, imported only through an authenticated admin request.
export const seedVersion='wedding-list-2026-10-12';
export const guestGroups=[
 ['Família Munguambe',8,['Mãe Laurinda','Helder','Nilza','Cíntia','Wilma','Crish','Joshua','Tia Aida']],
 ['Família Luana',10,['Madrinha Laura','Rabeca','Jovita','Lino','Constância','Letícia','Katija','Francisco','Tio Justino','Tia Ronia']],
 ['Família Cascais',10,[['Inês','Esposo de Inês'],['Cezar','Esposa de Cezar'],['Ana Zaida','Esposo de Ana Zaida'],['A. Francisco','Esposa de A. Francisco'],['Mano Alimo','Esposa de Mano Alimo']]],
 ['Amigos',13,['Ivone','Helena','Yoda','Manuel','Laika','Amélia','Carmen','Cade Shkenk','Salvador Rodriguez','Brant Holloway','Ednilson','Sam Shkenk','Elvis']],
 ['Colegas de trabalho',13,['Mana Eunice','Tia Juliana','Tia Amélia','Mana Jorgina','Tio Beto','Tio Marcelo','Mana Cébia','Mana Inocência','Tio Emídio','Mana Hilda','Tio Handelane','Tio Virgílio','Tia Judite']],
 ['Tios educadores',14,['Tia Cidália','Tia Olímpia','Tia Yolande','Tia Nilza','Tia Zélia','Tio Josué','Tio António','Mana Zefa','Mano Augusto','Tio Jamal','Tio Emílio','Tia Filomena','Tio Albino','Tio Armando']],
 ['Grupo de louvor',15,Array.from({length:15},(_,i)=>`Louvor — pessoa ${String(i+1).padStart(2,'0')} (por nomear)`)],
 ['Vizinhos',6,['Sheila','Kelven','Pai','Atílio','Renato','Tia Belinha']],
 ['Colegas da faculdade',12,['Lara Jane','Lara Congole','Rachel','Felismina','Carla Monjane','Orlando Magaia','Mami Maria','Eduardo Manave','Rosimel','João Calage','Chris Manhiça','Olofia']],
 ['Pastores',12,[['Pastor Rafael','Esposa do Pastor Rafael'],['Pastor António','Esposa do Pastor António'],['Pastor Moana','Esposa do Pastor Moana'],['Pastor José','Esposa do Pastor José'],['Pastor Adolfo','Esposa do Pastor Adolfo'],['Pastor Tomás','Esposa do Pastor Tomás']]],
 ['Missionários',9,['Mano Augusto','Mana Clara','Mana Sônia','Mano George','Mana Tracey','Mana Charlotte','Papa Steven','Mana Rosa','Julie (mãe do Kerusso)']],
 ['Convidados do Centro',13,['Ernesto Zimba','Benilson','Felex','Slávio','Fátima Lúcia','Eugenésia','Lígia','Anifa','Prisca','Cristina','Lourino/Meck','Dulce','Crimilda']]
];
export async function seedGuests(db){
 if(await db.prepare('SELECT id FROM wedding_imports WHERE id=?').bind(seedVersion).first())return;
 const {results:existing}=await db.prepare('SELECT id,name,companion,group_name,import_key FROM guests').all();
 const ops=[],updates=[],inserts=[];
 ops.push(db.prepare('INSERT OR IGNORE INTO wedding_groups(name,expected_people,sort_order) VALUES '+guestGroups.map(()=>'(?,?,?)').join(',')).bind(...guestGroups.flatMap(([name,total],i)=>[name,total,i])));
 for(const [index,[group,,entries]]of guestGroups.entries())for(const [i,item]of entries.entries()){
  const [name,companion='']=Array.isArray(item)?item:[item],key=`${seedVersion}:${index}:${i}`;
  if(existing.some(g=>g.import_key===key))continue;
  const match=existing.find(g=>!g.import_key&&g.name===name&&g.companion===companion&&(!g.group_name||g.group_name===group));
  if(match){updates.push([match.id,group,key]);match.import_key=key;continue}
  inserts.push([crypto.randomUUID(),name,companion,crypto.randomUUID().replaceAll('-',''),group,group==='Grupo de louvor'?1:0,key]);
 }
 // Keep each statement below D1's parameter limit and the import in one transaction.
 for(let i=0;i<updates.length;i+=20){const rows=updates.slice(i,i+20);ops.push(db.prepare('WITH changes(id,group_name,import_key) AS (VALUES '+rows.map(()=>'(?,?,?)').join(',')+') UPDATE guests SET group_name=(SELECT group_name FROM changes WHERE changes.id=guests.id),import_key=(SELECT import_key FROM changes WHERE changes.id=guests.id) WHERE id IN(SELECT id FROM changes) AND import_key IS NULL').bind(...rows.flat()))}
 for(let i=0;i<inserts.length;i+=12){const rows=inserts.slice(i,i+12);ops.push(db.prepare('INSERT OR IGNORE INTO guests(id,name,companion,token,group_name,is_placeholder,import_key) VALUES '+rows.map(()=>'(?,?,?,?,?,?,?)').join(',')).bind(...rows.flat()))}
 ops.push(db.prepare('INSERT OR IGNORE INTO wedding_imports(id) VALUES(?)').bind(seedVersion));
 await db.batch(ops);
}
