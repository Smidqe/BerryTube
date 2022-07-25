exports.Video = class {
	constructor(data) {
		this.videoid = data.videoid;
		this.videotitle = data.videotitle;
		this.videolength = data.videolength;
		this.videotype = data.videotype;
		this.meta = data.meta || {};
		this.volat = data.volat || false;
		this.deleted = false;

		try {
			if (typeof this.meta !== 'object') {
				this.meta = JSON.parse(data.meta);
			}
		} catch (_) {
			this.meta = {};
		}

		this.prev = null;
		this.next = null;
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

	tag(volatile) {
		return this.meta[volatile ? 'colorTagVolat' : 'colorTag'];
	}

	setTag(color, volatile) {
		this.meta[volatile ? 'colorTagVolat' : 'colorTag'] = color;
	}

	removeTag(volatile) {
		delete this.meta[volatile ? 'colorTagVolat' : 'colorTag'];
	}

	hasTag() {
		
	}

	setVolatile(volatile) {
		this.volat = volatile;
	}

	setMetadata(meta) {
		this.meta = meta;
	}

	pack() {
		return {
			videoid: this.videoid,
			videotitle: this.videotitle,
			videolength: this.videolength,
			videotype: this.videotype,
			meta: this.meta,
			volat: this.volat,
		};
	}
};