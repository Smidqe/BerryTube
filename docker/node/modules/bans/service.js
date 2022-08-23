//handle bans here

class Ban {
	constructor() {
		this.ip = '';
		this.nick = '';
		this.shadowban = false;
		this.expires = null;
	}

	address() {
		return this.ip;
	}

	user() {
		return this.nick;
	}

	isShadowban() {
		return this.shadowban;
	}
}


class BanService {
	constructor() {
		this.bans = new Map();
	}

	async initialise() {
		const {result} = await this.db.query`
			select * from bans;
		`;

		for (const row of result) {
			this.bans.set(row.ip, new Ban(row));
		}
	}

	isBanned(socket) {
		return this.bans.get(socket.ip)?.has(socket.nick) ?? false;
	}
	
	augment(ip, length) {
		if (!this.toggles.get('spaceaids')) {
			return;
		}

		const ban = this.bans.get(ip);
		const expires = new Date().getTime() + length;

		//perma or previous ban is longer
		if (!ban.expires || ban.expires >= expires) {
			return;
		}

		ban.expires = expires;


		this.save(ip);
	}

	save(ip = null) {
		if (!ip) {
			return;
		}
	}
}