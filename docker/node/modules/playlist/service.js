const { actions, AuthService } = require("../auth");
const { getSocketName } = require("../sessions");
const { ServiceBase } = require("../base");
const { events } = require("../log/events");
const { Playlist } = require("./playlist");
const { Video } = require("./video");
const config = require("../../bt_data/db_info");

const {YoutubeHandler} = require('./handlers/youtube');

exports.PlaylistService = class extends ServiceBase {
	constructor(services) {
		super(services);
		this.auth = services.auth;
		this.io = services.io;
		this.db = services.db;
		this.sessions = services.sessions;
		this.playlist = new Playlist();
		this.log = services.log;
		
		/*
		this.exposeSocketActions({
			playNext: this.advance.bind(this),
			sortPlaylist: this.move.bind(this),
			forceVideoChange: this.jumpTo.bind(this),
			addVideo: this.add.bind(this),
			fondleVideo: this.fondle.bind(this)
		});
		*/

		this.handlers = new Map([
			['yt', new YoutubeHandler()],
			['dm', new YoutubeHandler()],
			['vimeo', new YoutubeHandler()],
			['soundcloud', new YoutubeHandler()],
			['twitch', new YoutubeHandler()],
			['twitchclip', new YoutubeHandler()],
			['file', new YoutubeHandler()],
			['hls', new YoutubeHandler()],
			['dash', new YoutubeHandler()],
		]);

		this.fondleEvents = new Map([
			['setVolatile', 'setVidVolatile'],
			['setColorTag', 'setVidColorTag']
		]);
	}

	async init() {
		const items = await this.db.query([`select * from ${config.video_table} order by position`], []);
		const id = await this.db.misc('server_active_videoid');

		this.playlist.initialise(items.result.map(row => new Video(row)));
		this.playlist.set_cursor(
			this.playlist.items.findIndex(v => v.id() === id)
		);
	}

	playNext(socket) {
		//
		this.playlist.next();
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: Cursor is at: {cursor}",
			{ cursor: this.playlist.cursor} );
	}

	async addVideo(socket, data) {
		if (!this.auth.can(socket, actions.ACTION_CONTROL_PLAYLIST)) {
			throw new Error("aaaaa");
		}
		
		await this.handlers[data.videotype].handle(data).then(async video => {
			video = {
				...video,
				who: socket.session.nick,
				volat: socket.session.type === 0,
				queue: data.queue,
				pos: data.queue ? this.playlist.cursor + 1 : this.playlist.items().length, 
			};
			/*
			await this.db.query(
				[`insert into ${config.video_table} (position, videoid, videotitle, videolength, videotype, videovia, meta) VALUES (?,?,?,?,?,?,?)`],
				[data.pos, video.id(), video.title(), video.length(), video.source(), video.who(), video.meta()]
			);
			*/

			//add to actual playlist
			if (!data.queue || !this.playlist.items().length) {
				this.playlist.append(video);
			} else {
				this.playlist.insert(video, this.playlist.cursor + 1);
				
				/*
				//update positions
				await this.db.query(
					[`update ${config.video_table} set position = position + 1 where position > ?`],
					[data.pos]
				);
				*/
			}

			//this.io.sockets.emit('addVideo', {queue: data.queue, video, sanityid: this.current().id()});
		});

		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: Cursor is at: {cursor}",
			{ cursor: this.playlist.cursor} );
	}

	resync(socket) {
		//socket.emit("recvNewPlaylist", this.items);
		//socket.emit('doorStuck');
	}

	async sortPlaylist(socket, data) {
		if (this.playlist.at(data.from).id() !== data.sanityid) {
			return this.resync(socket);
		}

		this.playlist.move(data.from, data.to);
		/*
		await this.db.query(
			[`update ${config.video_table} set position = position - 1 where position > ? and position <= ?`],
			[data.from, data.to]
		);
		*/

		//this.io.sockets.emit("sortPlaylist", data);
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: {mod} moved {title}",
			{ mod: getSocketName(socket), title: this.playlist.at(data.to).title(), type: "playlist" });
	
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: Cursor is at: {cursor}",
			{ cursor: this.playlist.cursor} );
	}

	async remove(socket, data) {
		const video = this.playlist.at(data.pos);
		const active = this.playlist.current();

		if (video.id() !== data.sanityid) {
			return this.resync(socket);
		}

		if (active.id() === video.id() && active.volatile()) {
			this.playlist.set_cursor(data.pos + 1);
		}

		/*
		//handle db queries
		await this.db.query([`delete from ${config.video_table} where videoid = ? limit 1`], [video.id()]).then(async () => {
			if (video.length() <= 0) {
				return;
			}

			const query = `insert into videos_history (videoid, videotitle, videolength, videotype, date_added, meta) values (?,?,?,?,NOW(),?)`;
			const params = [
				video.id(),
				video.title(),
				video.length(),
				video.source(),
				JSON.stringify(video.meta())
			];

			await this.db.query([query], params);
		}).catch((e) => {
			this.log.error(events.EVENT_ADMIN_DELETED_VIDEO,
				"NEW: {mod} could not delete {title}",
				{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()) }, e);
		});

		await this.db.query(
			[`update ${config.video_table} set position = position - 1 where position > ?`],
			[data.pos]
		);
		*/

		this.playlist.remove(data.pos);
		//this.io.sockets.emit('delVideo', data);

		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: Cursor is at: {cursor}",
			{ cursor: this.playlist.cursor} );
	}

	async jumpTo(socket, data) {
		const index = this.playlist.cursor;
		const active = this.playlist.current();
		const dest = this.playlist.at(data.index);

		if (!active || !dest || dest.id() !== data.sanityid) {
			return this.resync(socket);
		}

		if (!active.volatile() && active.hasTag(true)) {
			active.removeTag();
		}

		this.playlist.set_cursor(data.index);

		if (active.volatile()) {
			await this.remove(socket, {sanityid: active.id(), pos: index});
		}

		this.log.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE,
			"NEW: {mod} forced video change",
			{ mod: getSocketName(socket), type: "playlist" });

		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"NEW: Cursor is at: {cursor}",
			{ cursor: this.playlist.cursor} );
	}

	sanity(id) {
		return id && this.playlist.current().id() !== id;
	}

	async fondle(socket, data) {
		if (!this.sanity(data.sanityid)) {
			return this.resync(socket);
		}

		if (!this.auth.can(socket.session, actions.ACTION_SET_VIDEO_VOLATILE)) {
			return;
		}

		const video = this.playlist.at(data.info.pos);
	
		switch (data.action) {
			case 'setVolatile': video.setVolatile(data.info.volat); break;
			case 'setColorTag': video.setTag(data.info.tag, data.info.volat); break;
		}
	
		this.io.sockets.emit(
			this.fondleEvents.get(data.action),
			data.info
		);

		//save a single video (update all possible cases just incase instead of specifying which columns)
		this.db.upsert(
			config.video_table, 
			`videoid = ${video.id()}`, 
			[['volat', 'meta'], [video.volatile(), video.meta()]]
		);
	}
};
