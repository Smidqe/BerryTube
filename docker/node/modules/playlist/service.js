const { actions } = require("../auth");
const { getSocketName } = require("../sessions");
const { ServiceBase } = require("../base");
const { events } = require("../log/events");
const { Playlist } = require("./playlist");
const { Video } = require("./video");

const settings = require("../../bt_data/settings");
const config = require("../../bt_data/db_info");

exports.PlaylistService = class extends ServiceBase {
	constructor(services) {
		super(services);
		this.auth = services.auth;
		this.io = services.io;
		this.db = services.db;
		this.sessions = services.sessions;
		this.playlist = new Playlist();
		this.log = services.log;

		this.exposeSocketActions({
			playNext: this.advance.bind(this),
			sortPlaylist: this.move.bind(this),
			forceVideoChange: this.jump.bind(this),
			addVideo: this.add.bind(this),
			fondleVideo: this.fondle.bind(this),
		});

		this.time = 0;
		//false = server, true = user
		this.controlled = false;
		this.paused = false;
	}

	async init() {
		//TODO: Remove these once parity has been achieved
		//and no shenanigans happen during normal use
		await this.db.query`DROP TABLE IF EXISTS videos_new`;
		await this.db.query`CREATE TABLE videos_new LIKE videos`;

		const { result: videos } = await this.db.query`
			select * from videos_new order by position
		`;

		const {result: [active, time]} = await this.db.query`
			select value from misc where name in ('server_active_videoid', 'server_time')
		`;

		this.playlist.initialise(
			videos.map(row => new Video(row)),
			active,
		);
		
		this.time = Number.parseInt(time ?? -settings.vc.head_time);
	}

	async advance(socket) {
		if (this.current.volatile()) {
			await this.delete(socket, this.cursor);
		} else {
			this.current.removeTag(true);
			this.playlist.next();
		}

		//set new video and reset time
		this.current = this.playlist.current();
		this.time = -settings.vc.head_time;

		this.log.info(events.EVENT_VIDEO_CHANGE,
			"changed video to {videoTitle}",
			{ videoTitle: this.current.title() });

		//send videochange to eventserver
		this.events.emit('videoChange', {
			id: this.current.id(),
			length: this.current.duration(),
			title: this.current.title(),
			type: this.current.source(),
			volat: this.current.volatile()
		});
	}

	async add(socket, data) {
		if (!this.auth.can(socket, actions.ACTION_CONTROL_PLAYLIST)) {
			throw new Error("Cannot");
		}



		/*
		if (this.handlers.has(data.videotype)) {
			throw Error('aaaaa');
		}

		const video = await this.handlers.get(data.videotype).handle(data);

		if (!video) {
			throw Error("AAAAA");
		}

		if (data.queue) {
			this.playlist.insert(video, this.playlist.cursor + 1);
		} else {
			this.playlist.append(video);
		}

		const position = data.queue ? this.playlist.cursor + 1 : this.playlist.videos().length;

		await this.db.query`
			insert into videos_new 
				(position, videoid, videotitle, videolength, videotype, videovia, meta) 
			VALUES 
				(
					${position}, 
					${video.id()}, 
					${video.title()}, 
					${video.duration()}, 
					${video.source()}, 
					${JSON.stringify(video.metadata())}
				)
		`;

		//if we queue it next, update positions too
		if (data.queue) {
			this.db.query`
				UPDATE videos_new
				SET position = position + 1
				WHERE position >= ${position} AND id IS NOT ${video.id()}
			`;
		}
		*/
	}

	resync(socket) {
		socket.emit("recvNewPlaylist", this.items);
		socket.emit("doorStuck");
	}

	async move(socket, data) {
		if (this.playlist.at(data.from).id() !== data.sanityid) {
			return this.resync(socket);
		}

		//move
		this.playlist.move(data.from, data.to);

		//update positions in db
		if (data.from < data.to) {
			await this.db.query`
				update videos_new set position = CASE
					WHEN position = ${data.from} THEN ${data.to - 1}
					WHEN position = ${data.to} THEN ${data.from}
					ELSE
						position - 1
				END
				WHERE position >= ${data.from} and position < ${data.to}
			`;
		} else {
			await this.db.query`
				update videos_new set position = CASE
					WHEN position = ${data.to} THEN ${data.from}
					ELSE
						position + 1
				END
				WHERE position < ${data.from} and position >= ${data.to}
			`;
		}

		this.io.sockets.emit("sortPlaylist", data);
	}

	async store(video) {
		if (video.duration() <= 0) {
			return;
		}

		const params = [
			video.id(),
			video.title(),
			video.length(),
			video.source(),
			"NOW()",
			JSON.stringify(video.meta()),
		];

		await this.db.query`
			insert into videos_history (videoid, videotitle, videolength, videotype, date_added, meta) 
			values (${params.join(",")})
		`;
	}

	async remove(socket, data) {
		const video = this.playlist.at(data.pos);

		if (video.id() !== data.sanityid) {
			return this.resync(socket);
		}

		this.playlist.remove(data.pos);

		await this.db.query`
			delete from videos_new where videoid = ${video.id()} limit 1
		`
			.then(() => this.store(video))
			.catch((e) => this.log.error(
				events.EVENT_ADMIN_DELETED_VIDEO,
				"NEW: {mod} could not delete {title}",
				{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()) },
				e,
			));

		//shift positions
		await this.db.query`
			update videos_new set position = position - 1 where position > ${data.pos} 
		`;

		this.io.sockets.emit("delVideo", data);
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO, "NEW: Cursor is at: {cursor}", { cursor: this.playlist.cursor });
	}

	async jump(socket, data) {
		if (this.playlist.at(data.index).id() !== data.sanityid) {
			return this.resync(socket);
		}

		if (this.current.volatile()) {
			await this.delete(socket, this.cursor);
		} else {
			this.current.removeTag(true);
			this.playlist.set_cursor(data.index);
		}

		this.current = this.playlist.current();

		this.announce(this.io.sockets, "forceVideoChange");
		this.log.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE, "NEW: {mod} forced video change", {
			mod: getSocketName(socket),
			type: "playlist",
		});
	}

	is_synced(id) {
		return this.playlist.current().id() === id;
	}

	async fondle(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_SET_VIDEO_VOLATILE)) {
			return;
		}

		if (!this.is_synced(data.sanityid)) {
			return this.resync(socket);
		}

		const video = this.playlist.at(data.info.pos);

		switch (data.action) {
			case "setVolatile":
				video.setVolatile(data.info.volat);
				break;
			case "setColorTag":
				video.setTag(data.info.tag, data.info.volat);
				break;
		}

		this.db.query`
			UPDATE videos
			SET meta = ${JSON.stringify(video.meta())}
			WHERE videoid = ${video.id()}
		`;

		this.io.sockets.emit(this.fondleEvents.get(data.action), data.info);
	}

	announce(socket, event) {
		socket.emit(event, {
			video: this.playlist.current().pack(),
			time: this.time,
			state: this.state,
		});

		this.eventServer.emit('videoStatus', {
			time: Math.round(this.time),
			state: this.state
		});
	}

	async onTick(elapsed) {
		if (this.paused) {
			return;
		}

		this.time += elapsed / 1000;

		if (this.time > 0 && Math.round(this.time) % settings.core.heartbeat_interval === 0) {
			this.announce(this.io.sockets, "hbVideoDetail");
			this.db.query`
				UPDATE
					misc
				SET
					value = ${this.time}
				WHERE
					name = 'server_time'
			`;
		}

		//we've reached end of video, play next video
		if (this.time >= this.current.duration()) {
			this.advance();
		}
	}
};
