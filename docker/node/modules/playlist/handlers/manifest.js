const { Video } = require("../video");
const { Handler } = require("./base");
const { sanitizeManifest } = require("../manifest");

exports.ManifestHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(links, data) {
		const manifestUrl = data.videoid.trim();
		const response = await super.api(manifestUrl);
		const manifest = sanitizeManifest(response);

		if (manifest.sources.length === 0) {
			throw new Error("[Manifest]: Manifest must have one or more sources specified");
		}

		const video = new Video({
			videoid: manifestUrl,
			videotitle: manifest.title,
			videolength: manifest.duration,
			videotype: "file",
			meta: {
				manifest
			},
		});

		return super.handle(
			links,
			data,
			video
		);
	}
};
