import { useMemo, useState } from "react";
import RenderMermaid from "react-x-mermaid";
import { parseProgram, Program } from "./grammar/parse";
import { makeGraph, toMermaid } from "./graph";

const SAMPLE = `a ; (b || c) ; d
a < d`;

function App() {
  const [input, setInput] = useState(SAMPLE);

  const { program, error } = useMemo<{
    program: Program | null;
    error: string | null;
  }>(() => {
    if (!input.trim()) return { program: null, error: null };
    try {
      return { program: parseProgram(input), error: null };
    } catch (e) {
      return { program: null, error: (e as Error).message };
    }
  }, [input]);

  const mermaid = useMemo(
    () => (program ? toMermaid(makeGraph(program)) : null),
    [program]
  );

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-semibold">Concurrency Parser</h1>
      <p className="text-sm text-neutral-400 max-w-2xl text-center">
        Build an expression from tasks using <code>;</code> (sequence) and{" "}
        <code>||</code> (parallel). Add <code>a &lt; b</code> ordering
        constraints on their own lines.
      </p>

      <div className="flex gap-4 w-full max-w-4xl">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          aria-label="program input"
          className="flex-1 min-h-80 p-3 font-mono text-sm rounded-lg border border-neutral-600 bg-neutral-800 text-neutral-100 resize-y outline-none focus:border-neutral-400"
        />

        {/* <pre
          aria-label="parsed output"
          className={`flex-1 max-h-[400px] min-h-80 m-0 p-3 text-left overflow-auto text-[13px] rounded-lg border bg-neutral-800 whitespace-pre-wrap ${
            error ? "border-red-700 text-red-300" : "border-neutral-600 text-green-300"
          }`}
        >
          {error ?? (program ? JSON.stringify(program, null, 2) : "Enter a program above…")}
        </pre> */}
      </div>

      <div className="w-full max-w-4xl rounded-lg border border-neutral-600 bg-red p-3">
        {mermaid ? (
          <RenderMermaid
            mermaidCode={mermaid}
            mermaidConfig={{ theme: "redux-color" }}
          />
        ) : (
          <p className="text-sm text-neutral-400 text-center">
            {error ? "Fix the program to see its graph." : "Enter a program above…"}
          </p>
        )}
      </div>
    </main>
  );
}

export default App;
