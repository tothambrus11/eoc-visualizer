import { parseProgram } from "./parse";

describe("concurrency parser", () => {
  test("parses a single task", () => {
    const p = parseProgram("a");
    expect(p.expression).toEqual({ type: "task", name: "a" });
    expect(p.constraints).toEqual([]);
  });

  test("parses sequence", () => {
    const p = parseProgram("a ; b");
    expect(p.expression).toEqual({
      type: "seq",
      operands: [
        { type: "task", name: "a" },
        { type: "task", name: "b" },
      ],
    });
  });

  test("parses parallel", () => {
    const p = parseProgram("a || b");
    expect(p.expression).toEqual({
      type: "par",
      operands: [
        { type: "task", name: "a" },
        { type: "task", name: "b" },
      ],
    });
  });

  test("sequence binds tighter than parallel", () => {
    const p = parseProgram("a ; b || c ; d");
    expect(p.expression).toEqual({
      type: "par",
      operands: [
        {
          type: "seq",
          operands: [
            { type: "task", name: "a" },
            { type: "task", name: "b" },
          ],
        },
        {
          type: "seq",
          operands: [
            { type: "task", name: "c" },
            { type: "task", name: "d" },
          ],
        },
      ],
    });
  });

  test("parentheses override precedence", () => {
    const p = parseProgram("a ; (b || c)");
    expect(p.expression).toEqual({
      type: "seq",
      operands: [
        { type: "task", name: "a" },
        {
          type: "par",
          operands: [
            { type: "task", name: "b" },
            { type: "task", name: "c" },
          ],
        },
      ],
    });
  });

  test("whitespace is non-significant (except newlines)", () => {
    expect(parseProgram("a||b").expression).toEqual(
      parseProgram("   a   ||   b   ").expression
    );
  });

  test("multi-char task names with digits and primes", () => {
    const p = parseProgram("task1 ; a'");
    expect(p.expression).toEqual({
      type: "seq",
      operands: [
        { type: "task", name: "task1" },
        { type: "task", name: "a'" },
      ],
    });
  });

  test("parses constraints on following lines", () => {
    const p = parseProgram("a || b || c\na < b\nb < c");
    expect(p.constraints).toEqual([
      { before: "a", after: "b" },
      { before: "b", after: "c" },
    ]);
  });

  test("allows blank lines and surrounding whitespace", () => {
    const p = parseProgram("  a || b  \n\n  a < b  \n");
    expect(p.constraints).toEqual([{ before: "a", after: "b" }]);
  });

  test("flattens a sequence chain into one n-ary node", () => {
    const p = parseProgram("a ; b ; c");
    expect(p.expression).toEqual({
      type: "seq",
      operands: [
        { type: "task", name: "a" },
        { type: "task", name: "b" },
        { type: "task", name: "c" },
      ],
    });
  });

  test("flattens a parallel chain into one n-ary node", () => {
    const p = parseProgram("a || b || c || d");
    expect(p.expression).toEqual({
      type: "par",
      operands: [
        { type: "task", name: "a" },
        { type: "task", name: "b" },
        { type: "task", name: "c" },
        { type: "task", name: "d" },
      ],
    });
  });

  test("parentheses are preserved as a single operand (not flattened)", () => {
    // (a || b) || c keeps the explicit grouping rather than flattening to [a,b,c].
    const p = parseProgram("(a || b) || c");
    expect(p.expression).toEqual({
      type: "par",
      operands: [
        {
          type: "par",
          operands: [
            { type: "task", name: "a" },
            { type: "task", name: "b" },
          ],
        },
        { type: "task", name: "c" },
      ],
    });
  });

  test("parentheses on the left operand", () => {
    const p = parseProgram("(a || b) ; c");
    expect(p.expression).toEqual({
      type: "seq",
      operands: [
        {
          type: "par",
          operands: [
            { type: "task", name: "a" },
            { type: "task", name: "b" },
          ],
        },
        { type: "task", name: "c" },
      ],
    });
  });

  test("supports Windows CRLF line endings", () => {
    const p = parseProgram("a || b\r\na < b");
    expect(p.expression).toEqual({
      type: "par",
      operands: [
        { type: "task", name: "a" },
        { type: "task", name: "b" },
      ],
    });
    expect(p.constraints).toEqual([{ before: "a", after: "b" }]);
  });

  test("throws on trailing operator (incomplete input)", () => {
    expect(() => parseProgram("a ;")).toThrow();
  });

  test("throws on empty input", () => {
    expect(() => parseProgram("")).toThrow();
    expect(() => parseProgram("   \n ")).toThrow();
  });

  test("rejects a constraint on the expression line", () => {
    // `a < b` alone is not a valid program: the first line must be an expression.
    expect(() => parseProgram("a < b")).toThrow();
  });

  test("rejects two constraints on the same line", () => {
    expect(() => parseProgram("a\nb < c d < e")).toThrow();
  });

  test("rejects empty parentheses and uppercase tasks", () => {
    expect(() => parseProgram("()")).toThrow();
    expect(() => parseProgram("A")).toThrow();
  });
});
