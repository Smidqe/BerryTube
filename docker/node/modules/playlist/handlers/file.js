const { Video } = require("../video");
const { Handler } = require("./base");
const { parseRawFileUrl } = require("../../utils");
const getDuration = require('get-video-duration');

exports.FileHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(services, data) {
		const url = data.videoid.trim();

		if (url.length === 0) {
			throw new Error("[File]: Empty video file url");
		}

		const info = parseRawFileUrl(url);

		if (!info) {
			throw new Error("[File]: Could not parse raw file information");
		}

		const duration = Math.ceil((await getDuration(url)) || 0);

		if (duration <= 0) {
			throw new Error("[File]: No duration");
		}

		return super.handle(
			services,
			data,
			new Video({
				videoid: url,
				videotitle: info.title,
				videolength: duration,
				videotype: "file",
			})
		);
	}
};