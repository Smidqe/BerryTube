const { Video } = require("../video");
const { Handler } = require("./base");

exports.DailymotionHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(services, data) {
		const id = data.videoid.trim();
		const json = await super.api(
			`https://api.dailymotion.com/video/${id}?fields=title,duration`,
			{
				'Accept': 'application/json'
			}
		);

		if (!json) {
			throw new Error("[Dailymotion]: No response from API or it was malformed");
		}

		return super.handle(
			services,
			data,
			new Video({
				videoid: id,
				videotitle: encodeURI(json.title),
				videolength: json.duration,
				videotype: "dm",
			})
		);
	}
};