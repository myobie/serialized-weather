import { type Serve } from "bun";
import { parseHTML } from "linkedom";
import { GetLocationElement } from "./src/get-location-element.ts";
import { GetWeatherElement } from "./src/get-weather-element.ts";
import { LocationsListElement } from "./src/locations-list-element.ts";
import { serializeAsync } from "./serialize.ts";
import "./build.ts";

export default {
  static: {
    "/styles.css": new Response(await Bun.file("./styles.css").bytes(), {
      headers: {
        "content-type": "text/css",
      },
    }),
    "/browser-dom.js": new Response(
      await Bun.file("./browser-dom.js").bytes(),
      {
        headers: {
          "content-type": "application/javascript",
        },
      }
    ),
  },
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname === "/") {
      const code = await Bun.file("./index.html").text();

      // TODO: try out happy-dom
      const linkie = parseHTML(code, { location: url });

      // NOTE: each custom element must be unique per request because
      // customElements are per document sadly
      const KGetWeatherElement = class extends GetWeatherElement {};

      linkie.customElements.define(
        KGetWeatherElement.defaultName,
        KGetWeatherElement
      );

      const KGetLocationElement = class extends GetLocationElement {};

      linkie.customElements.define(
        KGetLocationElement.defaultName,
        KGetLocationElement
      );

      const KLocationsListElement = class extends LocationsListElement {};

      linkie.customElements.define(
        KLocationsListElement.defaultName,
        KLocationsListElement
      );

      // NOTE: turn that live dom into html
      const result = await serializeAsync(linkie.document.documentElement);

      // NOTE: I serialized the <html> element so I don't have the doctype in the result
      return new Response(`<!doctype html>${result}`, {
        headers: {
          "content-type": "text/html",
        },
      });
    }

    if (pathname.startsWith("/dist/")) {
      const localPath = `.${pathname}`;
      const icon = await Bun.file(localPath).bytes();

      return new Response(icon, {
        headers: {
          "content-type": `application/${
            pathname.endsWith(".js.map") ? "json" : "javascript"
          }`,
        },
      });
    }

    if (pathname.startsWith("/icons/")) {
      const localPath = `.${pathname}`;
      const icon = await Bun.file(localPath).bytes();

      return new Response(icon, {
        headers: {
          "content-type": "image/svg+xml",
        },
      });
    }

    return new Response("not found", {
      status: 404,
      headers: {
        "content-type": "text/html",
      },
    });
  },
} satisfies Serve;
