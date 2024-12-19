import { parseHTML } from 'linkedom';
import { GetLocationElement } from '../public/get-location-element';
import { GetWeatherElement } from '../public/get-weather-element';
import { LocationsListElement } from '../public/locations-list-element';
import { EnvContextElement } from './env-context-element';
import { serializeAsync } from './serialize';

const code = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Serialized Weather 🌦️</title>
      <link rel=stylesheet href="/dist/styles.css">
      <script type=importmap>
        {
          "imports": {
            "#dom": "/browser-dom.js"
          }
        }
      </script>
    </head>
    <body>
      <env-context>
        <get-weather>
          <get-location></get-location>
        </get-weather>
      </env-context>
      <hr>
      <p class=thanks>
        Thanks to <a href="https://open-meteo.com">open-meteo’s fantastic
        weather API</a>. If you need to fetch the weather, then this is the API
        for you. And thanks to <a
        href="https://github.com/erikflowers/weather-icons">erikflowers/weather-icons</a>
        for the great weather icons and the weather code to icon mapping. 🫡
      </p>
      <script type=module>
        import { GetWeatherElement } from '/dist/get-weather-element.js'
        import { GetLocationElement } from '/dist/get-location-element.js'
        import { LocationsListElement } from '/dist/locations-list-element.js'

        LocationsListElement.define()
        GetLocationElement.define()
        GetWeatherElement.define()
      </script>
    </body>
  </html>
`;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		let nearbyName: string | undefined = undefined;

		if (request.cf?.city && request.cf?.country) {
			nearbyName = `${request.cf.city}, ${request.cf.country}`;
		}

		switch (url.pathname) {
			case '/':
				const linkie = parseHTML(code, {
					location: url,
					isServer: true,
					cfGeo: { latitude: request.cf?.latitude, longitude: request.cf?.longitude, nearbyName },
				});

				// NOTE: each custom element must be unique per request because
				// customElements are per document sadly
				const KEnvContextElement = class extends EnvContextElement {};
				linkie.customElements.define(KEnvContextElement.defaultName, KEnvContextElement);
				KEnvContextElement.assignEnv(linkie.document, env);

				const KLocationsListElement = class extends LocationsListElement {};
				linkie.customElements.define(KLocationsListElement.defaultName, KLocationsListElement);

				const KGetLocationElement = class extends GetLocationElement {};
				linkie.customElements.define(KGetLocationElement.defaultName, KGetLocationElement);

				const KGetWeatherElement = class extends GetWeatherElement {};
				linkie.customElements.define(KGetWeatherElement.defaultName, KGetWeatherElement);

				// NOTE: turn that live dom into html
				const result = await serializeAsync(linkie.document.documentElement);

				// NOTE: I serialized the <html> element so I don't have the doctype in the result
				return new Response(`<!doctype html>${result}`, {
					headers: {
						'content-type': 'text/html',
					},
				});

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
