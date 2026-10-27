import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Body, Fill, Bleed, Paragraphs } from './story-ui'
const frame = { id: 'one', src: '/photo.jpg', alt: 'Portrait', width: 20, height: 30 }
describe('home story presentation contracts', () => {
  it('keeps body emphasis and frame tone distinct', () => {
    expect(renderToStaticMarkup(<Body strong>Quiet portrait</Body>)).toContain('text-black')
    expect(
      renderToStaticMarkup(
        <Body tone="frame">
          <em>Quiet portrait</em>
        </Body>,
      ),
    ).toContain('text-white/90')
  })
  it('renders real frames and empty placeholders without inventing imagery', () => {
    expect(renderToStaticMarkup(<Fill frame={null} />)).toBe('')
    expect(renderToStaticMarkup(<Fill frame={frame} position="top" priority />)).toContain(
      'alt="Portrait"',
    )
    const html = renderToStaticMarkup(
      <Bleed frame={frame} height="h-96" align="center" controls={<button>Play</button>}>
        Story
      </Bleed>,
    )
    expect(html).toContain('text-center')
    expect(html).toContain('Play')
  })
  it('handles empty, single and multiple paragraphs', () => {
    expect(renderToStaticMarkup(<Paragraphs text="" />)).toBe('')
    expect(renderToStaticMarkup(<Paragraphs text="One" />)).toContain('One')
    const html = renderToStaticMarkup(<Paragraphs text={'One\n\nTwo'} tone="frame" />)
    expect(html.match(/<p /g)).toHaveLength(2)
  })
})
