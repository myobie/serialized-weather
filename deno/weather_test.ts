import { assertEquals, assertExists, assertGreater } from '@std/assert'
import { getLoc, getLocs, getWeather } from './weather.ts'

Deno.test(function canParseATimeStringAsADAte() {
  const time = '2024-12-14T15:01'
  const seconds = Date.parse(time)
  const date = new Date(seconds)

  assertEquals(date.getHours(), 15)
  assertEquals(date.getMinutes(), 1)
  assertEquals(date.getDate(), 14)
  assertEquals(date.getMonth(), 11)
  assertEquals(date.getFullYear(), 2024)
})

Deno.test(async function canGetLocationsFromASearch() {
  const locs = await getLocs('Berli')
  assertGreater(locs.length, 1)

  const loc = locs.at(0)

  assertExists(loc)
  assertEquals(loc.name, 'Berlin')
  assertEquals(loc.country, 'Germany')
})

Deno.test(async function canGetLocationById() {
  const loc = await getLoc(2950159)

  assertExists(loc)
  assertEquals(loc.name, 'Berlin')
  assertEquals(loc.country, 'Germany')
})

Deno.test(async function canGetWeatherForALocation() {
  const loc = await getLoc(2950159)
  assertExists(loc)

  const weather = await getWeather(loc)
  assertExists(weather.current.apparent_temperature)
  assertEquals(typeof weather.current.apparent_temperature, 'number')

  assertEquals(weather.loc.id, 2950159)
})
