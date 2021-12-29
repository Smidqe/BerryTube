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
		const id = data.videoid.trim().replace('/', '');
		const paths = [
			`/api/v2/video/${id}.json`,
			`/api/oembed.json?url=http%3A//vimeo.com/${id}`
		];

		let video = await this.json(paths[0]).catch(this.json(paths[1]));

		if (!video) {
			throw new Error("Failed to acquire vimeo video for id");
		}

		return new Video({
			videoid: video.id || video.video_id,
			videotitle: encodeURIComponent(video.title),
			videolength: video.duration,
			videotype: "vimeo",
			meta: {},
		});
	}
};

