const { actions } = require("../auth");
const { getSocketName } = require("../sessions");
const { ServiceBase } = require("../base");
const { events } = require("../log/events");
const { Playlist } = require("./playlist");
const { Video, VideoFormat } = require("./video");

const settings = require("../../bt_data/settings");
const config = require("../../bt_data/db_info");


exports.PlaylistService = class extends ServiceBase {
	get current() {
		return this.playlist.current();
	}

	get cursor() {
		return this.playlist.cursor();
	}

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
		//FIXME: Change to a "enum"
		this.controller = 'server';
		this.grabbers = new Map();
		this.handlers = new Map(
			[VideoFormat.YOUTUBE, null]
		);
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
			select value 
			from misc 
			where name in ('server_active_videoid', 'server_time')
			order by name
		`;

		this.playlist.initialise(
			videos.map(row => new Video(row)),
			active,
		);
		
		this.time = Number.parseInt(time || -settings.vc.head_time, 10);
	}

	async advance(socket) {
		this.current.removeTag(true);
		
		if (this.current.volatile()) {
			await this.remove(socket, {pos: this.cursor, sanityid: this.current.id()});
		} else {
			this.playlist.advance();
		}

		//set new video and reset time
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
			throw new Error("User has no permission to add videos");
		}

		if (!this.grabbers.has(data.videotype)) {
			throw new Error("Format or provider has no handler implemented");
		}
		
		const handler = this.handlers.get(data.videotype);
		const video = await handler.handle(data);

		const position = data.queue ? this.cursor + 1 : this.playlist.videos().length;

		if (data.queue) {
			this.playlist.insert(video, position);
		} else {
			this.playlist.append(video);
		}

		//remove it from the videos_history (why?)
		await this.db.query`
			DELETE FROM
				videos_history
			WHERE
				videoid = ${video.id()}
		`;

		//insert the actual video to table
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
					${getSocketName(socket)}
					${JSON.stringify(video.metadata())}
				)
		`;

		//update positions only if we queued as next video
		if (data.queue) {
			await this.db.query`
				UPDATE videos_new
				SET position = position + 1
				WHERE position >= ${position} AND id IS NOT ${video.id()}
			`;
		}
	}

	resync(socket) {
		socket.emit('refreshPlaylist', {desynced: true, items: this.items});
	}

	async move(socket, data) {
		if (this.playlist.at(data.from)?.id() !== data.sanityid) {
			return this.resync(socket);
		}

		this.playlist.move(data.from, data.to);

		const min = Math.min(data.from, data.to);
		const max = Math.max(data.from, data.to);

		await this.db.query`
			UPDATE videos_new SET position = ${data.to} WHERE position = ${data.from};
		`;

		await this.db.query`
			UPDATE videos_new 
			SET position = position + ${Math.sign(data.to - data.from)}
			WHERE position >= ${min} and position <= ${max} and id is not ${data.sanityid}
		`;

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
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO, "NEW: Cursor is at: {cursor}", { cursor: this.cursor });
	}

	async jump(socket, data) {
		if (this.playlist.at(data.index).id() !== data.sanityid) {
			return this.resync(socket);
		}

		this.current.removeTag(true);

		if (this.current.volatile()) {
			await this.delete(socket, {pos: this.cursor, sanityid: data.sanityid});
			data.index -= 1;
		}

		this.playlist.set_cursor(data.index);

		this.announce(this.io.sockets, "forceVideoChange");
		this.log.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE, "NEW: {mod} forced video change", {
			mod: getSocketName(socket),
			type: "playlist",
		});
	}

	async fondle(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_SET_VIDEO_VOLATILE)) {
			return;
		}

		if (!this.current.id() !== data.sanityid) {
			return this.resync(socket);
		}

		const video = this.playlist.at(data.info.pos);

		switch (data.action) {
			case 'setVolatile': video.setVolatile(data.info.volat); break;
			case 'setColorTag': video.setTag(data.info.tag, data.info.volat); break;
		}

		await this.db.query`
			UPDATE videos
			SET meta = ${JSON.stringify(video.meta())}
			WHERE videoid = ${video.id()}
		`;

		this.io.sockets.emit(this.fondleEvents.get(data.action), data.info);
	}

	announce(socket, event) {
		socket.emit(event, {
			video: this.current.pack(),
			time: this.time,
			state: this.state,
		});

		this.eventServer.emit('videoStatus', {
			time: Math.round(this.time),
			state: this.state
		});
	}

	seek(socket, event) {
		if (!this.auth.can(socket.session, actions.ACTION_CONTROL_VIDEO)) {
			return;
		}

		this.time = event;
		this.announce(this.io.sockets, 'hbVideoDetail');
	}

	onTick(elapsed) {
		if (!this.current || this.paused) {
			return;
		}

		this.time += Math.round(elapsed / 1000);

		if (this.time + 1 >= this.current.duration() + settings.vc.tail_time) {
			this.advance();
			return;
		}

		if (this.time > 0 && this.time % (settings.core.heartbeat_interval / 1000)) {
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
	}
};
