const config = require("../../../bt_data/db_info");
const fetch = require('node-fetch');

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
		//attach common information
		const info = {
			...video.pack(),
			who: services.socket.session.nick,
			volat: services.socket.session.type === 0,
			queue: data.queue,
			pos: services.playlist.length, 
		};

		const {result} = await services.db.query(
			[`select meta from videos_history where videoid = ?`],
			[info.videoid]
		);

		if (result.length === 1) {
			try {
				info.meta = {
					...JSON.parse(result[0].meta),
					...info.meta
				};
			} catch (_) {
				//ignore non object meta (will be overwriten)
			}
		}

		await services.db.query(
			[`insert into ${config.video_table} (position, videoid, videotitle, videolength, videotype, videovia, meta) VALUES (?,?,?,?,?,?,?);`],
			...[info.pos, info.videoid, info.videotitle, info.videolength, info.videotype, info.who, JSON.stringify(info.meta)]
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