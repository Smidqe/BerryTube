const { Video } = require("../video");
const { Handler } = require("./base");

const et = require("elementtree");
const isoDuration = require("iso8601-duration");

exports.DashHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(links, data) {
		const id = data.videoid.trim();
		const video = await super.api(id)
			.then(resp => resp.text())
			.then(data => et.parse(data))
			.then(manifest => {
				const root = manifest.getroot();
				const duration = isoDuration.toSeconds(isoDuration.parse(root.get('mediaPresentationDuration')));

				return new Video({
					videoid: video.id || video.video_id,
					videotitle: encodeURIComponent(video.title),
					videolength: duration,
					videotype: duration > 0 ? "dash" : "live",
					meta: {},
				});
			});

		return super.handle(
			links,
			data,
			video
		);
	}
};
