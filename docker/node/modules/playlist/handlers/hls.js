const { Video } = require("../video");
const { Handler } = require("./base");

exports.HLSHandler = class extends Handler {
	constructor() {
		super();
	}

	async handle(links, data) {
		throw new Error("Not implemented yet");
	}
};
