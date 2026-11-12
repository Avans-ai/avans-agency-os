"use client";

import type { ModuleRecord } from "./types";
import m from "./modules.module.css";

/** Objetos agrupados por etapa (las etapas son las ya definidas para cada módulo). */
export function StagePipeline({ label, stages, records, stageKey, titleKey, onOpen }: { label: string; stages: readonly string[]; records: ModuleRecord[]; stageKey: string; titleKey: string; onOpen?: (record: ModuleRecord) => void }) {
  return (
    <div className={m.pipeline} role="list" aria-label={label}>
      {stages.map((stage) => {
        const items = records.filter((record) => record.values[stageKey] === stage);
        return (
          <div className={m.stage} role="listitem" key={stage} aria-label={`${stage}: ${items.length}`}>
            <span><b>{stage}</b>{items.length}</span>
            {items.length ? (
              <ul>
                {items.map((record) => (
                  <li key={record.id}>
                    {onOpen ? <button type="button" className={m.rowButton} onClick={() => onOpen(record)}>{record.values[titleKey] || record.id}</button> : record.values[titleKey] || record.id}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
