import { customElements, HTMLElement } from "#dom";
import { GeoEvent } from "./geo.ts";
import { getParams, listenForParamsChange, paramsChange } from "./params.ts";
import {
  defaultTemperatureUnit,
  getLoc,
  getWeather,
  type Loc,
  type TemperatureUnit,
  type Weather,
} from "./weather.ts";
import { wmo } from "./wmo.ts";

export class GetWeatherElement extends HTMLElement {
  static defaultName = "get-weather";

  static define(name = this.defaultName) {
    customElements.define(name, this);
  }

  #abortController?: AbortController;
  #atLeastOneResult = Promise.withResolvers<void>();
  #requests: Promise<unknown>[] = [this.#atLeastOneResult.promise];
  #requestTag = 0;
  #lastLoc?: Loc;
  #lastUnit = defaultTemperatureUnit;

  currentWeather?: Weather;

  get isReady() {
    return Promise.all([...this.#requests]);
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.#abortController = new AbortController();
    listenForParamsChange(this, this.#abortController.signal);
    this.addEventListener("geo", this);

    if (!this.hasResultsElement()) {
      this.handleParamsChange();
    }
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }

  handleEvent(e: Event) {
    if (e.type === paramsChange) {
      return this.handleParamsChange();
    }

    if (e.type === "geo") {
      return this.handleGeo(e as GeoEvent);
    }

    console.warn("no event handler for", e);
  }

  handleGeo(e: GeoEvent) {
    const loc: Loc = {
      id: 0,
      latitude: e.longitude,
      longitude: e.longitude,
      timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
      name: e.name,
      country_code: "",
      country: "",
      formatted_name: e.name,
    };

    const { unit = defaultTemperatureUnit } = getParams(this);
    this.getWeather(loc, unit);
  }

  handleParamsChange() {
    const currentParams = getParams(this);
    const unit = currentParams.unit || defaultTemperatureUnit;

    if (
      "id" in currentParams &&
      (this.#lastLoc?.id !== currentParams.id || this.#lastUnit !== unit)
    ) {
      this.getWeather(currentParams.id, unit);
    } else if (this.#lastLoc?.id === 0 && this.#lastUnit !== unit) {
      this.getWeather(this.#lastLoc, unit);
    } else {
      // NOTE: we won't be looking for any weather since we don't know what to look for
      this.#atLeastOneResult.resolve();
    }
  }

  hasResultsElement() {
    return !!this.querySelector("[data-results]");
  }

  getResultsElement() {
    let el = this.querySelector("[data-results]");

    if (!el) {
      el = this.ownerDocument.createElement("div");
      el.setAttribute("data-results", "");
      this.append(el);
    }

    return el;
  }

  // TODO: consider clearing out the old weather while a fetch is happening?
  // TODO: show some error if a fetch fails
  getWeather(
    locOrId: Loc | number,
    tempUnit: TemperatureUnit = defaultTemperatureUnit
  ) {
    this.#requestTag += 1;
    const promise = this.#getWeather(locOrId, tempUnit, this.#requestTag);
    this.#requests.push(promise);
    return promise;
  }

  async #getWeather(
    locOrId: Loc | number,
    tempUnit: TemperatureUnit,
    tag: number
  ) {
    console.warn("get weather!", locOrId);
    this.setAttribute("fetching", "");
    const start = performance.now();

    try {
      this.#lastUnit = tempUnit;

      let loc;

      if (typeof locOrId === "number") {
        console.warn("getting location for id", locOrId);
        loc = await getLoc(locOrId);
      } else {
        loc = locOrId;
      }

      if (loc) {
        this.#lastLoc = loc;
        const weather = await getWeather(loc, tempUnit);

        if (this.#requestTag === tag) {
          this.handleWeather(weather);
        }
      }
    } finally {
      const duration = Math.round(performance.now() - start);
      console.debug(`took ${duration}ms to get weather`);
      this.removeAttribute("fetching");
      this.#atLeastOneResult.resolve();
    }
  }

  handleWeather(w: Weather) {
    this.currentWeather = w;

    if (w.current.is_day) {
      this.setAttribute("mode", "day");
    } else {
      this.setAttribute("mode", "night");
    }

    const el = this.ownerDocument.createElement("template");

    const hoursMarkup = w.hourly
      .map((hour) => {
        const icon = wmo.get(hour.weather_code);

        return `
        <li>
          <span class=time-and-icon>
            ${
              icon &&
              `<span class=icon><img alt="${icon}" src="/icons/wi-${icon}.svg" width=32></span>`
            }
            <span class=hour>${hour.time.getHours()}:00</span>
          </span>
          <span class=temp>${hour.temperature_2m}${
          w.hourly_units.temperature_2m
        }</span>
          <span class=feels-like>(${hour.apparent_temperature}${
          w.hourly_units.apparent_temperature
        })</span>
          <span class=precip>${hour.precipitation_probability}%</span>
        </li>
      `;
      })
      .join("");

    const daysMarkup = w.daily
      .map((day) => {
        const title = new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: w.loc.timezone,
        }).format(day.time);

        const sunrise = new Intl.DateTimeFormat("en-GB", {
          minute: "2-digit",
          hour: "2-digit",
          timeZone: w.loc.timezone,
        }).format(day.sunrise);

        const sunset = new Intl.DateTimeFormat("en-GB", {
          minute: "2-digit",
          hour: "2-digit",
          timeZone: w.loc.timezone,
        }).format(day.sunset);

        const icon = wmo.get(day.weather_code);

        return `
        <div class=day data-weather-code="${
          day.weather_code
        }" data-icon="${icon}">
          <div class=leading>
            <h3>${title}</h3>
            ${
              icon &&
              `<p class=icon><img alt="${icon}" src="/icons/wi-${icon}.svg" width=64></p>`
            }
          </div>
          <div class=trailing>
            <p class=temp>
              <span class=high>
                <abbr title=high>👆</abbr> ${day.temperature_2m_max}${
          w.daily_units.temperature_2m_max
        }
              </span>
              <span class=low>
                <abbr title=low>👇</abbr> ${day.temperature_2m_min}${
          w.daily_units.temperature_2m_min
        }
              </span>
            </p>
            <p class=precip>${
              day.precipitation_probability_max
            }% chance of precip</p>
            <p class=sun>
              <span>
                <img alt="${icon}" src="/icons/wi-sunrise.svg" width=24>
                <span class=rise>${sunrise}</span>
              </span>
              <span>
                <img alt="${icon}" src="/icons/wi-sunset.svg" width=24>
                <span class=set>${sunset}</span>
              <span>
            <p>
          </div>
        </div>
      `;
      })
      .join("");

    const icon = wmo.get(w.current.weather_code);

    const currentTime = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: w.loc.timezone,
    }).format(w.current.time);

    el.innerHTML = `
      <h1>${w.loc.formatted_name}</h1>
      <p class=current-time>${currentTime}</p>
      <h2>Current Conditions</h2>
      <div class=temps>
        <p>Temp: <strong>${w.current.temperature_2m}${
      w.current_units.temperature_2m
    }</strong></p>
        <p>Feels like: <strong>${w.current.apparent_temperature}${
      w.current_units.apparent_temperature
    }</strong></p>
      </div>
      ${
        icon &&
        `<p class=icon><img alt="${icon}" src="/icons/wi-${icon}.svg" width=128></p>`
      }
      <h2>Hourly</h2>
      <ol class=hourly>${hoursMarkup}</ol>
      <h2>Daily</h2>
      ${daysMarkup}
    `;

    this.getResultsElement().replaceChildren(el.content.cloneNode(true));
    this.removeAttribute("fetching");
  }
}
