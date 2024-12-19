import { Event } from "#dom";
import { defaultTemperatureUnit, type TemperatureUnit } from "./weather.ts";

const isServer = !!self.Bun;

type Params =
  | {
      search: string;
      unit?: TemperatureUnit;
    }
  | {
      id: number;
      unit?: TemperatureUnit;
    }
  | {
      unit?: TemperatureUnit;
    };

export const paramsChange = "paramschange" as const;

export class ParamsChangeEvent extends Event {
  constructor() {
    super(paramsChange, { bubbles: true, cancelable: true });
  }
}

export function getParams(el: HTMLElement): Params {
  const view = el.ownerDocument.defaultView;
  if (!view) {
    return {};
  }

  const url = new URL(view.location.href);

  const unitParam = url.searchParams.get("unit");

  let unit: TemperatureUnit | undefined;

  if (unitParam === "fahrenheit") {
    unit = "fahrenheit";
  }

  const search = url.searchParams.get("search") || undefined;
  const idString = url.searchParams.get("id") || undefined;

  if (idString) {
    const id = parseInt(idString, 10);
    return { id, unit };
  }

  if (search) {
    return { search, unit };
  }

  return { unit };
}

export function listenForParamsChange(
  obj: EventListenerObject & EventTarget,
  signal?: AbortSignal
): void {
  if (isServer) {
    return;
  }

  obj.addEventListener(paramsChange, obj, { signal });

  globalThis.addEventListener(
    "popstate",
    () => {
      obj.handleEvent(new ParamsChangeEvent());
    },
    { signal }
  );
}

export function pushParams(params: Params, from: EventTarget): void {
  if (isServer) {
    return;
  }

  const urlParams = new URLSearchParams();

  if (params.unit && params.unit !== defaultTemperatureUnit) {
    urlParams.set("unit", params.unit);
  }

  if ("search" in params) {
    urlParams.set("search", params.search);
  }

  if ("id" in params) {
    urlParams.set("id", String(params.id));
  }

  let url;

  if (urlParams.size === 0) {
    url = "/";
  } else {
    url = `/?${urlParams.toString()}`;
  }

  pushURL(url, from);
}

export function pushURL(url: string | URL, from: EventTarget): void {
  console.warn("pushURL", url.toString());
  globalThis.history.pushState(null, "", url.toString());
  from.dispatchEvent(new ParamsChangeEvent());
}