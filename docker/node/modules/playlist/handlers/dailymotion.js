const { Video } = require("../video");
const { Handler } = require("./base");

exports.VimeoHandler = class extends Handler {
	constructor() {
		super();
	}

	async json(path) {
		return super.api(
			path,
			{
				'Accept': 'application/json'
			}
		);
	}

	async handle(data) {
		const id = data.videoid.trim();
		const json = await this.json(`https://api.dailymotion.com/video/${id}?fields=title,duration`);

		return new Video({
			videoid: id,
			videotitle: encodeURIComponent(json.title),
			videolength: json.duration,
			videotype: "dm",
		});
	}
};

