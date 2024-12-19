import { Event } from '#dom';

export const envContextEventName = 'envcontext';

export class EnvContextEvent extends Event {
	env?: Env;

	constructor() {
		super(envContextEventName, { bubbles: true, cancelable: true });
	}
}

export function getEnvContext(target: EventTarget): Env | undefined {
	const ev = new EnvContextEvent();
	target.dispatchEvent(ev);
	return ev.env;
}
