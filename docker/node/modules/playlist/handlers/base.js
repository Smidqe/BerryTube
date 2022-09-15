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
			throw new Error(`[api]: Failed to get response from ${url}: ${response.status}`);
		}

		return response.json();
	}

	async handle(services, data, video) {
		video.setVolatile(
			data.volat || services.socket.session.type === 0 || video.duration() > settings.core.auto_volatile
		);

		const {result} = await services.db.query`
			select meta from videos_history where videoid = ${video.id()}
		`;
		
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

		await services.db.query`
			DELETE FROM
				videos_history
			WHERE
				videoid = ${video.id()}
		`;

		const playlist = services.playlist;
		const activeIndex = playlist.indexOf((video) => video.id() === services.active.id());
		const index = data.queue ? activeIndex + 1 : playlist.length;
		const params = [
			index, 
			video.id(), 
			video.title(), 
			video.duration(), 
			video.source(), 
			services.socket.session.nick, 
			JSON.stringify(video.metadata())
		];

		await services.db.query(
			[`insert into ${config.video_table} (position, videoid, videotitle, videolength, videotype, videovia, meta) VALUES (?,?,?,?,?,?,?);`],
			...params
		);

		if (data.queue) {
			await services.db.query`
				update videos set position = position + 1 where not videoid = ${video.id()} and position >= ${index}
			`;
		}

		//add to actual playlist
		if (!data.queue || !playlist.length) {
			playlist.append(video);
		} else {
			playlist.insertAfter(services.active, video);
		}

		services.io.sockets.emit('addVideo', {queue: data.queue, video: video.pack(), sanityid: services.active.id()});
	
		return video;
	}
};