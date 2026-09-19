import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CONTENT,
  normaliseStoryContent,
  focusPosition,
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
    expect(content.people.photos[0]).toEqual({
      path: 'home/a.jpg',
      alt: 'a',
      focus: DEFAULT_CONTENT.people.photos[0].focus,
    })
    expect(content.people.photos[1]).toEqual(DEFAULT_CONTENT.people.photos[1])
  })

  it('ships the crops the layout had, with the hero anchored left for phones', () => {
    const focus = (key: keyof typeof DEFAULT_CONTENT) => DEFAULT_CONTENT[key].photos.map((p) => p.focus)
    // These were the hardcoded object-position values before the crop moved
    // into the content; 50/50 is CSS "center", the old default.
    expect(focus('hero')).toEqual([{ x: 20, y: 30 }])
    expect(focus('people')).toEqual([{ x: 50, y: 20 }, { x: 50, y: 30 }, { x: 50, y: 50 }])
    expect(focus('session')).toEqual([{ x: 50, y: 50 }])
    expect(focus('behind')).toEqual([{ x: 50, y: 20 }])
    expect(focus('workshops')).toEqual([{ x: 50, y: 35 }])
    expect(focus('invitation')).toEqual([{ x: 50, y: 40 }])
    expect(focus('work')).toEqual([])
    expect(focus('video')).toEqual([])
  })

  it('keeps a stored focus, clamps it to the frame, and ignores junk', () => {
    const content = normaliseStoryContent({
      hero: { photos: [{ focus: { x: 80, y: 10 } }] },
      session: { photos: [{ focus: { x: 140, y: -5 } }] },
      workshops: { photos: [{ focus: { x: 'left', y: null } }] },
    })
    expect(content.hero.photos[0].focus).toEqual({ x: 80, y: 10 })
    expect(content.session.photos[0].focus).toEqual({ x: 100, y: 0 })
    expect(content.workshops.photos[0].focus).toEqual(DEFAULT_CONTENT.workshops.photos[0].focus)
    // The rest of the slot still falls back on its own.
    expect(content.hero.photos[0].path).toBe('')
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

describe('focusPosition', () => {
  it('turns a focus into a CSS object-position', () => {
    expect(focusPosition({ path: '', alt: '', focus: { x: 20, y: 30 } })).toBe('20% 30%')
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
