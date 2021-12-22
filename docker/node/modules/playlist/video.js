exports.Video = class {
	constructor(data) {
		this.videoid = data.videoid;
		this.videotitle = data.videotitle;
		this.videolength = data.videolength;
		this.videotype = data.videotype;
		this.meta = data.meta || {};
		this.volat = data.volat || false;

		try {
			if (typeof this.meta !== 'object') {
				this.meta = JSON.parse(data.meta);
			}
		} catch (_) {
			this.meta = {};
		}
	}

	id() {
		return this.videoid;
	}

	title() {
		return this.videotitle;
	}

	duration() {
		return this.videolength;
	}

	source() {
		return this.videotype;
	}

	metadata() {
		return this.meta;
	}

	volatile() {
		return this.volat;
	}

	hasTag(volatile) {
		return this.meta?.tag?.volatile === volatile;
	}

	addTag(color, volatile) {
		this.meta.tag = {color, volatile};
	}

	removeTag() {
		delete this.meta.tag;
	}
};
