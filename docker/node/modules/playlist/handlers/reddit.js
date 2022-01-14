const { Video } = require("../video");
const { Handler } = require("./base");
const { VideoHandlers } = require("./index")

exports.RedditHandler = class extends Handler {
	constructor() {
		super();
	}

	async getURL(url) {
		if (url.endsWith('.mpd')) {
			return url;
		}
	
		if (!url.endsWith('/')) {
			url += '/'
		}

		const json = await super.api(
			`${url}.json`,
			{
				'Accept': 'application/json'
			}
		);

		if (!Array.isArray(json) || json.length < 2) {
			throw new Error(`Invalid JSON response from reddit url: ${url}`)
		}

		const videoBlock = json[0]?.data?.children[0]?.data?.media?.reddit_video;
		
		if (!videoBlock) {
			throw new Error(`Given reddit URL has no video: ${url}`);
		}

		return videoBlock.dash_url;
	}

	async handle(services, data) {
		const url = await this.getURL(data.videoid);
		const videoid = url.split('?')[0];
		const videotitle = videoid.split('/').reverse()[1];

		const {result} = await services.db.query(
			['select videoid from videos where videoid = ?'],
			[videoid]
		).catch(() => {return {result: false};});

		if (result) {
			throw new Error(`Reddit video is already on the playlist: ${videoid}`)
		}

		return VideoHandlers.get("dash").handle(
			services,
			{...data, videoid, videotitle}
		);
	}
};
