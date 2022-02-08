const { Video } = require("../video");
const { Handler } = require("./base");

exports.TwitchClipHandler = class extends Handler {
	constructor() {
		super();
	}

	async api(endpoint, sub, params = {}) {
		return super.api(
			`https://api.twitch.tv/kraken/${endpoint}/${sub}`,
			{
				'Accept': 'application/vnd.twitchtv.v5+json',
				'Client-ID': '16m5lm4sc21blhrrpyorpy4tco0pa9'
			},
			params
		);
	}

	async getVideo(id) {
		const json = await this.api('videos', id);

		let videoid = json._id;

		if (videoid[0] === 'v') {
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
		const response = await this.api('search/channels', name, {query: name, limit: 1});
		
		if (!response?.channels?.length) {
			throw new Error(`[Twitchclip]: Channel with name: ${name} doesn't exist`);
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
			video
		);
	}
};