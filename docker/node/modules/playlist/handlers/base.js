const config = require("../../../bt_data/db_info");
const fetch = require('node-fetch');
const settings = require("../../../bt_data/settings");

exports.Handler = class {
	constructor() {}

	async api(url, headers = {}, params = {}) {
		params = encodeURI(Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&'));

		const response = await fetch(url + (params ? ('?' + params) : ''), {
			headers
		});

		if (!response.ok) {
			throw new Error(`Failed to get response from ${url}: ${response.status}`);
		}

		return response.json();
	}

	async handle(services, data, video) {
		video.setVolatile(
			data.volat || services.socket.session.type === 0 || video.duration() > settings.core.auto_volatile
		);

		const {result} = await services.db.query(
			[`select meta from videos_history where videoid = ?`],
			[video.id()]
		);

		if (result.length === 1) {
			try {
				video.setMetadata({
					...JSON.parse(result[0].meta),
					...video.metadata()
				});
			} catch (_) {
				//ignore non object meta (will be overwriten)
			}
		}

		await services.db.query(
			[`insert into ${config.video_table} (position, videoid, videotitle, videolength, videotype, videovia, meta) VALUES (?,?,?,?,?,?,?);`],
			...[services.playlist.length, video.id(), video.title(), video.duration(), video.source(), services.socket.session.nick, JSON.stringify(video.metadata())]
		);

		//add to actual playlist
		if (!data.queue || !services.playlist.length) {
			services.playlist.append(video);
		} else {
			services.playlist.insertAfter(services.active, video);
		}

		services.io.sockets.emit('addVideo', {queue: data.queue, video: video.pack(), sanityid: services.active.videoid});
	
		return video;
	}
};