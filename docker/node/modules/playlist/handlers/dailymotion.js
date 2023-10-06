const { Video } = require("../video");
const { Handler } = require("./base");

exports.DailymotionHandler = class extends Handler {
	constructor(services) {
		super(services);
	}

	async handle(socket, data) {
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
			socket,
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