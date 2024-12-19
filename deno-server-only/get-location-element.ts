import { customElements, HTMLElement } from 'dom'
import { GeoEvent, getGeo } from './geo.ts'
import { getParams, listenForParamsChange, paramsChange, pushParams, pushURL } from './params.ts'
import { defaultTemperatureUnit, getLocs, type Loc, type TemperatureUnit } from './weather.ts'

const isBrowser = !self.Deno

export class GetLocationElement extends HTMLElement {
  static defaultName = 'get-location'

  static define(name = this.defaultName) {
    customElements.define(name, this)
  }

  #abortController?: AbortController
  #requests: Promise<unknown>[] = []
  #requestTag = 0
  #lastKnownSearchValue: string | null = null
  #inputTimeout = 0

  #template = (() => {
    const el = this.ownerDocument.createElement('template')
    el.innerHTML = `
      <form>
        <label>
          <span>Location:</span>
          <input type=search name=search placholder="Location…" autocomplete=off>
        </label>
        <label>
          <span>Unit:</span>
          <select name=unit>
            <option value=celsius>ºC</option>
            <option value=fahrenheit>ºF</option>
          </select>
        </label>
        <button type=submit>Search</button>
      </form>
      <locations-list></locations-list>
    `
    return el
  })()

  get isReady() {
    return Promise.all([...this.#requests])
  }

  connectedCallback() {
    // NOTE: build out the form if it's not already there
    if (this.children.length === 0) {
      this.replaceChildren(this.#template.content.cloneNode(true))
    }

    if (isBrowser) {
      const geo = this.querySelector('button[data-geo]') as HTMLButtonElement | undefined
      geo && (geo.disabled = false)
    }

    this.#abortController = new AbortController()
    this.addEventListener('change', this, { signal: this.#abortController.signal })
    this.addEventListener('click', this, { signal: this.#abortController.signal })
    this.addEventListener('input', this, { signal: this.#abortController.signal })
    this.addEventListener('submit', this, { signal: this.#abortController.signal })
    listenForParamsChange(this, this.#abortController.signal)

    this.handleParamsChange()
    this.#lastKnownSearchValue = this.searchValue
  }

  disconnectedCallback() {
    this.#abortController?.abort()
  }

  get searchValue(): string | null {
    const input = this.querySelector('input')
    return input?.value || null
  }

  set searchValue(newValue: string) {
    const input = this.querySelector('input')
    input && (input.value = newValue)
  }

  get tempUnitValue(): TemperatureUnit {
    const select = this.querySelector('select')
    const value = select?.value
    if (value === 'fahrenheit') {
      return 'fahrenheit'
    }
    return 'celsius'
  }

  set tempUnitValue(newValue: string) {
    const select = this.querySelector('select')

    if (select) {
      for (const option of Array.from(select.options)) {
        if (option.value === newValue) {
          option.selected = true
          break
        }
      }
    }
  }

  async #getGeo() {
    console.warn('get geo!')
    const pos = await getGeo()
    console.warn('pos', pos)

    if (!pos) { return }

    const params = getParams(this)

    if ('id' in params) {
      pushParams({ unit: params.unit }, this)
    }

    this.dispatchEvent(new GeoEvent(pos.coords.latitude, pos.coords.longitude, 'Current location'))
    this.clearLocations()
  }

  handleEvent(e: Event) {
    if (e.type === 'change') {
      console.warn('change event', e)
      return this.handleChange(e)
    }

    if (e.type === 'click') {
      console.warn('click event', e)
      return this.handleClick(e as MouseEvent)
    }

    if (e.type === 'input') {
      console.warn('input event', e)
      return this.handleInput(e as InputEvent)
    }

    if (e.type === paramsChange) {
      console.warn('paramschange event', e)
      return this.handleParamsChange()
    }

    if (e.type === 'submit') {
      console.warn('submit event', e)
      return this.handleSubmit(e as SubmitEvent)
    }

    console.warn('no event handler for', e)
  }

  handleChange(e: Event) {
    const target = e.target as HTMLElement | undefined
    if (!target) { return }

    if (target.tagName === 'SELECT') {
      e.stopPropagation()

      const el = target as HTMLSelectElement
      const currentParams = getParams(this)
      const unit: TemperatureUnit = el.value === 'fahrenheit' ? el.value : defaultTemperatureUnit

      currentParams.unit = unit
      pushParams({ ...currentParams }, this)
    }
  }

  handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement | undefined
    if (!target) { return }

    const button = target.closest('button')

    if (button && button.hasAttribute('data-geo')) {
      return this.#getGeo()
    }

    const anchor = target.closest('a')
    if (!anchor) { return }

    e.preventDefault()
    e.stopPropagation()

    pushURL(anchor.href, this)
    this.clearLocations()
  }

  handleInput(e: InputEvent) {
    const target = e.target as HTMLElement | undefined
    if (!target) { return }

    if (target.tagName === 'INPUT') {
      if (this.searchValue && this.searchValue.length > 2) {
        clearTimeout(this.#inputTimeout)

        this.#inputTimeout = setTimeout(() => {
          if (this.searchValue && this.#lastKnownSearchValue !== this.searchValue) {
            this.getLocations(this.searchValue)
          }
        }, 250)
      }
    }
  }

  handleParamsChange() {
    const currentPageParams = getParams(this)

    if ('search' in currentPageParams && this.searchValue !== currentPageParams.search) {
      this.searchValue = currentPageParams.search
      this.tempUnitValue = currentPageParams.unit || defaultTemperatureUnit
      this.getLocations(currentPageParams.search)
    }
  }

  handleSubmit(e: SubmitEvent) {
    const form = e.submitter?.closest('form') as HTMLFormElement | undefined
    if (!form) { return }

    e.preventDefault()
    e.stopPropagation()

    const data = new FormData(form)
    const search = data.get('search')

    if (!search) { return }
    this.getLocations(search.toString())
  }

  getLocations(search: string) {
    this.#requestTag += 1
    this.#lastKnownSearchValue = search
    const promise = this.#getLocations(search, this.#requestTag)
    this.#requests.push(promise)
    return promise
  }

  async #getLocations(search: string, tag: number) {
    console.warn('get locations', search)
    this.setAttribute('fetching', '')
    const start = performance.now()

    pushParams({ search, unit: this.tempUnitValue }, this)

    try {
      const locs = await getLocs(search)

      if (this.#requestTag === tag) {
        this.updateLocations(locs)
      }

      return locs
    } finally {
      const duration = Math.round(performance.now() - start)
      console.debug(`took ${duration}ms to get locations`)
      this.removeAttribute('fetching')
    }
  }

  updateLocations(locs: Loc[]) {
    console.warn('update locations')

    const list = this.querySelector('locations-list') as LocationsListElement | undefined

    if (!list) {
      console.error('cannot find locations-list')
      return
    }

    list.locations = locs
  }

  clearLocations() {
    this.searchValue = ''
    this.updateLocations([])
  }
}
