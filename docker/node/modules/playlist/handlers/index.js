const { DailymotionHandler } = require("./dailymotion");
const { SoundcloudHandler } = require("./soundcloud");
const { VimeoHandler } = require("./vimeo");
const { YoutubeHandler } = require("./youtube");

exports.VideoHandlers = new Map([
	['yt', new YoutubeHandler()],
	['vimeo', new VimeoHandler()],
	['dm', new DailymotionHandler()],
	['soundcloud', new SoundcloudHandler()],
	
]);
