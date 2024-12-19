import { customElements, HTMLElement } from "#dom";
import { type Loc } from "./weather.ts";

export class LocationsListElement extends HTMLElement {
  static defaultName = "locations-list";

  static define(name = this.defaultName) {
    customElements.define(name, this);
  }

  #template = (() => {
    const el = this.ownerDocument.createElement("template");
    el.innerHTML = `<ul></ul>`;
    return el;
  })();

  #itemTemplate = (() => {
    const el = this.ownerDocument.createElement("template");
    el.innerHTML = `<li><a href="#"></a></li>`;
    return el;
  })();

  #locations: Loc[] = [];

  set locations(newLocations: Loc[]) {
    this.#locations = newLocations;
    this.#rebuildList();
  }

  get locations() {
    return [...this.#locations];
  }

  connectedCallback() {
    // NOTE: build out the list if it's not already there
    if (this.children.length === 0) {
      this.replaceChildren(this.#template.content.cloneNode(true));
      this.#rebuildList();
    }
  }

  #rebuildList() {
    console.warn("!!! rebuilding list");
    const ul = this.querySelector("ul");
    if (!ul) {
      return;
    }

    const items = this.#locations.map(this.#item.bind(this));
    ul.replaceChildren(...items);
  }

  #item(loc: Loc): HTMLLIElement {
    const el = this.#itemTemplate.content.cloneNode(true)! as HTMLLIElement;
    const a = el.querySelector("a")!;
    a.href = `/?id=${loc.id}`;
    a.innerHTML = loc.formatted_name;
    return el;
  }
}
