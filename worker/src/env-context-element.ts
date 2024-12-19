import { HTMLElement } from '#dom';
import { envContextEventName, type EnvContextEvent } from '../public/env-context-event';

export class EnvContextElement extends HTMLElement {
	static defaultName = 'env-context';
	env?: Env;

	#abortController?: AbortController;

	static assignEnv(doc: Document, env?: Env, tagName = EnvContextElement.defaultName) {
		const el = doc.querySelector(tagName) as EnvContextElement | undefined;

		if (el) {
			el.env = env;
		}
	}

	handleEvent(e: Event) {
		if (e.type === envContextEventName) {
			const ev = e as EnvContextEvent;
			ev.stopPropagation();
			ev.env = this.env;
		}
	}

	connectedCallback() {
		this.#abortController = new AbortController();
		this.addEventListener(envContextEventName, this, { signal: this.#abortController.signal });
	}

	disconnectedCallback() {
		this.#abortController?.abort();
	}
}
