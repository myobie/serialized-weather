import { test, expect } from "bun:test";
import { getLoc, getLocs, getWeather } from "./src/weather.ts";

test("canParseATimeStringAsADAte", () => {
  const time = "2024-12-14T15:01";
  const seconds = Date.parse(time);
  const date = new Date(seconds);

  expect(date.getHours()).toBe(15);
  expect(date.getMinutes()).toBe(1);
  expect(date.getDate()).toBe(14);
  expect(date.getMonth()).toBe(11);
  expect(date.getFullYear()).toBe(2024);
});

test("canGetLocationsFromASearch", async () => {
  const locs = await getLocs("Berli");
  expect(locs.length).toBeGreaterThan(1);

  const loc = locs.at(0);

  expect(loc).toBeDefined();
  expect(loc!.name).toBe("Berlin");
  expect(loc!.country).toBe("Germany");
});

test("canGetLocationById", async () => {
  const loc = await getLoc(2950159);

  expect(loc).toBeDefined();
  expect(loc!.name).toBe("Berlin");
  expect(loc!.country).toBe("Germany");
});

test("canGetWeatherForALocation", async () => {
  const loc = await getLoc(2950159);
  expect(loc).toBeDefined();

  const weather = await getWeather(loc!);
  expect(weather.current.apparent_temperature).toBeDefined();
  expect(typeof weather.current.apparent_temperature).toBe("number");

  expect(weather.loc.id).toBe(2950159);
});
