export const Groups = {
	LURKER: -2,
	ANONYMOUS: -1,
	USER: 0,
	MODERATOR: 1,
	ADMIN: 2
};

export class User {
	constructor() {
		this.group = Groups.LURKER;
		this.nick = '';
		this.berry = false;
	}

	isBerry() {
		return this.berry;
	}
}