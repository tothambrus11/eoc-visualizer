import { Expression, Program } from "./grammar/parse";

/// Defines a task or intermediate point in a concurrent program.
export type Node =
    | {
        type: "task";
        /// The name of the node.
        name: string;
    }
    | {
        type: "intermediate";
    };

/// Defines a happens-before relationship between two nodes.
export interface Edge {
    /// The index of the node that happens before `to`.
    from: number;

    /// The index of the node that happens after `from`.
    to: number;
}
export interface Graph {
    nodes: Node[];
    edges: Edge[];
}

/// Checks if there is a direct edge from `from` to `to`.
export function isConnectedTo(graph: Graph, from: number, to: number): boolean {
    return graph.edges.some(e => e.from === from && e.to === to);
}

/// Returns the node indices that have an edge to the given node.
export function incomingEdges(graph: Graph, to: number): number[] {
    return graph.edges.filter(e => e.to === to).map(e => e.from);
}

/// Returns the node names that have an edge from the given node.
export function outgoingEdges(graph: Graph, from: number): number[] {
    return graph.edges.filter(e => e.from === from).map(e => e.to);
}

export function connect(graph: Graph, from: number, to: number) {
    if (!isConnectedTo(graph, from, to)) {
        graph.edges.push({ from, to });
    }
}

/// Appends a node to the graph and returns its index.
export function addNode(graph: Graph, node: Node): number {
    graph.nodes.push(node);
    return graph.nodes.length - 1;
}

/// Lowers an expression into the graph.
///
/// Every expression is wired in starting from a single `origin` node and
/// reduces to a single output node, which is returned. This invariant lets
/// expressions compose: the output of one becomes the origin of the next.
///
///   - task: a new task node connected from `origin`.
///   - seq:  each operand is threaded in turn, the previous output feeding the
///           next operand's origin; the last output is returned.
///   - par:  every operand branches out from the shared `origin` and fans back
///           into a single intermediate node, giving the concurrent block one
///           beginning (`origin`) and one end (the returned node).
function lower(graph: Graph, expr: Expression, origin: number): number {
    switch (expr.type) {
        case "task": {
            const node = addNode(graph, { type: "task", name: expr.name });
            connect(graph, origin, node);
            return node;
        }
        case "seq": {
            let cur = origin;
            for (const operand of expr.operands) {
                cur = lower(graph, operand, cur);
            }
            return cur;
        }
        case "par": {
            const end = addNode(graph, { type: "intermediate" });
            for (const operand of expr.operands) {
                const branchEnd = lower(graph, operand, origin);
                connect(graph, branchEnd, end);
            }
            return end;
        }
        default:
            return unreachable(expr);
    }
}

/// Adds happens-before edges for the program's ordering constraints by linking
/// task nodes that share the constrained names.
function applyConstraints(graph: Graph, p: Program) {
    const byName = new Map<string, number[]>();
    graph.nodes.forEach((node, index) => {
        if (node.type === "task") {
            const list = byName.get(node.name) ?? [];
            list.push(index);
            byName.set(node.name, list);
        }
    });

    for (const { before, after } of p.constraints) {
        for (const from of byName.get(before) ?? []) {
            for (const to of byName.get(after) ?? []) {
                connect(graph, from, to);
            }
        }
    }
}

export function makeGraph(p: Program): Graph {
    const g: Graph = { nodes: [], edges: [] };
    // A single entry node that the whole program flows out of.
    const start = addNode(g, { type: "intermediate" });
    lower(g, p.expression, start);
    applyConstraints(g, p);
    return g;
}

/// Escapes a string for use as a Mermaid node label.
function escapeLabel(label: string): string {
    return label.replace(/"/g, "&quot;");
}

/// Serializes a graph into Mermaid `flowchart` source, laid out left to right.
///
/// Task nodes are rendered as labelled rectangles, while intermediate nodes
/// become small unlabelled circles.
export function toMermaid(graph: Graph): string {
    const lines = ["flowchart LR"];

    graph.nodes.forEach((node, index) => {
        const id = `n${index}`;
        if (node.type === "task") {
            lines.push(`    ${id}["${escapeLabel(node.name)}"]`);
        } else {
            lines.push(`    ${id}(( ))`);
        }
    });

    for (const { from, to } of graph.edges) {
        lines.push(`    n${from} --> n${to}`);
    }

    return lines.join("\n");
}

function unreachable(_: never): never {
    throw new Error("Unreachable");
}