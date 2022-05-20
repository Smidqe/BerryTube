const { Video } = require("../video");
const { Handler } = require("./base");

exports.HLSHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(links, data) {
		const video = new Video({
			videoid: data.videoid,
			videotitle: data.videotitle,
			videolength: 0,
			videotype: "live",
			meta: {},
		});

		return super.handle(
			links,
			data,
			video
		);
	}
};
