const { Video } = require("../video");
const { Handler } = require("./base");

exports.TwitchHandler = class extends Handler {
	constructor(services) {
		super(services);

		this.token = {
			value: null,
			expiry: new Date()
		};
	}

	async api(endpoint, params = {}) {
		const url = new URL(endpoint, 'https://api.twitch.tv/helix/');
		
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}

		return fetch(url.toString(), {
			headers: {
				'Client-Id': process.env.TWITCH_CLIENT_ID,
				'Authorization': `Bearer ${this.token.access_token}`
			}
		});
	}

	async getToken() {
		if (this.token.value && this.token.expiry.getTime() > Date.now()) {
			return this.token.value;
		}

		const response = await fetch('https://id.twitch.tv/oauth2/token', {
			method: 'POST',
			body: new URLSearchParams({
				client_id: process.env.TWITCH_CLIENT_ID,
				client_secret: process.env.TWITCH_CLIENT_SECRET,
				grant_type: 'client_credentials',
			}),
		});

		if (!response.ok) {
			throw new Error('[Soundcloud]: Unable to fetch Twitch access token');
		}

		this.token.access_token = await response.json();
		this.token.expiry = new Date();
		this.token.expiry.setSeconds(this.token.expiry.getSeconds() + this.token.access_token.expires_in * 0.9);
		return this.token.access_token;
	}

	async getVideo(id) {
		const json = await this.api(`videos/${id}`);

		let videoid = json._id;

		if (videoid.startsWith('v')) {
			videoid = videoid.substr(1);
		}

		return new Video({
			videoid: `videos/${videoid}`,
			videotitle: encodeURI(json.title),
			videolength: Math.ceil(json.length),
			videotype: 'twitch'
		});
	}

	async getChannel(name) {
		const response = await this.api('search/channels', {query: name, limit: 1});
		
		if (!response?.channels?.length) {
			throw new Error(`[Twitch]: Channel with name: ${name} doesn't exist`);
		}

		const channel = response.channels[0];

		return new Video({
			videoid: channel.name,
			videotitle: encodeURI(channel.display_name),
			videolength: 0,
			videotype: 'twitch'
		});
	}

	async handle(services, data) {
		const parts = data.videoid.trim().split('/');

		let video = null;
		if (parts[0] === 'videos') {
			video = this.getVideo(parts[1]);
		} else {
			video = this.getChannel(parts[0]);
		}

		return super.handle(
			services,
			data,
			await video
		);
	}
};
