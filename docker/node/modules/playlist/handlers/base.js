exports.Handler = class {
	constructor() {}

	async api(url, headers = {}, params = {}) {
		params = encodeURI(Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&'));

		const response = await fetch(url + (params ? ('?' + params) : ''), {
			headers
		});
	
		if (!response.ok) {
			throw {error: new Error(`Failed to get response from youtube: ${response.status}`)};
		}
	
		return response.json();
	}

	async handle() {}
};


