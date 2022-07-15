const { Video } = require("../video");
const { Handler } = require("./base");

const settings = require("../../../bt_data/settings");
const isoCountries = require('i18n-iso-countries');
const isoDuration = require('iso8601-duration');

exports.YoutubeHandler = class extends Handler {
	constructor() {
		super();
	}

	getGeoblockedCountries(restrictions) {
		//not blocked anywhere
		if (!restrictions || !restrictions.blocked && !restrictions.allowed) {
			return false;
		}

		const geoblock = {
			kind: '',
			countries: [],
			totalCountries: 0,
			countryNames: []
		};

		//viewable everywhere
		if (restrictions.blocked && restrictions.blocked.length === 0) {
			return false;
		}

		//blacklist
		if (restrictions.blocked) {
			const ignored = settings.core.country_restriction_ignored;

			geoblock.kind = 'blacklist';
			geoblock.countries = restrictions.blocked.filter(country => !ignored.includes(country));
		}

		//whitelist
		if (restrictions.allowed) {
			const required = settings.core.country_allow_required || ['GB', 'CA', 'US'];

			geoblock.kind = 'whitelist';
			geoblock.countries = restrictions.allowed.filter(country => required.includes(country));
		}

		geoblock.totalCountries = geoblock.countries.length;
		geoblock.countries = geoblock.countries.slice(0, 10);
		geoblock.countryNames = geoblock.countries.map(code => isoCountries.getName(code, 'en'));

		return geoblock;
	}

	async handle(links, data) {
		const json = await super.api(
			'https://www.googleapis.com/youtube/v3/videos',
			{
				'Accept': 'application/json'
			},
			{
				key: settings.apikeys.youtube,
				part: 'snippet,contentDetails,status',
				hl: 'en',
				id: data.videoid
			}
		);

		const video = json?.items[0];
		const restrictions = {
			embeddable: !video.status.embeddable,
			geoblock: this.getGeoblockedCountries(video.contentDetails.regionRestriction),
			ageblock: video.contentDetails.contentRating.ytRating === 'ytAgeRestricted'
		};

		if (!data.force && Object.values(restrictions).some(value => typeof value !== "boolean" || value)) {
			links.socket.emit("videoRestriction", restrictions);
			throw new Error(`[Youtube]: Video ${data.videoid} has visibility restrictions`);
		}

		return super.handle(
			links,
			data,
			new Video({
				videoid: data.videoid,
				videotitle: encodeURIComponent(video?.snippet?.localized?.title || video?.snippet?.title),
				videolength: isoDuration.toSeconds(isoDuration.parse(video?.contentDetails?.duration)),
				videotype: "yt",
				meta: {},
			})
		);
	}
};