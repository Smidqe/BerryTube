exports.Playlist = class {
	constructor() {
		this.cursor = 0;
		this.items = [];
	}

	initialise(items, active = null) {
		this.items = items;
		this.cursor = 0;

		if (active) {
			this.cursor = this.items.findIndex(v => v.id() === active);
		}
	}

	count() {
		return this.items.length;
	}

	isEmpty() {
		return this.items.length === 0;
	}

	setCursor(index) {
		this.cursor = index;
	}

	getCursor() {
		return this.cursor;
	}

	add(video, queue) {
		if (queue) {
			this.items.splice(this.cursor + 1, 0, video);
		} else {
			this.items.push(video);
		}
	}

	append(item) {
		this.items.push(item);
	}


	videos() {
		return this.items;
	}

	move(from, to) {
		this.items.splice(to, 0, ...this.items.splice(from, 1));
		
		const active = from === this.cursor;
		const signs = [
			Math.sign(from - this.cursor),
			Math.sign(to - this.cursor)
		];

		//either moving over or moving current video
		if (signs[0] !== signs[1] || active) {
			this.cursor = active ? to : this.cursor + signs[0];
		}
	}

	shuffle() {
		const now = this.items[this.cursor];
		
		for (let i = this.items.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.items[i], this.items[j]] = [this.items[j], this.items[i]];
		}

		this.cursor = this.items.findIndex(n => n.id() === now.id());
	}

	at(index) {
		return this.items[index];
	}

	remove(index) {
		this.items.splice(index, 1);

		//if we are removing from behind the current video
		//or we are at the end of the playlist
		//substract 1 from the position
		if (index < this.cursor || this.cursor >= this.items.length) {
			this.cursor -= 1;
		}
	}

	current() {
		return this.items[this.cursor];
	}

	next() {
		if (this.cursor + 1 === this.items.length) {
			return this.items[0];
		} else {
			return this.items[this.cursor + 1];
		}
	}

	prev() {
		if (this.cursor - 1 < 0) {
			return this.items[this.items.length - 1];
		} else {
			return this.items[this.cursor - 1];
		}
	}

	advance() {
		if (this.cursor + 1 < this.items.length) {
			this.cursor += 1;
		} else {
			this.cursor = 0;
		}
	}

	pack() {
		return this.videos().map(video => video.pack());
	}
};