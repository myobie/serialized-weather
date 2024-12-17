import { assertEquals } from '@std/assert'

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
