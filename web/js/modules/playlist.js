export class Video {
	constructor(data) {
		this.id = data.id;
		this.title = data.title;
		this.length = data.length || -1;

		this.meta = data.meta;
		this.dom = null;
	}
}

export class Playlist {
	constructor() {
		this.items = [];
		this.active = 0;
		this.dom = null;
	}

	initialize(items, active = null) {
		this.items = items;
		this.active = active || 0;
	}

	move(from, to) {

	}

	
}