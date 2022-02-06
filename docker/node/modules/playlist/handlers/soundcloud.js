const { Video } = require("../video");
const { Handler } = require("./base");

exports.SoundcloudHandler = class extends Handler {
	constructor() {
		super();

		this.token = {
			value: null,
			expiry: new Date()
		};
	}

	async getToken() {
		if (this.token.value && this.token.expiry.getTime() > Date.now()) {
			return this.token.value;
		}

		const response = await fetch('https://api.soundcloud.com/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: process.env.SOUNDCLOUD_CLIENT_ID,
				client_secret: process.env.SOUNDCLOUD_CLIENT_SECRET,
				grant_type: 'client_credentials',
			}),
		});

		if (!response.ok) {
			throw new Error('[Soundcloud]: Unable to fetch SoundCloud access token');
		}

		this.token.value = await response.json();
		this.token.expiry = new Date();
		this.token.expiry.setSeconds(this.token.expiry.getSeconds() + this.token.value.expires_in * 0.9);
		return this.token.value;
	}

	async handle(data) {
		const id = encodeURIComponent(data.videoid.trim());

		if (id.length === 0) {
			throw new Error("[Soundcloud]: ID is empty");
		}

		const path = id.startsWith("SC") ? `/tracks/${id.substring(2)}.json` : `/resolve.json?url=${id}`;
		const token = (await this.getToken()).access_token;

		const response = await super.api(`https://api.soundcloud.com${path}`, {
			'Authorization': `OAuth ${token}`
		});

		return new Video({
			videoid: `SC${response.id}`,
			videotitle: encodeURIComponent(`${response.user.username} - ${response.title}`),
			videolength: response.duration / 1000,
			videotype: "SC",
			meta: {
				permalink: response.permalink_url
			}
		});
	}
};

