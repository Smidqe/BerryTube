const { DailymotionHandler } = require("./dailymotion");
const { SoundcloudHandler } = require("./soundcloud");
const { VimeoHandler } = require("./vimeo");
const { YoutubeHandler } = require("./youtube");
const { RedditHandler } = require("./reddit");
const { DashHandler } = require("./dash");
const { HLSHandler } = require("./hls");
const { FileHandler } = require("./file");
const { ManifestHandler } = require("./manifest");
const { TwitchHandler } = require("./twitch");
const { TwitchClipHandler } = require("./twitchclip");

exports.VideoHandlers = new Map([
	['yt', new YoutubeHandler()],
	['vimeo', new VimeoHandler()],
	['dm', new DailymotionHandler()],
	['soundcloud', new SoundcloudHandler()],
	['reddit', new RedditHandler()],
	['dash', new DashHandler()],
	['hls', new HLSHandler()],
	['file', new FileHandler()],
	['manifest', new ManifestHandler()],
	['twitch', new TwitchHandler()],
	['twitchclip', new TwitchClipHandler()],
]);
