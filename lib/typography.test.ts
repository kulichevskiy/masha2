import { describe, it, expect } from 'vitest'
import { typeset } from './typography'

const NB = ' '

describe('typeset', () => {
  it('glues short function words to the word after them', () => {
    expect(typeset('a portrait in the room')).toBe(`a${NB}portrait in${NB}the${NB}room`)
    expect(typeset('I photograph people')).toBe(`I${NB}photograph people`)
  })

  it('sets a dash as an en dash glued to the word before it', () => {
    expect(typeset('people — their character')).toBe(`people${NB}– their character`)
    // An en dash already in the copy gets the same treatment.
    expect(typeset('people – their character')).toBe(`people${NB}– their character`)
  })

  it('leaves longer words and the last word alone', () => {
    expect(typeset('stay with me')).toBe('stay with me')
    expect(typeset('look at')).toBe('look at')
  })

  it('sees through leading punctuation', () => {
    expect(typeset('(a little) and "the rest"')).toBe(`(a${NB}little) and${NB}"the${NB}rest"`)
  })

  it('works line by line so headings keep their breaks', () => {
    expect(typeset('portrait\nand editorial\nphotographer')).toBe(`portrait\nand${NB}editorial\nphotographer`)
  })

  it('is idempotent', () => {
    const once = typeset('a short film built around you — your gestures, your pace')
    expect(typeset(once)).toBe(once)
  })

  it('handles an empty string', () => {
    expect(typeset('')).toBe('')
  })
})
