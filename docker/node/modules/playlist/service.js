const { actions } = require("../auth");
const { getSocketName, userTypes } = require("../sessions");
const { ServiceBase } = require("../base");
const { events } = require("../log/events");
const { Playlist } = require("./playlist");
const { Video, VideoFormat } = require("./video");

const settings = require("../../bt_data/settings");

const { YoutubeHandler } = require("./handlers/youtube");
const { VimeoHandler } = require("./handlers/vimeo");
const { DailymotionHandler } = require("./handlers/dailymotion");
const { SoundcloudHandler } = require("./handlers/soundcloud");
const { RedditHandler } = require("./handlers/reddit");
const { DashHandler } = require("./handlers/dash");
const { HLSHandler } = require("./handlers/hls");
const { FileHandler } = require("./handlers/file");
const { ManifestHandler } = require("./handlers/manifest");
const { TwitchHandler } = require("./handlers/twitch");
const { TwitchClipHandler } = require("./handlers/twitchclip");

const PlayerState = {
	ENDED: 0,
	RUNNING: 1,
	PAUSED: 2
};

exports.PlaylistService = class extends ServiceBase {
	constructor(services, eventServer) {
		super(services);

		this.auth = services.auth;
		this.io = services.io;
		this.db = services.db;
		this.playlist = new Playlist();
		this.log = services.log;
		this.eventServer = eventServer;
		this.sessions = services.sessions;

		this.exposeSocketActions({
			playNext: this.advance.bind(this),
			sortPlaylist: this.move.bind(this),
			forceVideoChange: this.jump.bind(this),
			addVideo: this.add.bind(this),
			delVideo: this.remove.bind(this),
			fondleVideo: this.fondle.bind(this),
			myPlaylistIsInited: this.onPlaylistReady.bind(this),
			forceStateChange: this.pause.bind(this),
			videoSeek: this.seek.bind(this),
			removeLeader: this.resumeOwnership.bind(this)
		});

		this.time = 0;
		this.state = PlayerState.RUNNING;

		//otherwise same but playlist is the actual one, not this service
		//probably not needed, but meh
		const links = {
			...services,
			playlist: this.playlist
		};

		this.handlers = new Map([
			[VideoFormat.YOUTUBE, new YoutubeHandler(links)],
			[VideoFormat.VIMEO, new VimeoHandler(links)],
			[VideoFormat.DAILYMOTION, new DailymotionHandler(links)],
			[VideoFormat.SOUNDCLOUD, new SoundcloudHandler(links)],
			[VideoFormat.REDDIT, new RedditHandler(links)],
			[VideoFormat.DASH, new DashHandler(links)],
			[VideoFormat.HLS, new HLSHandler(links)],
			[VideoFormat.FILE, new FileHandler(links)],
			[VideoFormat.MANIFEST, new ManifestHandler(links)],
			[VideoFormat.TWITCH, new TwitchHandler(links)],
			[VideoFormat.TWITCHCLIP, new TwitchClipHandler(links)],
		]);

		this.paused = false;
		this.current = null;
	}

	async init() {
		super.init();

		const { result: videos } = await this.db.query`
			select * from videos order by position
		`;

		const {result: [active, time]} = await this.db.query`
			select value 
			from misc 
			where name in ('server_active_videoid', 'server_time')
			order by name
		`;

		this.playlist.initialise(
			videos.map(row => new Video(row)),
			active.value,
		);

		//wasteful but meh, ensures we always reset positions if something
		//went wrong, also only done once when server starts
		for (const [index, video] of this.playlist.videos().entries()) {
			await this.db.query`
				update videos set position = ${index} where videoid = ${video.id()}
			`;
		}
		
		this.time = Number.parseInt(time.value || -settings.vc.head_time, 10);
		this.current = this.playlist.current();
	}

	async advance(socket) {
		this.current.removeTag(true);

		if (this.current.volatile()) {
			await this.remove(socket, {pos: this.cursor, sanityid: this.current.id()});
		} else {
			this.playlist.advance();
		}

		//set new video and reset time
		this.current = this.playlist.current();
		this.time = -settings.vc.head_time;
		this.log.info(events.EVENT_VIDEO_CHANGE,
			"changed video to {videoTitle}",
			{ videoTitle: this.current.title() });

		this.announce(this.io.sockets, "forceVideoChange");
	}

	async add(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			throw new Error("User has no permission to add videos");
		}

		if (!this.handlers.has(data.videotype)) {
			throw new Error("Format or provider has no handler implemented");
		}

		const video = await this.handlers.get(data.videotype).handle(
			socket,
			data
		).catch((err) => socket.emit('dupeAdd', err));

		this.io.sockets.emit('addVideo', {
			queue: data.queue, 
			video: video.pack(), 
			sanityid: this.current.id()
		});
	}

	resync(socket) {
		socket.emit('doorStuck');
		socket.emit('refreshPlaylist', {desynced: true, items: this.items});
	}

	async move(socket, data) {
		if (this.playlist.at(data.from)?.id() !== data.sanityid) {
			return this.resync(socket);
		}

		this.playlist.move(data.from, data.to);

		const min = Math.min(data.from, data.to);
		const max = Math.max(data.from, data.to);
		const sign = -Math.sign(data.to - data.from);

		await this.db.query`
			UPDATE videos SET position = ${data.to} WHERE position = ${data.from};
		`;

		await this.db.query`
			UPDATE videos
			SET position = position + ${sign}
			WHERE position >= ${min} and position <= ${max} and videoid <> ${data.sanityid}
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
			video.duration(),
			video.source(),
			JSON.stringify(video.metadata()),
		];

		await this.db.query(
			[`insert into videos_history (videoid, videotitle, videolength, videotype, date_added, meta) values (?,?,?,?,NOW(),?)`],
			...params
		);
	}

	async remove(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_DELETE_VIDEO)) {
			return;
		}

		const active = this.playlist.getCursor() === data.index;
		const video = this.playlist.at(data.index);

		if (video.id() !== data.sanityid) {
			return this.resync(socket);
		}

		//also handles position change
		this.playlist.remove(data.index);

		if (active) {
			this.current = this.playlist.current();
			this.announce(this.io.sockets, 'forceVideoChange');
		}
		
		await this.db.query`
			delete from videos where videoid = ${video.id()} limit 1
		`
			.then(() => this.store(video))
			.catch((e) => this.log.error(
				events.EVENT_ADMIN_DELETED_VIDEO,
				"NEW: {mod} could not delete {title}",
				{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()) },
				e,
			));

		//update positions
		await this.db.query`
			update videos set position = position - 1 where position > ${data.pos} 
		`;

		this.io.sockets.emit("delVideo", data);
		this.log.info(events.EVENT_ADMIN_MOVED_VIDEO, "NEW: Cursor is at: {cursor}", { cursor: this.playlist.getCursor() });
	}

	async jump(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			throw new Error("User has no permission to control playlist");
		}

		if (this.playlist.at(data.index).id() !== data.sanityid) {
			return this.resync(socket);
		}
		
		//remove volatile tag
		this.current.removeTag(true);

		//we need these two things to handle deletion after jumping
		//so that we don't need to have special handling
		//for deleting active video (which is already handled)
		const old = this.playlist.current();
		const cursor = this.playlist.getCursor();
		
		this.playlist.setCursor(data.index);
		this.time = -settings.vc.head_time;
		this.current = this.playlist.current();

		this.announce(this.io.sockets, "forceVideoChange");

		if (old.volatile()) {
			await this.remove(socket, {index: cursor, sanityid: old.sanityid});
		}
	}

	async fondle(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_SET_VIDEO_VOLATILE)) {
			throw new Error("User has no permission to fondle videos");
		}

		if (this.current.id() !== data.sanityid) {
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
			video: this.playlist.current().pack(),
			time: this.time,
			state: this.state,
		});
	}

	seek(socket, event) {
		if (!this.auth.can(socket.session, actions.ACTION_CONTROL_VIDEO)) {
			throw new Error("User has no permission to control video");
		}

		this.time = Math.round(event);
		this.log.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE, "{mod} seeked to {event}", {
			mod: getSocketName(socket),
			event
		});

		this.announce(this.io.sockets, 'hbVideoDetail');
		this.db.upsertMisc('server_time', this.time);
	}

	pause(socket, data) {
		if (!this.auth.can(socket.session, actions.ACTION_CONTROL_VIDEO)) {
			throw new Error("User has no permission to control video");
		}

		this.log.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE, "{mod} paused video at {event} with videolength of {duration} with state of {state}", {
			mod: getSocketName(socket),
			event: this.time,
			duration: this.current.duration(),
			state: data.state
		});
		
		this.paused = data.state === PlayerState.PAUSED;
		this.announce(this.io.sockets, 'forceStateChange');
	}

	//resume ownership if the video was paused and last (modded) berry is gone
	resumeOwnership() {
		if (!this.paused) {
			return;
		}

		const berries = this.sessions.getBerries().filter(u => u.type >= userTypes.MODERATOR);

		if (berries.length === 0) {
			this.paused = false;
		}
	}

	shuffle(socket) {
		if (!this.auth.can(socket.session, actions.ACTION_RANDOMIZE_LIST)) {
			throw new Error("User has no permission to randomize playlist");
		}

		this.playlist.shuffle();
		this.io.sockets.emit('recvNewPlaylist', this.playlist.pack());
	}

	onPlaylistReady(socket) {
		this.announce(socket.session, 'createPlayer');
	}

	onSocketConnected(socket) {
		super.onSocketConnected(socket);

		socket.session.emit(
			"recvPlaylist",
			this.playlist.pack()
		);
	}

	onTick(elapsed) {
		if (!this.current || this.paused) {
			return;
		}

		//always assume we advance 1s
		this.time += Math.round(elapsed / 1000);

		if (this.time + 1 >= this.current.duration() + settings.vc.tail_time) {
			this.advance();
			this.db.upsertMisc('server_active_videoid', this.current.id());
			return;
		}

		if (this.time > 0 && this.time % (settings.core.heartbeat_interval / 1000) === 0) {
			this.announce(this.io.sockets, "hbVideoDetail");
			this.db.upsertMisc('server_time', this.time);
		}
	}
};
