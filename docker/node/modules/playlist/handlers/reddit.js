const { Handler } = require("./base");
const { DashHandler } = require("./dash");

exports.RedditHandler = class extends Handler {
	constructor(services) {
		super(services);
		this.services = services;
		this.db = services.db;
	}

	async exists(id) {
		const {result} = await this.db.query`
			select videoid 
			from videos 
			where videoid = ${id}
		`;

		return result.length > 0;
	}

	async getURL(url) {
		if (url.endsWith('.mpd')) {
			return url;
		}
	
		if (!url.endsWith('/')) {
			url += '/';
		}

		const json = await super.api(
			`${url}.json`,
			{
				'Accept': 'application/json'
			}
		);

		if (!Array.isArray(json) || json.length < 2) {
			throw new Error(`[Reddit]: Invalid JSON response from reddit url: ${url}`);
		}

		const videoBlock = json[0]?.data?.children[0]?.data?.media?.reddit_video;
		
		if (!videoBlock) {
			throw new Error(`[Reddit]: Given reddit URL has no video: ${url}`);
		}

		return videoBlock.dash_url;
	}

	async handle(socket, data) {
		const url = await this.getURL(data.videoid);
		const videoid = url.split('?')[0];
		const videotitle = videoid.split('/').reverse()[1];

		if (await this.exists(videoid)) {
			throw new Error(`[Reddit]: Reddit video is already on the playlist: ${videoid}`);
		}

		return (new DashHandler(this.services)).handle(
			socket,
			{...data, videoid, videotitle}
		);
	}
};
