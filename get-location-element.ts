import { customElements, Event, HTMLElement } from 'dom'
import { wait } from './wait.ts'
import { getLocs, type Loc, type TemperatureUnit } from './weather.ts'
import { getParams, listenForPopState, pushParams } from './win.ts'

export class LocEvent extends Event {
  loc: Loc
  tempUnit: TemperatureUnit

  constructor(loc: Loc, tempUnit: TemperatureUnit) {
    super('loc', {
      bubbles: true,
      cancelable: true
    })

    this.loc = loc
    this.tempUnit = tempUnit
  }
}

export class GetLocationElement extends HTMLElement {
  static defaultName = 'get-location'

  static define(name = this.defaultName) {
    customElements.define(name, this)
  }

  static observedAttributes = ['disabled']

  #requests: Promise<void>[] = []
  #abortController?: AbortController

  #chosenLocation?: Loc

  #template = (() => {
    const el = this.ownerDocument.createElement('template')
    el.innerHTML = `
      <form>
        <p>
          <label>
            <span>Location:</span>
            <input type=search name=search placholder="Location…" autofocus>
            <select name=unit>
              <option value=celsius>ºC</option>
              <option value=fahrenheit>ºF</option>
            </select>
          </label>
          <button type=submit>Search</button>
        </p>
      </form>
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

    this.#abortController = new AbortController()
    this.addEventListener('submit', this, { signal: this.#abortController.signal })
    this.addEventListener('change', this, { signal: this.#abortController.signal })

    listenForPopState(params => {
      if (params.search && params.unit) {
        this.searchValue = params.search
        this.tempUnitValue = params.unit
        this.getLocation(this.searchValue, true)
      }
    }, this.#abortController.signal)

    const currentPageParams = getParams(this)

    if (!!currentPageParams.search && this.searchValue !== currentPageParams.search) {
      this.searchValue = currentPageParams.search
      this.tempUnitValue = currentPageParams.unit
      this.getLocation(currentPageParams.search, true)
    }
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

  handleEvent(e: Event) {
    if (e.type === 'submit') {
      return this.handleSubmit(e as SubmitEvent)
    }

    if (e.type === 'change') {
      return this.handleChange(e)
    }

    console.warn('no event handler for', e)
  }

  handleChange(e: Event) {
    const target = e.target as HTMLElement | undefined
    if (!target) { return }

    if (target.tagName === 'SELECT') {
      if (this.#chosenLocation) {
        pushParams({ search: this.#chosenLocation.name, unit: this.tempUnitValue })
        const e = new LocEvent(this.#chosenLocation, this.tempUnitValue)
        this.dispatchEvent(e)
      } else if (this.searchValue) {
        this.getLocation(this.searchValue, false)
      }
    }
  }

  handleSubmit(e: SubmitEvent) {
    const form = e.submitter?.closest('form') as HTMLFormElement | undefined
    if (!form) { return }

    e.preventDefault()
    e.stopPropagation()

    if (this.hasAttribute('disabled')) {
      console.warn('form submitted when this element is disabled', e)
      return
    }

    const data = new FormData(form)
    const search = data.get('search')

    if (!search) { return }
    this.getLocation(search.toString(), false)
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'disabled') {
      // NOTE: cascade disabled to form controls
      const input = this.querySelector('input')
      const button = this.querySelector('button')
      const isDisabled = typeof newValue === 'string'

      input && (input.disabled = isDisabled)
      button && (button.disabled = isDisabled)
    }
  }

  getLocation(search: string, skipPushParams: boolean) {
    this.#requests.push(this.#getLocation(search, skipPushParams))
  }

  async #getLocation(search: string, skipPushParams: boolean) {
    console.warn('get location', search)
    this.setAttribute('fetching', '')
    this.setAttribute('disabled', '')
    const start = performance.now()

    if (!skipPushParams) {
      pushParams({ search, unit: this.tempUnitValue })
    }

    if (!self.Deno) {
      await wait(1_000)
    }

    try {
      // TODO: store the locs somewhere and update a datalist for autocomplete during the input event and then on submit just look up the right loc from the list?
      const locs = await getLocs(search)
      const loc = locs.at(0)

      if (loc) {
        this.#chosenLocation = loc
        const e = new LocEvent(loc, this.tempUnitValue)
        this.dispatchEvent(e)
      } else {
        console.error('cannot find', loc)
      }
    } finally {
      const duration = Math.round(performance.now() - start)
      console.debug(`took ${duration}ms to search and get location`)
      this.removeAttribute('fetching')
      this.removeAttribute('disabled')
    }
  }
}
