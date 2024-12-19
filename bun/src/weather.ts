export type TemperatureUnit = "celsius" | "fahrenheit";

export const defaultTemperatureUnit: TemperatureUnit = "celsius";

export type Loc = {
  id: number;
  latitude: number;
  longitude: number;
  timezone: string;
  name: string;
  country_code: string;
  country: string;
  admin1?: string;
  formatted_name: string;
};

type WeatherResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: "iso8601";
    interval: "seconds";
    temperature_2m: "°C" | "ºF";
    apparent_temperature: "°C" | "ºF";
    is_day: "";
    precipitation: "mm";
    weather_code: "wmo code";
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
  };
  hourly_units: {
    time: "iso8601";
    interval: "seconds";
    temperature_2m: "°C" | "ºF";
    apparent_temperature: "°C" | "ºF";
    is_day: "";
    precipitation: "mm";
    weather_code: "wmo code";
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    is_day: (0 | 1)[];
  };
  daily_units: {
    time: "iso8601";
    weather_code: "wmo code";
    temperature_2m_max: "°C" | "ºF";
    temperature_2m_min: "°C" | "ºF";
    apparent_temperature_max: "°C" | "ºF";
    apparent_temperature_min: "°C" | "ºF";
    sunrise: "iso8601";
    sunset: "iso8601";
    daylight_duration: "s";
    sunshine_duration: "s";
    precipitation_sum: "mm";
    precipitation_hours: "h";
    precipitation_probability_max: "%";
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    daylight_duration: number[];
    sunshine_duration: number[];
    precipitation_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: number[];
  };
};

export type Weather = {
  loc: Loc;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: "Date";
    interval: "seconds";
    temperature_2m: "°C" | "ºF";
    apparent_temperature: "°C" | "ºF";
    is_day: "boolean";
    precipitation: "mm";
    weather_code: "wmo code";
  };
  current: {
    time: Date;
    interval: number;
    temperature_2m: number;
    apparent_temperature: number;
    is_day: boolean;
    precipitation: number;
    weather_code: number;
  };
  hourly_units: {
    time: "Date";
    interval: "seconds";
    temperature_2m: "°C" | "ºF";
    apparent_temperature: "°C" | "ºF";
    is_day: "";
    precipitation: "mm";
    weather_code: "wmo code";
  };
  hourly: {
    time: Date;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation_probability: number;
    precipitation: number;
    weather_code: number;
    is_day: boolean;
  }[];
  daily_units: {
    time: "Date";
    weather_code: "wmo code";
    temperature_2m_max: "°C" | "ºF";
    temperature_2m_min: "°C" | "ºF";
    apparent_temperature_max: "°C" | "ºF";
    apparent_temperature_min: "°C" | "ºF";
    sunrise: "Date";
    sunset: "Date";
    daylight_duration: "s";
    sunshine_duration: "s";
    precipitation_sum: "mm";
    precipitation_hours: "h";
    precipitation_probability_max: "%";
  };
  daily: {
    time: Date;
    weather_code: number;
    temperature_2m_max: number;
    temperature_2m_min: number;
    apparent_temperature_max: number;
    apparent_temperature_min: number;
    sunrise: Date;
    sunset: Date;
    daylight_duration: number;
    sunshine_duration: number;
    precipitation_sum: number;
    precipitation_hours: number;
    precipitation_probability_max: number;
  }[];
};

function formatLocName(
  loc: Pick<Loc, "country" | "admin1" | "name" | "country_code">
) {
  if (loc.country_code === "US" && loc.admin1) {
    return `${loc.name}, ${loc.admin1}, ${loc.country}`;
  }

  return `${loc.name}, ${loc.country}`;
}

export async function getLocs(search: string): Promise<Loc[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", search);
  const response = await fetch(url);

  if (!response.ok) {
    console.error("request to get locations failed", response.status);
    return [];
  }

  const json = (await response.json()) as
    | { results: Omit<Loc, "formatted_name">[] }
    | undefined;

  if (!json?.results) {
    console.error("request to get locations failed", json);
    return [];
  }

  return json.results.map((l) => ({ formatted_name: formatLocName(l), ...l }));
}

export async function getLoc(
  searchOrId: string | number
): Promise<Loc | undefined> {
  if (typeof searchOrId === "string") {
    const locs = await getLocs(searchOrId);
    return locs.at(0);
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/get");
  url.searchParams.set("id", String(searchOrId));
  const response = await fetch(url);

  if (!response.ok) {
    console.error("request to get locations failed", response.status);
    return undefined;
  }

  const json = (await response.json()) as
    | Omit<Loc, "formatted_name">
    | undefined;

  if (json) {
    return { formatted_name: formatLocName(json), ...json };
  }
}

export async function getWeather(
  loc: Loc,
  unit: TemperatureUnit = "celsius"
): Promise<Weather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  const { longitude, latitude } = loc;

  const params = {
    longitude,
    latitude,
    temperature_unit: unit,
    past_hours: 0,
    forecast_hours: 12,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
    ],
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "is_day",
    ],
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "sunrise",
      "sunset",
      "daylight_duration",
      "sunshine_duration",
      "precipitation_sum",
      "precipitation_hours",
      "precipitation_probability_max",
    ],
  };
  // deno-lint-ignore no-explicit-any
  url.search = new URLSearchParams(params as any).toString();

  const response = await fetch(url);
  const json = (await response.json()) as WeatherResponse;

  const weather: Weather = {
    ...json,
    loc,
    current_units: { ...json.current_units, time: "Date", is_day: "boolean" },
    current: {
      ...json.current,
      time: new Date(Date.parse(json.current.time)),
      is_day: !!json.current.is_day,
    },
    hourly_units: { ...json.hourly_units, time: "Date" },
    hourly: json.hourly.time.map((_, index) => {
      const hour: Weather["hourly"][number] = {
        time: new Date(Date.parse(json.hourly.time[index])),
        temperature_2m: json.hourly.temperature_2m[index],
        apparent_temperature: json.hourly.apparent_temperature[index],
        precipitation_probability: json.hourly.precipitation_probability[index],
        precipitation: json.hourly.precipitation[index],
        weather_code: json.hourly.weather_code[index],
        is_day: !!json.hourly.is_day[index],
      };
      return hour;
    }),
    daily_units: {
      ...json.daily_units,
      time: "Date",
      sunrise: "Date",
      sunset: "Date",
    },
    daily: json.daily.time.map((_, index) => {
      const day: Weather["daily"][number] = {
        time: new Date(Date.parse(json.daily.time[index])),
        weather_code: json.daily.weather_code[index],
        temperature_2m_max: json.daily.temperature_2m_max[index],
        temperature_2m_min: json.daily.temperature_2m_min[index],
        apparent_temperature_max: json.daily.apparent_temperature_max[index],
        apparent_temperature_min: json.daily.apparent_temperature_min[index],
        sunrise: new Date(Date.parse(json.daily.sunrise[index])),
        sunset: new Date(Date.parse(json.daily.sunset[index])),
        daylight_duration: json.daily.daylight_duration[index],
        sunshine_duration: json.daily.sunshine_duration[index],
        precipitation_sum: json.daily.precipitation_sum[index],
        precipitation_hours: json.daily.precipitation_hours[index],
        precipitation_probability_max:
          json.daily.precipitation_probability_max[index],
      };
      return day;
    }),
  };
  return weather;
}
