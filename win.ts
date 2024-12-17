import { defaultTemperatureUnit, type TemperatureUnit } from './weather.ts'

// NOTE: this file is to hold things that only work in a real browser window

const isServer = !!self.Deno

type Params = {
  search?: string
  unit: TemperatureUnit
}

export function getParams(el: HTMLElement): Params {
  const view = el.ownerDocument.defaultView
  if (!view) { return { unit: defaultTemperatureUnit } }

  const url = new URL(view.location.href)

  const search = url.searchParams.get('search') || undefined
  const unitParam = url.searchParams.get('unit')

  let unit: TemperatureUnit

  if (unitParam === 'fahrenheit') {
    unit = 'fahrenheit'
  } else {
    unit = 'celsius'
  }

  return { search, unit }
}

export function listenForPopState(callback: (params: Params) => void, signal?: AbortSignal): void {
  if (isServer) { return }

  globalThis.addEventListener('popstate', e => {
    console.warn('popstate', e)
    if (e.state.search || e.state.unit) { callback(e.state) }
  }, { signal })
}

export function pushParams(params: Params): void {
  if (isServer) { return }

  const urlParams = new URLSearchParams()
  params.search && urlParams.set('search', params.search)
  params.unit && urlParams.set('unit', params.unit)

  const url = `/?${urlParams.toString()}`

  globalThis.history.pushState(params, '', url)
}
