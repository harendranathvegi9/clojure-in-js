/**
 * My simplified lisp-ish parser
 *
 * Each program is a single expression.
 */

"use strict";

var nodes = require("./ast-nodes.js");

/**
 * Returns an array of tokens, not tagged by category.
 * Each token is simply a string.
 *
 * Note that strings are returned with their opening
 * and closing quotes as part of the token, for simpler
 * parsing later.
 */
function tokenize(program) {
  var delimiters = /^[\[\]\(\)\s]/,
      tokens = [],
      currToken = "", currPos = 0, inString = false, char;

  while(currPos < program.length) {
    char = program[currPos];

    // Keep a flag for whether we're inside a string, since
    // normal delimiters don't trigger new tokens within strings.
    if(char == '"')
      inString = !inString;

    // If we encounter a delimiter when we're not in a string...
    if(!inString && delimiters.test(char)) {

      // Add the token we've been building up thus far (e.g. the
      // multiple characters in a single symbol token) as a token.
      if(currToken.length)
        tokens.push(currToken)

      // *And*, add a token for the delimiter character itself,
      // except if the delimiter is some form of space. Spaces
      // don't get a token.
      if(!/^\s/.test(char))
        tokens.push(char)

      // And, finally, reset the token.
      currToken = "";
    }

    else {
      currToken += char;
    }

    currPos++;
  }

  // Above, we're adding the tokens that we build up character
  // by character, like symbol names or int literals, to the token
  // list when we get to the delimiter after the token ends. But,
  // if such a token is the last token in the stream, we need to
  // add it too! This does that.
  if(currToken.length)
    tokens.push(currToken);

  return tokens;
}

/**
 * Responsible for parsing pieces that don't have any other
 * pieces nested inside them, i.e. symbols and primitives.
 */
function atomFromToken(token) {
  var match;

  if (match = /^"([^"]*)"$/.exec(token))
    return match[1];

  else if (match = /^\d+(\.\d+)?$/.exec(token))
    return Number(match[0]);

  else if (match = /^(true|false|nil)$/.exec(token))
    return match[0] === "nil" ? null : (match[0] === "true");

  else if (match = /^[^()"\[\]]+$/.exec(token))
    return match[0][0] === ":" ?
      nodes.keyword(match[0].slice(1)) : nodes.symbol(match[0]);

  else
    throw new SyntaxError("Not an atom: " + token);
}

/**
 * Parses a single (possibly compound) expression,
 * which every valid program should be.
 * Returns both the parsed expression and any tokens
 * remaining after that expression (of which there
 * should be none, if the whole program is one exp).
 */
function parseExpression(tokens) {
  tokens = tokens.slice(0);
  var result = {};

  // Our (sub) expression is a list or vector.
  if(tokens[0] === '(' || tokens[0] === '[') {
    const closingDelim = tokens[0] === '(' ? ')' : ']';

    // Set up the AST node.
    result.expr = (closingDelim == ')') ? nodes.list() : nodes.vector();

    // Skip past the opening delimiter.
    tokens = tokens.slice(1);

    while(tokens[0] !== closingDelim) {
      let entry = parseExpression(tokens);
      result.expr.push(entry.expr);

      tokens = entry.rest;
    }

    // Skip past the closing delimiter.
    result.rest = tokens.slice(1);

    return result;
  }

  // Our (sub) expression is an atom.
  else {
    return {expr: atomFromToken(tokens[0]), rest: tokens.slice(1)};
  }
}


function parse(program) {
  const parsed = parseExpression(tokenize(program));

  if(parsed.rest.length)
    throw new SyntaxError("Unexpected text after the program's main expression.");

  return parsed.expr;
}

module.exports = {
  tokenize: tokenize,
  atomFromToken: atomFromToken,
  parseExpression: parseExpression,
  parse: parse
};
