Serialized Weather Example App
==============================

➡️  See the weather live at [weather.myobie.wtf][]

This tiny web app is an example of building up a DOM on the server to serialize and send as the initial HTML response for a page. 

The same DOM will be deserialized, parsed, rendered, and alive again in the browser using the same custom elements, javascript code, and all that.

[`linkedom`][linkedom] is used on the server as the target DOM, so `linkedom` is like another browser target for the custom element’s code. For 99% of my code so far, `linkedom` requires no changes from what works in browsers.

The server-side code has a timeout and will return to the browser if the requests are taking too long, so there can’t be a slow requiest. The client code will bootup and retry those requests in the browser as a fallback when that happens. This is progressive enhancement at it’s best in my opinion.

## `tree`

This repo is broken up into some sub-folders to help illustrate how this server-side serialization can work in different environments and runtmes. For example:

* `deno` is the initial [deno][]-based implementation using import maps
* `deno-client-only` shows that the entire app works fine as an SPA by not registering the custom elements in the server-side DOM
* `deno-server-only` shows that the entire app works fine as a server-rendered app with no client-side javascript by not registering the custom elements in the browser’s DOM
* `bun` is the same as `deno` but with [`bun`][bun]
* `worker` is the Cloudflare Worker running at [weather.myobie.wtf][] and shows that the app can server-side serialize just find in a server-less edge environment. 


## Issues that require workarounds

The main problems with server-side serializing a DOM with custom elements is that custom elements **must** inherit from `HTMLElement` which is normally found in `globalThis`. However, on the server, since `HTMLElement` isn’t available, I use a special import which returns `linkedom`’s `HTMLElement` on the server and simply returns `globalThis.HTMLElement` in the browser. The same needs to be done for `Event` for custom events and for the `customElements` registry.

I wish we didn’t need to use anything from `globalThis` to make custom elements, but that’s just how it is. Sure, one can contort their code into `export default (HTMLElement) => { class SomethingElementh extends HTMLElement {} }` but that is ugly and I don’t like it.

## Thanks

Thanks to [open-meteo][]’s fantastic weather API. If you need to fetch the weather, then this is the API for you. And thanks to [erikflowers/weather-icons][] for the great weather icons and the weather code to icon mapping. 🫡

[weather.myobie.wtf]: https://weather.myobie.wtf/
[linkedom]: https://github.com/WebReflection/linkedom
[deno]: https://deno.com
[bun]: https://bun.sh
[open-meteo]: https://open-meteo.com
[erikflowers/weather-icons]: https://github.com/erikflowers/weather-icons
