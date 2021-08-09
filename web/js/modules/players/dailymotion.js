/* eslint-disable no-undef */
import { Base, Event, State, Status } from "./base.js";
import { Errors } from "./errors.js";

export class Dailymotion extends Base {
	constructor() {
		super();
		
		this.player = null;
		this.status = Status.UNREADY;

		this.events = new Map([
			['seeked', Event.Seek],
			['pause', Event.Pause],
			['play', Event.Play],
			
			['volumechange', Event.Volume],
			['playback_ready', Event.Ready],
			['error', Event.Error],
		]);

		this.options = {
			'queue-autoplay-next': false,
			'queue-enable': false,
			'sharing-enable': false,
			'ui-highlight': 'c600ad',
			'ui-logo': false,
			'ui-start-screen-info': false
		};

		this.errors = new Map([
			['DM001', Errors.PLAYER_INVALID_ID],
			['DM002', Errors.PLAYER_UNPLAYABLE_VIDEO],
			['DM004', Errors.PLAYER_UNPLAYABLE_VIDEO],
			['DM005', Errors.PLAYER_UNPLAYABLE_VIDEO],
			['DM007', Errors.VIDEO_GEOBLOCKED],
			['DM014', Errors.PLAYER_UNPLAYABLE_VIDEO],
			['DM016', Errors.PLAYER_UNPLAYABLE_VIDEO],
		]);

		this.state = State.PLAYING;
	}

	ready(cb) {
		if (this.status === Status.READY) {
			cb();
		}
	}

	//dailymotion events have no data, so in some cases need to
	//attach some data (mainly volume)
	event(event) {
		let payload = {};

		switch (event) {
			case 'pause': this.state = State.PAUSED; break;
			case 'play': this.state = State.PLAYING; break;
			
			case 'playback_ready': {
				this.status = Status.READY; 
				this.delay(this.video.timestamp);
				break;
			}
			case 'seeked': payload.time = this.player.currentTime; break;
			case 'volumechange': payload.volume = this.player.volume; break;
			case 'error': 
				payload = {error: this.errors.get(this.player.error), player: this }; break;
		}

		super.event(this.events.get(event), payload);
	}

	loadPlayer(id, timestamp, volume) {
		this.video = {id, timestamp};
		this.player = window.DM.player(super.frame().id, {
			video: id,
			params: {
				autoplay: !(timestamp < 0),
				start: Math.max(timestamp, 0),
				mute: volume === 0,
				...this.options,
			},
		});

		this.player.addEventListener('apiready', () => {
			//listen to the rest of the events
			for (const event of this.events.keys()) {
				this.player.addEventListener(event, (payload) => this.event(event, payload));
			}

			//here we can safely set the volume
			this.player.addEventListener('video_start', () => {
				this.player.setVolume(volume);
			});
		});
	}

	playVideo(id, timestamp) {
		this.video = {id, timestamp};
		
		this.player.load(id, {
			autoplay: !(timestamp < 0),
			start: Math.max(timestamp, 0)
		});

		this.delay(timestamp);
	}

	play() {
		this.ready(() => this.player.play());
	}

	load(id) {
		this.ready(() => this.player.load(id));
	}

	pause() {
		this.ready(() => this.player.pause());
	}

	seek(to) {
		this.video.timestamp = to;
		this.ready(() => this.player.seek(to));
	}

	getTime(cb) {
		this.ready(() => cb(this.player.currentTime));
	}

	getVolume(cb) {
		this.ready(() => cb(this.player.volume));
	}

	getVideoState() {
		return this.state;
	}

	destroy() {
		this.status = Status.UNREADY;
		this.player.destroy(super.frame().id);
	}

	syncable() {
		return true;
	}
}
