export class Userlist {
	constructor() {
		this.users = new Map();
	}	

	add(user) {
		this.users.set(user.nick(), user);
	}

	remove(nick) {
		this.users.remove(nick);
	}

	
}