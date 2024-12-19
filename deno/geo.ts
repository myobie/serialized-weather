import { Event } from 'dom'

const isServer = !!self.Deno

export class GeoEvent extends Event {
  latitude: number
  longitude: number
  name: string

  constructor(latitude: number, longitude: number, name: string) {
    super('geo', { bubbles: true, cancelable: true })

    this.latitude = latitude
    this.longitude = longitude
    this.name = name
  }
}

export function getGeo(): Promise<GeolocationPosition | undefined> {
  if (isServer) { return Promise.resolve(undefined) }

  const { promise, resolve, reject } = Promise.withResolvers<GeolocationPosition>()
  globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5_000 })
  return promise
}
