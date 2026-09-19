import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONTENT,
  normaliseStoryContent,
  paragraphs,
  lines,
} from './home-story-content'

describe('normaliseStoryContent', () => {
  it('falls back to the shipped copy for an empty blob', () => {
    expect(normaliseStoryContent({})).toEqual(DEFAULT_CONTENT)
    expect(normaliseStoryContent(null)).toEqual(DEFAULT_CONTENT)
  })

  it('keeps stored copy and defaults the rest', () => {
    const content = normaliseStoryContent({ hero: { heading: 'new heading' } })
    expect(content.hero.heading).toBe('new heading')
    expect(content.hero.body).toBe(DEFAULT_CONTENT.hero.body)
    expect(content.people).toEqual(DEFAULT_CONTENT.people)
  })

  it('treats a cleared field as "use the default"', () => {
    const content = normaliseStoryContent({ hero: { heading: '   ', cta: null } })
    expect(content.hero.heading).toBe(DEFAULT_CONTENT.hero.heading)
    expect(content.hero.cta).toBe(DEFAULT_CONTENT.hero.cta)
  })

  it('reads photo slots by position and never resizes a section', () => {
    const content = normaliseStoryContent({
      people: { photos: [{ path: 'home/a.jpg', alt: 'a' }] },
    })
    expect(content.people.photos).toHaveLength(3)
    expect(content.people.photos[0]).toEqual({ path: 'home/a.jpg', alt: 'a' })
    expect(content.people.photos[1]).toEqual(DEFAULT_CONTENT.people.photos[1])
  })

  it('ignores a photo array longer than the layout', () => {
    const content = normaliseStoryContent({
      hero: { photos: [{ path: 'home/a.jpg', alt: '' }, { path: 'home/b.jpg', alt: '' }] },
    })
    expect(content.hero.photos).toHaveLength(1)
    expect(content.hero.photos[0].path).toBe('home/a.jpg')
  })

  it('patches a single work category and keeps the other two', () => {
    const content = normaliseStoryContent({
      work: { categories: [null, { title: 'Kids' }] },
    })
    expect(content.work.categories[0]).toEqual(DEFAULT_CONTENT.work.categories[0])
    expect(content.work.categories[1].title).toBe('Kids')
    expect(content.work.categories[1].text).toBe(DEFAULT_CONTENT.work.categories[1].text)
  })

  it('survives junk in the column', () => {
    const content = normaliseStoryContent({ hero: 'nope', work: { categories: 'nope' } })
    expect(content.hero).toEqual(DEFAULT_CONTENT.hero)
    expect(content.work.categories).toEqual(DEFAULT_CONTENT.work.categories)
  })
})

describe('paragraphs', () => {
  it('splits on a blank line and trims', () => {
    expect(paragraphs('one\n\n  two  ')).toEqual(['one', 'two'])
  })

  it('keeps a single newline inside one paragraph', () => {
    expect(paragraphs('one\ntwo')).toEqual(['one\ntwo'])
  })

  it('returns nothing for empty copy', () => {
    expect(paragraphs('   ')).toEqual([])
  })
})

describe('lines', () => {
  it('splits a heading into its printed lines', () => {
    expect(lines('portrait\nand editorial\nphotographer')).toEqual([
      'portrait',
      'and editorial',
      'photographer',
    ])
  })
})
