import { Event } from '#dom';

export class GeoEvent extends Event {
	latitude: number;
	longitude: number;
	name: string;

	constructor(latitude: number, longitude: number, name: string) {
		super('geo', { bubbles: true, cancelable: true });

		this.latitude = latitude;
		this.longitude = longitude;
		this.name = name;
	}
}

export function getGeo(obj: Element): Promise<GeolocationPosition | undefined> {
	const view = obj.ownerDocument.defaultView;

	if (!view) {
		return Promise.resolve(undefined);
	}

	const isServer = 'isServer' in view && !!view.isServer;

	if (isServer) {
		return Promise.resolve(undefined);
	}

	const { promise, resolve, reject } = Promise.withResolvers<GeolocationPosition>();
	view.navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5_000 });
	return promise;
}
