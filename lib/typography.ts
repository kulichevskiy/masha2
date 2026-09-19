// Typesetting for copy that arrives as plain text — the home story's headings
// and paragraphs, whether shipped in the code or written in the admin.
//
// Two rules, applied at render time so the author never has to know they
// exist:
//   - a short function word ("a", "the", "and", "of", "I", …) never ends a
//     line: it is glued to the word after it with a no-break space;
//   - a dash between words is set as an en dash (–) and never starts a line:
//     it is glued to the word before it.
//
// Work is done line by line, so a heading's deliberate breaks survive.

const NO_BREAK = ' '

// Words that read as belonging to what follows. Compared lowercase, so a
// sentence-initial "The" counts too; "I" is the one capital that matters.
const SHORT_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'or', 'but', 'nor',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'as',
  'if', 'so', 'i',
])

const EM_DASH = '—'
const EN_DASH = '–'

// Leading quotes and brackets are not part of the word.
function bareWord(token: string): string {
  return token.replace(/^[("'“‘«]+/, '').toLowerCase()
}

function typesetLine(line: string): string {
  const tokens = line.split(' ')
  let out = ''
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] === EM_DASH ? EN_DASH : tokens[i]
    const next = tokens[i + 1]
    out += token
    if (next === undefined) break
    const glue =
      (token !== '' && next !== '' && SHORT_WORDS.has(bareWord(token))) || next === EM_DASH || next === EN_DASH
        ? NO_BREAK
        : ' '
    out += glue
  }
  return out
}

export function typeset(text: string): string {
  if (text === '') return text
  return text.split('\n').map(typesetLine).join('\n')
}
