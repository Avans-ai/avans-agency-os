import { planBlueprints, type Blueprint } from "./blueprints";
import { itemMissing, validateItem } from "./benchmark";
import type { ServiceId } from "../os-data";
import type { KnowledgeItem, KnowledgeState } from "./types";
export function visiblePlan(k:KnowledgeState,active:ServiceId[]) { return active.map(service=>({service,blueprints:planBlueprints.filter(b=>b.service===service),items:k.plan.modules[service]??[],needsReview:k.reviews.filter(r=>!r.resolvedAt&&r.entityType==="marketing-plan"&&(r.entityId===service||r.entityId==="all")),templatePending:!planBlueprints.some(b=>b.service===service)})); }
export function allocationErrors(items:KnowledgeItem[]) {
  const errors:string[]=[]; const campaigns=items.filter(i=>i.section==="campaigns");
  if(campaigns.length&&Math.abs(campaigns.reduce((sum,c)=>sum+Number(c.values.share??0),0)-100)>0.001)errors.push("La distribución entre campañas debe sumar 100%");
  for(const c of campaigns){const allocations=items.filter(i=>i.section==="allocations"&&Array.isArray(i.values.campaignIds)&&i.values.campaignIds.includes(c.id));if(allocations.length&&Math.abs(allocations.reduce((sum,i)=>sum+Number(i.values.share??0),0)-100)>0.001)errors.push(`Los canales de ${c.values.name??"la campaña"} deben sumar 100%`);}
  return errors;
}
export function validatePlanItem(k:KnowledgeState,item:KnowledgeItem,bp:Blueprint,service:ServiceId) {
  const errors=validateItem(k,item,bp);const items=[...(k.plan.modules[service]??[]).filter(i=>i.id!==item.id),item];
  if(item.section==="colors"&&item.values.hex&&!/^#[0-9a-fA-F]{6}$/.test(String(item.values.hex))) errors.push("El color debe usar #RRGGBB");
  if(item.section==="allocations"&&(!Array.isArray(item.values.campaignIds)||item.values.campaignIds.length!==1))errors.push("Elegí exactamente una campaña");
  if(item.section==="sitemap") {const parents=Array.isArray(item.values.parentIds)?item.values.parentIds:[]; if(parents.length>1)errors.push("Una página solo puede tener una página superior"); const visits=new Set<string>([item.id]);let id=parents[0];while(id){if(visits.has(id)){errors.push("El sitemap no puede contener ciclos");break;}visits.add(id);const parent=items.find(i=>i.id===id&&i.section==="sitemap");if(!parent){errors.push("Página superior inexistente");break;}id=Array.isArray(parent.values.parentIds)?parent.values.parentIds[0]:"";}}
  if(item.status==="Validado") {if(!item.discoveryRefs.length&&!item.findingIds.length)errors.push("Vinculá un hallazgo del Discovery o una conclusión del Benchmark");if(service==="publicidad-digital")errors.push(...allocationErrors(items));}
  return errors;
}
export function planCoverage(items:KnowledgeItem[],service:ServiceId) {return planBlueprints.filter(bp=>bp.service===service).map(bp=>{const rows=items.filter(i=>i.section===bp.id);return {id:bp.id,label:bp.label,loaded:rows.length,missing:rows.flatMap(i=>itemMissing(i,bp)),complete:rows.length>0&&rows.every(i=>!itemMissing(i,bp).length&&i.status==="Validado")};});}
export function sitemapTree(items:KnowledgeItem[]) { const pages=items.filter(i=>i.section==="sitemap");const walk=(parent:string,seen=new Set<string>()):{item:KnowledgeItem;depth:number}[]=>pages.filter(i=>(Array.isArray(i.values.parentIds)?i.values.parentIds[0]??"":"")===parent&&!seen.has(i.id)).flatMap(i=>{const next=new Set(seen).add(i.id);return [{item:i,depth:seen.size},...walk(i.id,next)];}); return walk(""); }
