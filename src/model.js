export const fresh = () => ({money:40, day:1, served:0, cats:1, level:1, happiness:80});
export const price = s => ({cat:100*s.cats, decor:80*s.level, food:15});
export function purchase(s, item) {
  const cost=price(s)[item];
  if (!cost || s.money<cost || (item==='cat'&&s.cats>=4) || (item==='decor'&&s.level>=3)) return false;
  s.money-=cost;
  if(item==='cat') s.cats++;
  if(item==='decor') s.level++;
  if(item==='food') s.happiness=Math.min(100,s.happiness+30);
  return true;
}
export function serve(s, patience) {
  const earned=12+s.level*3+s.cats*2+(s.happiness>=60?5:0)+(patience>0.6?3:0);
  s.money+=earned;s.served++;return earned;
}
export function load(raw) {
  try { const s=JSON.parse(raw); if(!s || !['money','day','served','cats','level','happiness'].every(k=>Number.isFinite(s[k]))) return fresh();
    return {money:Math.max(0,Math.floor(s.money)),day:Math.max(1,Math.floor(s.day)),served:Math.max(0,Math.floor(s.served)),cats:Math.max(1,Math.min(4,Math.floor(s.cats))),level:Math.max(1,Math.min(3,Math.floor(s.level))),happiness:Math.max(0,Math.min(100,s.happiness))};
  }catch{return fresh();}
}
