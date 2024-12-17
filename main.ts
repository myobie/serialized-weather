import { serveDir } from 'jsr:@std/http/file-server'
import { parseHTML } from 'npm:linkedom'
import { GetLocationElement } from './get-location-element.ts'
import { GetWeatherElement } from './get-weather-element.ts'
import { serializeAsync } from './serialize.ts'
import { stripTSTypes } from './strip-ts-types.ts'

Deno.serve(async req => {
  const url = new URL(req.url)
  const pathname = url.pathname

  if (pathname === '/') {
    const code = await Deno.readTextFile('./index.html')
    const linkie = parseHTML(code, { location: url })

    // NOTE: each custom element must be unique per request because
    // customElements are per document sadly
    const KGetWeatherElement = class extends GetWeatherElement {}
    linkie.customElements.define(KGetWeatherElement.defaultName, KGetWeatherElement)

    const KGetLocationElement = class extends GetLocationElement {}
    linkie.customElements.define(KGetLocationElement.defaultName, KGetLocationElement)

    // NOTE: turn that live dom into html
    const result = await serializeAsync(linkie.document.documentElement)

    // NOTE: hurry up GC
    // linkie.document.body.replaceChildren()

    // NOTE: I serialized the <html> element so I don't have the doctype in the result
    return new Response(`<!doctype html>${result}`, {
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
