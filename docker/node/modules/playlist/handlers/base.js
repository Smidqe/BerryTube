const config = require("../../../bt_data/db_info");
const fetch = require('node-fetch');
const settings = require("../../../bt_data/settings");

exports.Handler = class {
	constructor(services) {
		this.log = services.log;
		this.db = services.db;
		this.playlist = services.playlist;
	}

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

	async updateMetadata(video) {
		const {result} = await this.db.query`
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

		return video;
	}

	async saveToDatabase(socket, data, video) {
		const index = data.queue ? this.playlist.getCursor() + 1 : this.playlist.videos().length;
		const params = [
			index, 
			video.id(), 
			video.title(), 
			video.duration(), 
			video.source(), 
			socket.session.nick, 
			JSON.stringify(video.metadata())
		];

		await this.db.query(
			[`insert into ${config.video_table} (position, videoid, videotitle, videolength, videotype, videovia, meta) VALUES (?,?,?,?,?,?,?);`],
			...params
		);

		if (data.queue) {
			await this.db.query`
				update videos set position = position + 1 where not videoid = ${video.id()} and position >= ${index}
			`;
		}

	}

	async handle(socket, data, video) {
		const isVideoLong = video.duration() > settings.core.auto_volatile;
		const isVolatile = data.volat || socket.session.type === 0;

		//probably could be better but meh
		video.setVolatile(isVolatile || isVideoLong);
		video = await this.updateMetadata(video);

		await this.db.query`
			DELETE FROM
				videos_history
			WHERE
				videoid = ${video.id()}
		`;

		await this.saveToDatabase(socket, data, video);

		this.playlist.add(
			video,
			data.queue && !this.playlist.isEmpty()
		);

		return video;
	}
};