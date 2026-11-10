from pathlib import Path

path = Path("app/v2/os/os-store.tsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        'import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";',
        'import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";',
    ),
    (
        '  ideaSeq: number;\n};',
        '  ideaSeq: number;\n  hydrated: boolean;\n};',
    ),
    (
        '    ideaSeq: 40,\n  };',
        '    ideaSeq: 40,\n    hydrated: false,\n  };',
    ),
    (
        '    case "hydrate":\n      return { ...state, ...action.state };',
        '    case "hydrate":\n      return { ...state, ...action.state, hydrated: true };',
    ),
    (
        '  const [state, dispatch] = useReducer(reducer, undefined, seedState);\n  const [localHydrated, setLocalHydrated] = useState(false);',
        '  const [state, dispatch] = useReducer(reducer, undefined, seedState);',
    ),
    (
        '    dispatch({ type: "hydrate", state: validPersistedState(stored, fallback) });\n    setLocalHydrated(true);',
        '    dispatch({ type: "hydrate", state: validPersistedState(stored, fallback) });',
    ),
    (
        '    if (!localHydrated) return;',
        '    if (!state.hydrated) return;',
    ),
    (
        '  }, [localHydrated, state.ideaSeq, state.ideas, state.role, state.seq, state.services, state.tasks]);',
        '  }, [state.hydrated, state.ideaSeq, state.ideas, state.role, state.seq, state.services, state.tasks]);',
    ),
    (
        '    localHydrated,\n',
        '    localHydrated: state.hydrated,\n',
    ),
    (
        '  }), [localHydrated, state, update]);',
        '  }), [state, update]);',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"Expected block not found: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("Reducer hydration patch applied")
