import { parseProgram } from "./grammar/parse";
import { makeGraph, Graph, isConnectedTo } from "./graph";

function graphOf(src: string): Graph {
  return makeGraph(parseProgram(src));
}

/** Index of the (single) task node with the given name. */
function taskIndex(g: Graph, name: string): number {
  const i = g.nodes.findIndex((n) => n.type === "task" && n.name === name);
  expect(i).toBeGreaterThanOrEqual(0);
  return i;
}

/** The single entry/start node is always node 0 and is intermediate. */
function start(): number {
  return 0;
}

describe("graph lowering", () => {
  test("single task connects from the start node", () => {
    const g = graphOf("a");
    expect(g.nodes[start()]).toEqual({ type: "intermediate" });
    const a = taskIndex(g, "a");
    expect(isConnectedTo(g, start(), a)).toBe(true);
    expect(g.edges).toHaveLength(1);
  });

  test("sequence chains output to next origin", () => {
    const g = graphOf("a ; b ; c");
    const a = taskIndex(g, "a");
    const b = taskIndex(g, "b");
    const c = taskIndex(g, "c");
    expect(isConnectedTo(g, start(), a)).toBe(true);
    expect(isConnectedTo(g, a, b)).toBe(true);
    expect(isConnectedTo(g, b, c)).toBe(true);
    expect(g.edges).toHaveLength(3);
  });

  test("parallel fans out from one origin into one end", () => {
    const g = graphOf("a || b || c");
    const a = taskIndex(g, "a");
    const b = taskIndex(g, "b");
    const c = taskIndex(g, "c");
    // every branch starts at the shared origin (the start node)
    expect(isConnectedTo(g, start(), a)).toBe(true);
    expect(isConnectedTo(g, start(), b)).toBe(true);
    expect(isConnectedTo(g, start(), c)).toBe(true);
    // there is exactly one join (intermediate) node besides the start node
    const intermediates = g.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) => n.type === "intermediate");
    expect(intermediates).toHaveLength(2); // start + single join
    const join = intermediates.find(({ i }) => i !== start())!.i;
    // every branch ends at that single join node
    expect(isConnectedTo(g, a, join)).toBe(true);
    expect(isConnectedTo(g, b, join)).toBe(true);
    expect(isConnectedTo(g, c, join)).toBe(true);
  });

  test("sequence after a parallel block uses the join as its origin", () => {
    const g = graphOf("(a || b) ; c");
    const a = taskIndex(g, "a");
    const b = taskIndex(g, "b");
    const c = taskIndex(g, "c");
    const join = g.nodes.findIndex(
      (n, i) => n.type === "intermediate" && i !== start()
    );
    expect(isConnectedTo(g, start(), a)).toBe(true);
    expect(isConnectedTo(g, start(), b)).toBe(true);
    expect(isConnectedTo(g, a, join)).toBe(true);
    expect(isConnectedTo(g, b, join)).toBe(true);
    // c follows the whole parallel block, i.e. starts from its single end
    expect(isConnectedTo(g, join, c)).toBe(true);
  });

  test("nested parallels each get their own single begin/end", () => {
    const g = graphOf("a ; (b || c) ; d");
    const a = taskIndex(g, "a");
    const b = taskIndex(g, "b");
    const c = taskIndex(g, "c");
    const d = taskIndex(g, "d");
    expect(isConnectedTo(g, start(), a)).toBe(true);
    // parallel branches fork from a (the origin handed to the par)
    expect(isConnectedTo(g, a, b)).toBe(true);
    expect(isConnectedTo(g, a, c)).toBe(true);
    const join = g.nodes.findIndex(
      (n, i) => n.type === "intermediate" && i !== start()
    );
    expect(isConnectedTo(g, b, join)).toBe(true);
    expect(isConnectedTo(g, c, join)).toBe(true);
    expect(isConnectedTo(g, join, d)).toBe(true);
  });

  test("constraints add happens-before edges between named tasks", () => {
    const g = graphOf("a || b || c\na < b\nb < c");
    const a = taskIndex(g, "a");
    const b = taskIndex(g, "b");
    const c = taskIndex(g, "c");
    expect(isConnectedTo(g, a, b)).toBe(true);
    expect(isConnectedTo(g, b, c)).toBe(true);
  });
});
