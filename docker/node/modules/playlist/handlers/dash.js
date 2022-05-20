const { Video } = require("../video");
const { Handler } = require("./base");
const fetch = require('node-fetch');

const et = require("elementtree");
const isoDuration = require("iso8601-duration");

exports.DashHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(links, data) {
		const id = data.videoid.trim();
		const video = await fetch(id)
			.then(resp => resp.text())
			.then(data => et.parse(data))
			.then(manifest => {
				const root = manifest.getroot();
				const duration = isoDuration.toSeconds(isoDuration.parse(root.get('mediaPresentationDuration')));

				const parts = data.videoid.split('/');
				const title = data.videotitle ? encodeURI(data.videotitle) : parts[parts.length - 1];

				return new Video({
					videoid: id,
					videotitle: title,
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
