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

	set_cursor(index) {
		this.cursor = index;
	}

	insert(item, index) {
		this.items.splice(index, 0, item);

		if (index <= this.cursor) {
			this.cursor += 1;
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

		if (index < this.cursor || this.cursor >= this.items.length) {
			this.cursor -= 1;
		}
	}

	current() {
		return this.items[this.cursor];
	}

	next() {
		if (this.cursor + 1 < this.items.length) {
			this.cursor += 1;
		} else {
			this.cursor = 0;
		}
	}
};