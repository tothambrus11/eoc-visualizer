@{%
const moo = require("moo");

// Lexer: inline whitespace (spaces/tabs) is discarded; newlines are explicit
// tokens (they separate the expression from constraints, and constraints from
// one another). A run of blank lines collapses into a single NL token.
const lexer = moo.compile({
  ws:   { match: /[ \t]+/ },                 // discarded below
  nl:   { match: /(?:[ \t]*\r?\n)+[ \t]*/, lineBreaks: true },
  par:  "||",
  seq:  ";",
  lt:   "<",
  lparen: "(",
  rparen: ")",
  task: /[a-z0-9']+/,
});

// Drop whitespace tokens entirely.
const _next = lexer.next.bind(lexer);
lexer.next = function () {
  let tok;
  while ((tok = _next()) && tok.type === "ws") {}
  return tok;
};

// Build a flat n-ary node from `first (op rest):*`. When there is only a single
// operand (no operator), the operand is returned as-is (no wrapper node), so
// chains like `a || b || c` collapse into one node while parenthesized groups
// remain distinct operands.
const nary = (type) => (d) => {
  const rest = d[1].map((r) => r[1]);
  return rest.length === 0 ? d[0] : { type, operands: [d[0], ...rest] };
};
%}

@lexer lexer

# ----- Top level -----------------------------------------------------------
# A program is an expression optionally followed by newline-separated
# constraints. Leading/trailing newlines are tolerated.

main -> %nl:? program %nl:? {% (d) => d[1] %}

program -> expr constraints {%
    (d) => ({ type: "program", expression: d[0], constraints: d[1] })
%}

constraints -> null {% () => [] %}
    | constraints %nl constraint {% (d) => d[0].concat([d[2]]) %}

constraint -> task %lt task {%
    (d) => ({ before: d[0].name, after: d[2].name })
%}

# ----- Expressions (with precedence) --------------------------------------
# Lowest precedence: || (parallel). Higher: ; (sequence). Chains of the same
# operator flatten into a single n-ary node; parentheses preserve grouping.

expr -> par {% id %}

par -> seq (%par seq):*      {% nary("par") %}

seq -> primary (%seq primary):* {% nary("seq") %}

primary -> task                  {% id %}
    | %lparen expr %rparen       {% (d) => d[1] %}

# ----- Leaf ----------------------------------------------------------------
# task := one or more of [a-z0-9']

task -> %task {% (d) => ({ type: "task", name: d[0].value }) %}
