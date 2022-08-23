export const Groups = {
	ANONYMOUS: -1,
	USER: 0,
	MODERATOR: 1,
	ADMIN: 2
};

export class User {
	constructor(data) {
		this.group = data.type;
		this.nick = data.nick;
		this.berry = false;
		this.dom = null;
	}

	isBerry() {
		return this.berry;
	}

	dom() {

	}
}