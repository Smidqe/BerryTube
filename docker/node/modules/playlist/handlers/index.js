const {YoutubeHandler} = require("./youtube");

exports.VideoHandlers = new Map([
	['yt', new YoutubeHandler()]
]);
