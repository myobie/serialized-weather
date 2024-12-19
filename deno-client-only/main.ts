import { serveDir } from 'jsr:@std/http/file-server'
import { stripTSTypes } from './strip-ts-types.ts'

Deno.serve(async req => {
  const url = new URL(req.url)
  const pathname = url.pathname

  if (pathname === '/') {
    const code = await Deno.readTextFile('./index.html')

    return new Response(code, {
      headers: {
        'content-type': 'text/html'
      }
    })
  }

  if (pathname.endsWith('.ts')) {
    const relpath = `./${pathname.replace(/^\//, '')}`
    const contents = await stripTSTypes(relpath)

    return new Response(contents, {
      headers: {
        'content-type': 'application/javascript'
      }
    })
  }

  return serveDir(req, { fsRoot: '.' })
})
