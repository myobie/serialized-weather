import { customElements, HTMLElement } from 'dom'
import { LocEvent } from './get-location-element.ts'
import { wait } from './wait.ts'
import { getWeather, type Loc, type TemperatureUnit, type Weather } from './weather.ts'
import { getParams } from './win.ts'

export class GetWeatherElement extends HTMLElement {
  static defaultName = 'get-weather'

  static define(name = this.defaultName) {
    customElements.define(name, this)
  }

  #atLeastOneResult = Promise.withResolvers<void>()
  #requests: Promise<void>[] = [this.#atLeastOneResult.promise]
  #abortController?: AbortController

  get isReady() {
    return Promise.all([...this.#requests])
  }

  constructor() {
    super()
  }

  connectedCallback() {
    this.#abortController = new AbortController()
    this.addEventListener('loc', this, { signal: this.#abortController.signal })

    const currentSearch = getParams(this)

    if (!currentSearch) {
      this.#atLeastOneResult.resolve()
    }
  }

  disconnectedCallback() {
    this.#abortController?.abort()
  }

  handleEvent(e: Event) {
    if (e.type === 'loc') {
      return this.handleLoc(e as LocEvent)
    }

    console.warn('no event handler for', e)
  }

  handleLoc(e: LocEvent) {
    this.#requests.push(this.#getWeather(e.loc, e.tempUnit))
  }

  hasResultsElement() {
    return !!this.querySelector('[data-results]')
  }

  getResultsElement() {
    let el = this.querySelector('[data-results]')

    if (!el) {
      el = this.ownerDocument.createElement('div')
      el.setAttribute('data-results', '')
      this.append(el)
    }

    return el
  }

  async #getWeather(loc: Loc, tempUnit: TemperatureUnit) {
    console.warn('get weather!', loc)
    this.setAttribute('fetching', '')
    const start = performance.now()

    if (!self.Deno) {
      await wait(1_000)
    }

    try {
      this.handleWeather(await getWeather(loc, tempUnit))
    } finally {
      const duration = Math.round(performance.now() - start)
      console.debug(`took ${duration}ms to search and get weather`)
      this.removeAttribute('fetching')
      this.#atLeastOneResult.resolve()
    }
  }

  handleWeather(w: Weather) {
    const el = this.ownerDocument.createElement('template')

    el.innerHTML = `
      <h1>${w.loc.name}, ${w.loc.country}</h1>
      <h2>Current Conditions</h2>
      <p>Temp: ${w.current.temperature_2m}${w.current_units.temperature_2m}</p>
      <p>Feels like: ${w.current.apparent_temperature}${w.current_units.apparent_temperature}</p>
    `

    this.getResultsElement().replaceChildren(el.content.cloneNode(true))
    this.removeAttribute('fetching')
  }
}
