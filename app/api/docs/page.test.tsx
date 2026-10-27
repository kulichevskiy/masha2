import { it,expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Page from './page'
it('publishes resource methods, optimistic concurrency and upload instructions',()=>{
 const html=renderToStaticMarkup(<Page />)
 expect(html).toContain('If-Match');expect(html).toContain('uploads');expect(html).toContain('PATCH');expect(html).toContain('DELETE')
})
