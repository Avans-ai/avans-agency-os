/* Módulo 1 del Marketing Discovery oficial de Avans.
 * Los otros módulos viven en la ficha como Benchmark y Estrategia/Plan MKT.
 * Se conservan los prompts de la plantilla, sin convertirlos en datos afirmados. */
export type DiscoveryField = { key:string; label:string; prompt:string };
export type DiscoverySection = {id:string; title:string; description:string; fields:DiscoveryField[]};
export const marketingDiscoverySections:DiscoverySection[]=[
  {id:"identidad",title:"01 · Quiénes somos y qué hacemos",description:"Análisis del negocio · definición, datos y oferta.",
    fields:[
      {key:"business",label:"Definición del negocio",prompt:"Qué es la empresa, a qué se dedica y dónde opera. Sin adjetivos ni promesas."},
      {key:"facts",label:"Datos relevantes",prompt:"Números y hechos verificables que den dimensión a la empresa, con fuente."},
      {key:"units",label:"Unidades de negocio",prompt:"Líneas o categorías, qué resuelven y para qué cliente."},
      {key:"products",label:"Productos y servicios",prompt:"Qué incluyen, cómo se entregan y qué problema resuelven."},
      {key:"proof",label:"Razones para creer y diferenciales",prompt:"Datos, credenciales y pruebas que sostienen la oferta y sus fortalezas."},
    ]},
  {id:"venta",title:"02 · Cómo se vende hoy",description:"El recorrido entre primer contacto y cierre.",
    fields:[
      {key:"salesStages",label:"Proceso comercial",prompt:"Cómo llega, primer contacto, propuesta, decisión y cierre."},
      {key:"salesCycle",label:"Duración del ciclo",prompt:"Tiempo entre el primer contacto y la compra. Diferenciar estimación de dato confirmado."},
      {key:"ticket",label:"Ticket y recompra",prompt:"Valor típico de operación y frecuencia de recompra, indicando fuente."},
      {key:"decisionMakers",label:"Quién decide e influye",prompt:"Compradores, usuarios y roles internos que pueden aprobar o bloquear la decisión."},
    ]},
  {id:"audiencias",title:"03 · Segmentos e ICP",description:"Foco comercial basado en potencial y encaje.",
    fields:[
      {key:"targeting",label:"Matriz de targeting",prompt:"Segmentos, potencial, match y relevancia para el negocio. Explicar los criterios."},
      {key:"b2b",label:"ICP · B2B",prompt:"Tipo de empresa, ubicación, intereses, insights, disparadores, barreras y beneficio específico."},
      {key:"b2c",label:"ICP · B2C",prompt:"Momento de vida, intereses, ubicación, insights, disparadores, barreras y beneficio específico."},
    ]},
];
export const totalDiscoveryFields=marketingDiscoverySections.reduce((n,g)=>n+g.fields.length,0);
