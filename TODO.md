# TODO

## Documentation

- [ ] Explain everything with a much smaller example in the README (just fetch the weather for Berlin, try to make it all in one file except for the serializer)
- [ ] Make a playground or codepen so people can change it live in their browser and see how it works
- [ ] Show that even `document.write()` works 😆

## Async

- [ ] Pass a timeout `Promise` around instead of the timeout `number` so there is one, global timeout per serialize and not one per element

## Shadow DOM

- [ ] Make it a convention to dive into closed shadow DOM’s if the custom element exposes a public `shadowDom` property
- [ ] Remove the `closedRoots` stuff, use the above convention instead (it’s much easier to think about and implement)
- [ ] Shim support for manual slot assignment (`assignedNodes`) into linkedom
    - For manual slot assignment I must make the light DOM match what is currently _real_ so the `<slot>`s end up making sense when the `<template>` is rendered. I might need to use names (can just increment an integer) to place elements into slots. I just need each manually assigned element at the root of the `<slot>` to have the `slot=` `==` to the `slot.name` and it should Just Work™
- [ ] Show a clear example of how to upgrade an element to a manually slotted element (since we can’t have a manually slotted element declaratively, we need an upgrade step over in the browser to get it all initially setup)

## More frameworks

- [ ] Make an example that uses preact (wrapped in an app-hosting custom element)?
- [ ] Tailwind?
- [ ] vite? (middleware?)
