const { Video } = require("../video");
const { Handler } = require("./base");

exports.VimeoHandler = class extends Handler {
	constructor() {
		super();
	}

	async json(path) {
		return super.api(
			`https://vimeo.com/${path}`,
			{
				'Accept': 'application/json'
			}
		);
	}

	async handle(services, data) {
		const id = data.videoid.trim().replace('/', '');
		const paths = [
			`api/v2/video/${id}.json`,
			`api/oembed.json?url=http%3A//vimeo.com/${id}`
		];

		let response = await this.json(paths[0]).catch(this.json(paths[1]));

		if (!response) {
			throw new Error("[Vimeo]: Failed to acquire vimeo video for id");
		}

		if (Array.isArray(response)) {
			response = response[0];
		}

		return super.handle(
			services,
			data,
			new Video({
				videoid: response.id || response.video_id,
				videotitle: encodeURI(response.title),
				videolength: response.duration,
				videotype: "vimeo",
				meta: {},
			})
		);
	}
};
