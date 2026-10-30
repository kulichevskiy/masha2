import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ReviewsRail, visibleRange } from './reviews-rail'

afterEach(cleanup)

describe('visibleRange', () => {
  it('reports the reviews in view from the scroll position', () => {
    // nine items of 300px, a viewport of four
    expect(visibleRange(0, 1200, 2700, 9)).toEqual([0, 4])
    expect(visibleRange(600, 1200, 2700, 9)).toEqual([2, 6])
    // the last screen never runs past the end
    expect(visibleRange(1500, 1200, 2700, 9)).toEqual([5, 9])
    // a phone shows one at a time
    expect(visibleRange(300, 300, 2700, 9)).toEqual([1, 2])
  })

  it('reports nothing before there is anything to measure', () => {
    expect(visibleRange(0, 0, 0, 0)).toEqual([0, 0])
    expect(visibleRange(0, 1200, 0, 9)).toEqual([0, 0])
  })
})

function active(container: HTMLElement) {
  return [...container.querySelectorAll('[data-active]')].map((n) => n.getAttribute('data-active') === 'true')
}

describe('ReviewsRail', () => {
  it('lights the segments of the reviews in view and follows the scroll', () => {
    const { container, getByText } = render(
      <ReviewsRail footer={<a href="#">all reviews</a>}>
        <p>one</p>
        <p>two</p>
        <p>three</p>
        <p>four</p>
      </ReviewsRail>
    )
    expect(getByText('all reviews')).toBeTruthy()
    const rail = container.querySelector('.overflow-x-auto') as HTMLDivElement
    Object.defineProperty(rail, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(rail, 'clientWidth', { value: 400, configurable: true })
    fireEvent(window, new Event('resize'))
    expect(active(container)).toEqual([true, true, false, false])

    rail.scrollLeft = 400
    fireEvent.scroll(rail)
    expect(active(container)).toEqual([false, false, true, true])
  })
})
