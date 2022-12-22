const { PollService } = require("./modules/polls");
const { AuthService, actions } = require("./modules/auth");
const { sanitize, generateRandomPassword } = require("./modules/security");
const { VideoHandlers, Video } = require("./modules/playlist");
const { DefaultLog, events, levels, consoleLogger, createStreamLogger } = require("./modules/log");
const { DatabaseService } = require("./modules/database");
const { SessionService, getSocketName, userTypes } = require("./modules/sessions");
const { EventServer } = require("./modules/event-server");


// Include the SERVER.settings
var SERVER = {};
SERVER.settings = require('./bt_data/settings.js');
SERVER.ponts = require('./bt_data/ponts.js');
SERVER.nick_blacklist = require('./bt_data/nick_blacklist.js');

const eventServer = new EventServer(SERVER.settings.core.nodeport);
const io = require('socket.io').listen(eventServer.native);

// Configure
io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');		   // apply etag caching logic based on SERVER.VERSION number
io.enable('browser client gzip');		   // gzip the file
io.set('log level', 1);					   // reduce logging
io.set('transports', [					   // enable all transports (optional if you want flashsocket)
	'websocket'
	//	, 'flashsocket'
	, 'htmlfile'
	, 'xhr-polling'
	, 'jsonp-polling'
]);


// our composition root
const serviceLocator = {
	log: DefaultLog,
	io,
	isUserBanned,
	banUser,
	setServerState
};

// init all services, circular references in the ctors are not allowed
const databaseService = serviceLocator.db = new DatabaseService(serviceLocator);
const authService = serviceLocator.auth = new AuthService(serviceLocator);
const sessionService = serviceLocator.sessions = new SessionService(serviceLocator);
const pollService = serviceLocator.polls = new PollService(serviceLocator);

// all registered services receive certain events, so group them up
const services = [databaseService, authService, pollService, sessionService];

var fs = require('fs');
const bcrypt = require('bcrypt');
const { randomUUID } = require("crypto");
const regexes = {
	htmlBlacklist: /<[ ]*(script|frame|style|marquee|blink)[ ]*([^>]*)>/gi,
}
const banEmotes = [
	'[](/ihavenomouthandimustscream)'
	, '[](/bant)'
	, '[](/mmmbananas)'
	, '[](/celbanned)'
	, '[](/seriouslybanned)'
	, '[](/konahappy)'
	, '[](/ppshutup)'
	, '[](/bpstfu)'
	, '[](/eatadick)'
	, '[](/suggestionbox)'
	, '[](/rargtfo)'
	, '[](/fuckyoudobby)'
	, '[](/cleese)'
	, '[](/wingflipoff)'
	, '[](/pokemonkilledmyparents)'
	, '[](/fuckyourshit)'
];

process.on("uncaughtException", function (err) {
	console.error(`Uncaught ${err.code}: ${err.message}`);
	console.error(err.stack);

	try {
		const isIgnored = err.code === "ECONNRESET" || err.code === "EPIPE";

		DefaultLog.error(events.EVENT_PROC_UNHANDLED_EXCEPTION,
			"unhandled process exception {code}: {message}. Ignoring: {isIgnored}",
			{ isIgnored, code: err && err.code, message: err && err.message },
			err);

		if (isIgnored) { return; }
	}
	catch (err) { /* the error has already been printed, so just fall out and exit */ }

	process.exit(1);
});

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
	try {
		eval(chunk);
	} catch (e) {
		DefaultLog.error(events.EVENT_REPL, "error invoking repl script: {script}", { script: chunk }, e);
	}
});

services.forEach(s => s.init());

// Add new feature to socket.io, for granular broadcasts and such
// This is probably the best solution to sending packets to all people matching x criteria easily.
// Perhaps implement some way to let superusers see secret info, like IP's, shadownban status etc
io.sockets.each = function (callback) {
	for (const client of io.sockets.clients()) {
		callback(client)
	}
};

// CREATE THE LINKED LIST DATATYPE
function LinkedList() { }
LinkedList.prototype = {
	length: 0,
	first: null,
	last: null,
};
LinkedList.Circular = function () { };
LinkedList.Circular.prototype = new LinkedList();
LinkedList.Circular.prototype.append = function (node) {
	if (this.first === null) {
		node.prev = node;
		node.next = node;
		this.first = node;
		this.last = node;
	} else {
		node.prev = this.last;
		node.next = this.first;
		this.first.prev = node;
		this.last.next = node;
		this.last = node;
	}
	this.length++;
};
LinkedList.Circular.prototype.insertAfter = function (node, newNode) {
	newNode.prev = node;
	newNode.next = node.next;
	node.next.prev = newNode;
	node.next = newNode;
	if (newNode.prev == this.last) { this.last = newNode; }
	this.length++;
};
LinkedList.Circular.prototype.insertBefore = function (node, newNode) {
	newNode.prev = node.prev;
	newNode.next = node;
	node.prev.next = newNode;
	node.prev = newNode;
	if (newNode.next == this.first) { this.first = newNode; }
	this.length++;
};
LinkedList.Circular.prototype.remove = function (node) {
	if (this.length > 1) {
		node.prev.next = node.next;
		node.next.prev = node.prev;
		if (node == this.first) { this.first = node.next; }
		if (node == this.last) { this.last = node.prev; }
	} else {
		this.first = null;
		this.last = null;
	}
	node.prev = null;
	node.next = null;
	this.length--;
};
LinkedList.Circular.prototype.toArray = function () {
	var elem = this.first;
	var out = [];
	for (var i = 0; i < this.length; i++) {
		out.push(elem.pack());
		elem = elem.next;
	}
	return out;
};

LinkedList.Circular.prototype.some = function(cb) {
	return this.find(cb) !== null;
}

LinkedList.Circular.prototype.find = function(cb) {
	let video = this.first;

	for (let i = 0; i < this.length; i++) {
		if (cb(video, i)) {
			return video;
		}

		video = video.next;
	}

	return null;
}
LinkedList.Circular.prototype.multiple = function(indexes) {
	let map = new Map(
		indexes.map(i => [i, null])
	);

	let video = this.first;
	let max = Math.max(...indexes);

	for (let i = 0; i <= max; i++) {
		if (map.has(i)) {
			map.set(i, video);
		}

		video = video.next;
	}

	return indexes.map(i => map.get(i));
}
LinkedList.Circular.prototype.at = function(index) {
	let video = this.first;

	for (let i = 0; i < index; i++) {
		video = video.next;
	}

	return video;
}

LinkedList.Circular.prototype.each = function(cb) {
	let video = this.first;

	for (let i = 0; i < this.length; i++) {
		cb(video, i);
		video = video.next;
	}
}

LinkedList.Circular.prototype.indexOf = function(cb) {
	let video = this.first;

	for (let i = 0; i < this.length; i++) {
		if (cb(video, i)) {
			return i;
		}

		video = video.next;
	}

	return -1;
}


/* VAR INIT */
SERVER.PLAYLIST = new LinkedList.Circular();
SERVER.ACTIVE = null;
SERVER.LIVE_MODE = false;
SERVER.AREAS = new Map();
SERVER.STATE = 1;
SERVER.TIME = -SERVER.settings.vc.head_time; // referring to time
SERVER._TIME = 0; // Previous tick time.
SERVER.OUTBUFFER = {};
SERVER.BANS = [];
SERVER.FILTERS = [];
SERVER.DRINKS = 0;
SERVER.RECENTLY_REGISTERED = new Map();

// sets where our log output goes for our default logger...
DefaultLog.addLogger(
	// outputs everything to the console...
	consoleLogger,

	// outputs to the log files...
	createStreamLogger({
		[levels.LEVEL_DEBUG]: fs.createWriteStream(SERVER.settings.core.debug_file_name, { flags: "w" }),
		[levels.LEVEL_INFORMATION]: fs.createWriteStream(SERVER.settings.core.log_file_name, { flags: "w" }),
		[levels.LEVEL_ERROR]: fs.createWriteStream(SERVER.settings.core.error_file_name, { flags: "a" })
	}),

	// forwards all log messages that begin with "EVENT_ADMIN_" to the mod channel...
	async (logEvent) => {
		const { event, formatted, data, createdAt } = logEvent;

		if (!event.startsWith("EVENT_ADMIN_")) { return; }

		const buffer = SERVER.OUTBUFFER["adminLog"] = (SERVER.OUTBUFFER["adminLog"] || []);
		const adminMessage = {
			msg: formatted,
			type: data.type || "site",
			nick: data.mod,
			berry: sessionService.getBerries().some(sess => sess.nick === data.mod),
			timestamp: Math.round(createdAt.getTime() / 1000),
			logEvent
		};

		buffer.push(adminMessage);
		if (buffer.length > SERVER.settings.core.max_saved_buffer) { buffer.shift(); }

		sessionService.forCan(actions.CAN_SEE_ADMIN_LOG, session => session.emit("adminLog", adminMessage));
	});

async function initPlaylist(callback) {
	const {result} = await databaseService.query`
		SELECT 
			* 
		FROM 
			videos 
		ORDER BY position
	`;

	for (const video of result) {
		SERVER.PLAYLIST.append(new Video(video));
	}

	SERVER.ACTIVE = SERVER.PLAYLIST.first;

	SERVER.PLAYLIST.each(async (video, index) => {
		await databaseService.query`
			update videos set position = ${index} where videoid = ${video.id()}
		`;
	}); 


	if (callback) { callback(); }
}
function initResumePosition(callback) {
	getMisc({ name: 'server_active_videoid' }, function (old_videoid) {
		const active = SERVER.PLAYLIST.find(video => video.id() === old_videoid);

		if (active) {
			SERVER.ACTIVE = active;

			getMisc({ name: 'server_time' }, function (old_time) {
				if (+old_time) {
					SERVER.TIME = +old_time + 1;
				}
				if (callback) { callback(); }
			});
		}

		if (callback) { callback(); }
	});
}
async function upsertMisc(data, callback) {
	await databaseService.query`
		insert into
			misc (name, value)
		VALUES
			(${data.name}, ${data.value})
		ON DUPLICATE KEY UPDATE value = ${data.value}	
	`.then(callback);
}
async function getMisc(data, callback) {
	const {result} = await databaseService.query`
		SELECT 
			* 
		FROM 
			misc 
		WHERE 
			name = ${data.name.trim()}`;

	if (!result || result.length === 0) {
		return null;
	}

	if (callback) {
		callback(result[0].value)
	}

	return result[0].value;
}

function initHardbant(callback) {
	getMisc({ name: 'hardbant_ips' }, function (ips) {
		if (ips) {
			SERVER.BANS = JSON.parse(ips) || [];
		}
		if (callback) { callback(); }
	});
}
function initShadowbant(callback) {
	getMisc({ name: "shadowbant_ips" }, function (ips) {
		if (ips) {
			
			var shadowbant = JSON.parse(ips) || [];
			for (var i = 0; i < shadowbant.length; ++i) {
				var data = shadowbant[i];
				sessionService.setShadowbanForIp(data.ip, true, data.temp);
			}
		}

		if (callback) {
			callback();
		}
	});
}
function initFilters(callback) {
	getMisc({ name: 'filters' }, function (filters) {
		if (filters) {
			SERVER.FILTERS = [];
			try {
				SERVER.FILTERS = JSON.parse(filters) || [];
			} catch (e) {
				SERVER.FILTERS = [];
			}

		}
		if (callback) { callback(); }
	});
}

function initTimer() {
	SERVER._TIME = new Date().getTime();

	setInterval(function () {
		if (!SERVER.ACTIVE) {
			return;
		}

		const timestamp = (new Date()).getTime();
		const elapsedMilliseconds = (timestamp - SERVER._TIME);
		const elapsedSeconds = elapsedMilliseconds / 1000

		SERVER._TIME = timestamp;

		for (const service of services) {
			service.onTick(elapsedMilliseconds);
		}

		//server state 2 is paused
		if (!SERVER.LIVE_MODE && SERVER.STATE !== 2) {
			const hbInterval = (SERVER.settings.core.heartbeat_interval / 1000);

			//only beat on different seconds
			const beat = Math.floor(SERVER.TIME + elapsedSeconds) > Math.floor(SERVER.TIME);

			if (Math.ceil(SERVER.TIME + 1) >= (SERVER.ACTIVE.duration() + SERVER.settings.vc.tail_time)) {
				playNext();
				return;
			}

			if (beat && SERVER.TIME > 0 && Math.floor(SERVER.TIME) % hbInterval === 0) {
				sendStatus("hbVideoDetail", io.sockets);
				upsertMisc({ name: 'server_time', value: '' + Math.ceil(SERVER.TIME) });
			}

			SERVER.TIME += elapsedSeconds;
		}
	}, 1000);
}
async function initAreas() {
	const {result} = await databaseService.query`
		select * from areas
	`;

	for (const area of result) {
		SERVER.AREAS.set(area.name, area.html);
	}
}
async function sendAreas(socket) {
	const areas = [];

	for (const [name, html] of SERVER.AREAS) {
		areas.push({name, html})
	}

	socket.emit("setAreas", areas);
}

/* Grumble, the regex above makes my syntax highlighter lose its mind. Putting this here to end the madness. */
async function setAreas(areaname, content) {
	// Just for the 8-year olds
	content = content.replace(
		/<[ ]*(script|frame|style|marquee|blink)[ ]*([^>]*)>/gi,
		"&lt;$1$2&gt;"
	);

	SERVER.AREAS.set(areaname, content);

	await databaseService.query`
		INSERT INTO areas (name, html)
		VALUES (${areaname}, ${content})
		ON DUPLICATE KEY
		UPDATE html = ${content}
	`;

	sendAreas(io.sockets);
}
function sendStatus(name, target) {
	if (!SERVER.ACTIVE) {
		return;
	}

	target.emit(name, {
		video: SERVER.ACTIVE.pack(),
		time: SERVER.TIME,
		state: SERVER.STATE
	});

	eventServer.emit('videoStatus', {
		time: Math.round(SERVER.TIME),
		state: SERVER.STATE
	});


}
function doorStuck(socket) {
	socket.emit("recvNewPlaylist", SERVER.PLAYLIST.toArray());
	socket.emit('doorStuck');
}
function playNext() {
	const previous = SERVER.ACTIVE;

	SERVER.ACTIVE = SERVER.ACTIVE.next;

	previous.removeTag(true);

	if (previous.volatile()) {
		delVideo(previous);
	}

	handleNewVideoChange();
	sendStatus("forceVideoChange", io.sockets);
}
function prepareBans() {
	const now = new Date().getTime();
	
	if (!SERVER.BANS) {
		return;
	}

	SERVER.BANS = SERVER.BANS.filter(ban => {
		if (ban.duration === -1) {
			return true;
		}

		//ban expired
		if (now - ban.bannedOn >= ban.duration * 60000) {
			return false;
		}
	})
}
function augmentBan(ban, o) {

	if (!getToggleable("spaceaids")) { return; }

	// Merge IPs, Nicks, Take earlier time, take longer duration.
	for (ip in o.ips) {
		if (ban.ips.indexOf(o.ips[ip]) < 0) {
			ban.ips.push(o.ips[ip]);
		}
	}
	for (nick in o.nicks) {
		if (ban.nicks.indexOf(o.nicks[nick]) < 0) {
			ban.nicks.push(o.nicks[nick]);
		}
	}

	// Take earlier ban time.
	if (o.bannedOn < ban.bannedOn) { ban.bannedOn = o.bannedOn; }

	// Take all special values direct, otherwise, replace only if longer period.
	if (o.duration <= 0) { ban.duration = o.duration; }
	else if (o.duration > ban.duration) { ban.duration = o.duration; }
}
function isUserBanned(o) {
	var required = ['ips', 'nicks'];
	for (elem in required) { if (!(required[elem] in o)) return; }

	prepareBans();

	/*
	const ban = SERVER.BANS.
	*/

	for (bannedguy in SERVER.BANS) {



		// Check all IP's
		for (ip in o.ips) {
			if (!SERVER.BANS[bannedguy].ips) { SERVER.BANS[bannedguy].ips = []; }
			if (SERVER.BANS[bannedguy].ips.indexOf(o.ips[ip]) >= 0) {
				augmentBan(SERVER.BANS[bannedguy], o);
				return SERVER.BANS[bannedguy];
			}
		}
		// Check all Nicks
		for (nick in o.nicks) {
			if (!SERVER.BANS[bannedguy].nicks) { SERVER.BANS[bannedguy].nicks = []; }
			if (SERVER.BANS[bannedguy].nicks.indexOf(o.nicks[nick]) >= 0) {
				augmentBan(SERVER.BANS[bannedguy], o);
				return SERVER.BANS[bannedguy];
			}
		}
	}

	return false;
}
function sendBanlist(socket) {
	prepareBans();
	socket.emit("recvBanlist", SERVER.BANS);
}
function isUserShadowBanned(socket) {
	return sessionService.getIpEntry(socket.ip).shadowban.is;
}
function kickIfUnderLevel(socket, reason, level) {
	if (socket.session.type < level) {
		socket.session.kick(reason);
	}
}
function kickForIllegalActivity(socket, reason) {
	DefaultLog.info(events.EVENT_ADMIN_KICKED,
		"{nick} got kicked because {reason} (illegal things)",
		{ nick: getSocketName(socket), type: "user", reason });

	socket.emit("kicked", reason);
	socket.disconnect(); // NOT ALLOWED.
}
function kickUserByNick(socket, nick, reason) {
	sessionService.forNick(nick, session => session.kick(reason, getSocketName(socket)));
}

process.on('SIGTERM', function (signal) {
	io.sockets.emit('serverRestart');
	
	setTimeout(function () {
		process.exit(128 + signal);
	}, 3000);
});
function setServerState(state) {
	SERVER.STATE = state;
}
function getCommand(msg) {
	var re = new RegExp("^/([a-zA-Z]*)([\d-0-9.]*)\\s*(.*)", "i");
	var parsed = { msg: msg, command: false, multi: 1 };
	if (ret = msg.match(re)) {
		parsed.command = ret[1].toLowerCase();
		parsed.multi = parseFloat(ret[2] || 1);
		parsed.msg = ret[3];
	}

	return parsed;
}
function handleNewVideoChange() {
	DefaultLog.info(events.EVENT_VIDEO_CHANGE,
		"changed video to {videoTitle}",
		{ videoTitle: decodeURI(SERVER.ACTIVE.title()) });

	eventServer.emit('videoChange', {
		id: SERVER.ACTIVE.id(),
		length: SERVER.ACTIVE.duration(),
		title: decodeURI(SERVER.ACTIVE.title()),
		type: SERVER.ACTIVE.source(),
		volat: SERVER.ACTIVE.volatile()
	});

	resetDrinks();
	resetTime();

	SERVER.LIVE_MODE = SERVER.ACTIVE.duration() == 0;

	if (SERVER.LIVE_MODE) {
		SERVER.STATE = 1;
	}

	upsertMisc({ name: 'server_time', value: `${Math.ceil(SERVER.TIME)}` });
	upsertMisc({ name: 'server_active_videoid', value: `${SERVER.ACTIVE.id()}` });
}
function sendDrinks(socket) {
	socket.emit("drinkCount", {
		drinks: formatDrinkMessage(SERVER.DRINKS)
	});

	eventServer.emit('drinkCount', {
		drinks: SERVER.DRINKS
	});
}
function resetDrinks() {
	SERVER.DRINKS = 0;
	sendDrinks(io.sockets);
}
function resetTime() {
	SERVER.TIME = -SERVER.settings.vc.head_time;
}
function addDrink(amount, socket) {
	SERVER.DRINKS += parseFloat(amount);

	if (isDrinkAmountExcessive(SERVER.DRINKS)) {
		kickForIllegalActivity(socket, "Berry Punch is mad at you");
	}

	sendDrinks(io.sockets);
}

function applyFilters(nick, msg, socket) {
	var actionChain = [];
	const filterCount = SERVER.FILTERS.length;
	const flags = {
		sendToSelf: undefined,
		sendToUsers: undefined,
		sendToAdmins: undefined,
		addToBuffer: undefined,
		serverResponseMessage: undefined
	};

	try {
		for(var i=0;i<SERVER.FILTERS.length;i++){
			var d = SERVER.FILTERS[i];
			// Enabled?
			if (d.enable == false) {
				continue;
			}

			// Sanity Check, kill rule on failure.
			try {
				var nickCheck = new RegExp(d.nickMatch, d.nickParam);
				var chatCheck = new RegExp(d.chatMatch, d.chatParam);
			} catch (e) {
				DefaultLog.error(events.EVENT_ADMIN_APPLY_FILTERS, "could not apply filter {filterId} to chat message", { filterId: i }, e);
				SERVER.FILTERS.splice(i, 1);
				continue;
			}

			if (nickCheck.test(nick)) {
				if (chatCheck.test(msg)) {
					// Perform Action
					actionChain.push({ action: d.actionSelector, meta: d.actionMetadata });
				}
				if (d.chatReplace.trim().length > 0) {
					msg = msg.replace(chatCheck, d.chatReplace);
				}
			}
		}

		for (const action of actionChain) {
			switch (action.action) {
				case "kick":
					kickIfUnderLevel(socket, action.meta, 1);
					break;

				case "hush":
					msg = msg.toLowerCase();
					break;

				case "suppress":
					flags.addToBuffer = false;
					flags.sendToAdmins = true;
					flags.sendToSelf = true;
					flags.sendToUsers = false;
					flags.serverResponseMessage = action.meta;
					break;
			}
		}
	} catch(e) {
		// The filters are fucked, somehow.
		DefaultLog.error(events.EVENT_ADMIN_APPLY_FILTERS, "could not apply filters to chat message", {}, e);
	}

	//some filters were faulty, remove from database too
	if (SERVER.FILTERS.length !== filterCount) {
		upsertMisc({ name: 'filters', value: JSON.stringify(SERVER.FILTERS) });
	}

	return { message: msg, flags };
}
function applyPluginFilters(msg, socket) {
	if (getToggleable("bestponi")) {
		//handle best pony.
		const re = new RegExp('^[a-zA-Z ]+is bes([st]) pon([tiye])(.*)', 'i');
		const poni = SERVER.ponts[Math.floor(Math.random() * SERVER.ponts.length)];

		msg = msg.replace(re, poni + ' is bes$1 pon$2$3');
	}

	if (getToggleable("wobniar")) {
		//handle backwards text.
		var words = msg.split(" ");
		for (var i = 0; i < words.length; i++) {
			words[i] = words[i].split("").reverse().join("");
		}
		msg = words.join(" ");
	}

	return msg;
}
function setVideoVolatile(socket, video, isVolat) {
	video.setVolatile(isVolat);

	DefaultLog.info(events.EVENT_ADMIN_SET_VOLATILE,
		"{mod} set {title} to {status}",
		{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()), status: isVolat ? "volatile" : "not volatile" });
}

async function setVideoColorTag(socket, elem, tag, volat) {
	if (!tag) {
		elem.removeTag(false);
	} else {
		elem.setTag(tag, volat);
	}
	
	await databaseService.query`
		UPDATE
			videos
		SET
			meta = ${JSON.stringify(elem.metadata())}
		WHERE
			videoid = ${elem.id()}
	`;
}

function banUser(data, mod = undefined) {
	if (['ips', 'nicks', 'duration'].some(n => !(n in data))) {
		return;
	}
	
	data.bannedOn = new Date().getTime();

	var existing = isUserBanned(data);

	if (existing) {
		augmentBan(existing, data);
	} else {
		SERVER.BANS.push(data);
	}

	prepareBans();

	if (mod) {
		DefaultLog.info(events.EVENT_ADMIN_BANNED,
			"{mod} {action} {nick} {duration}",
			{ nick: data.nicks.join('/'), action: data.duration === 0 ? 'unbanned' : 'banned', type: "user", mod, duration: data.duration > 0 ? `for ${data.duration} minutes` : 'permanently' });
	}

	for (const nick of data.nicks) {
		sessionService.forNick(nick, s => s.kick("You have been banned."));
	}

	upsertMisc({ name: 'hardbant_ips', value: JSON.stringify(SERVER.BANS) });
}

/* ================= */
function emitChat(socket, data, ghost) {
	if (socket) {
		socket.emit("chatMsg", { msg: data, ghost: ghost });
	}
}

function sendChat(nick, type, incoming, socket) {
	if (!socket.doSpamblockedAction()) {
		kickIfUnderLevel(socket, "Spamming", 1);
		return;
	}

	_sendChat(nick, type, incoming, socket);
}

const doNormalChatMessage = { doSuppress: false };
const doSuppressChat = { doSuppress: true };

const chatCommandMap = {
	// /me wiggles the tub
	...withAliases(["me"], (_parsed, _socket, messageData) => {
		messageData.emote = "act";
		return doNormalChatMessage;
	}),

	// /sb greetings programs
	...withAliases(["sb"], (_parsed, _socket, messageData) => {
		messageData.emote = "sweetiebot";
		return doNormalChatMessage;
	}),

	// /rcv attention berrytube: BUTTS
	...withAliases(
		["rcv", "shout", "yell", "announcement", "rcv"],
		(parsed, socket, messageData) => {
			if (!authService.can(socket.session, actions.ACTION_ANNOUNCE)) {
				return doSuppressChat;
			}

			messageData.emote = "rcv";
			messageData.msg = parsed.msg; // Specifically not using the fun bits here.
			return doNormalChatMessage;
		},
	),

	// /r rainbow rocks
	...withAliases(
		["r", "request", "requests", "req"],
		(_parsed, _socket, messageData) => {
			messageData.emote = "request";
			return doNormalChatMessage;
		},
	),

	// /sp snape kills dumbledoor
	...withAliases(
		["spoiler", "sp", "spoilers"],
		(_parsed, _socket, messageData) => {
			messageData.emote = "spoiler";
			return doNormalChatMessage;
		},
	),

	// /d AMGIC!
	...withAliases(["drink", "d"], (parsed, socket, messageData) => {
		if (!authService.can(socket.session, actions.ACTION_CALL_DRINKS)) {
			return doSuppressChat;
		}

		messageData.emote = "drink";

		if (messageData.metadata.channel === "main") {
			addDrink(parsed.multi, socket);
		}

		return doNormalChatMessage;
	}),

	// /kick nlaq
	...withAliases(["kick", "k"], (parsed, socket, _messageData) => {
		if (!authService.can(socket.session, actions.ACTION_KICK_USER)) {
			kickForIllegalActivity(socket, "You cannot kick users");
			return doSuppressChat;
		}

		const parts = parsed.msg.split(" ");

		if (parts[0]) {
			kickUserByNick(
				socket,
				parts[0],
				parts.slice(1).join(" ") || undefined,
			);
		}

		return doSuppressChat;
	}),

	// what does this even do
	...withAliases(["shitpost"], (parsed, socket, messageData) => {
		if (!authService.can(socket.session, actions.ACTION_SHITPOST)) {
			kickForIllegalActivity(socket, "You cannot shitpost");
			return doSuppressChat;
		}

		const parts = parsed.msg.split(" ");
		if (parts[0]) {
			DefaultLog.info(
				events.EVENT_ADMIN_SHATPOST,
				"{mod} shatpost {title}",
				{ mod: messageData.nick, type: "site", title: parts[0] },
			);

			io.sockets.emit("shitpost", {
				msg: parsed.msg,
				random: Math.random(),
				randomMessage: SERVER.OUTBUFFER.main?.[Math.floor(Math.random() * SERVER.OUTBUFFER.main?.length)]?.metadata?.uuid,
			});
		}

		return doSuppressChat;
	}),

	// /fondlepw nlaq
	...withAliases(["fondlepw", "resetpw", "pwreset", "resetpassword", "passwordreset"], (parsed, socket, _messageData) => {
		if (
			!authService.can(socket.session, actions.ACTION_CAN_RESET_PASSWORD)
		) {
			kickForIllegalActivity(socket, "You cannot reset a password");
			return doSuppressChat;
		}

		const nickToReset = parsed.msg.trim();
		if (!nickToReset.length) {
			sendMessage(`please specify a nick: "/fondlepw nick"`);
			return doSuppressChat;
		}

		(async () => {
			const { result } = await databaseService.query`
				SELECT
					name
				FROM
					users
				WHERE
					name = ${nickToReset} AND type < 2`;

			if (!result || result.length !== 1) {
				sendMessage(
					`cannot reset password for "${nickToReset}": user does not exist or is an admin`,
				);
				return;
			}

			const foundNick = result[0].name;
			const randomPassword = generateRandomPassword();
			const randomPasswordHashed = await bcrypt.hash(
				randomPassword,
				SERVER.settings.core.bcrypt_rounds,
			);

			await databaseService.query`
				UPDATE
					users
				SET
					pass = ${randomPasswordHashed}
				WHERE
					name = ${foundNick}`;

			sendMessage(
				`password for "${foundNick}" has been reset to "${randomPassword}"`,
			);

			DefaultLog.info(
				events.EVENT_ADMIN_USER_PASSWORD_RESET,
				"{mod} reset {nick}'s password",
				{ mod: getSocketName(socket), type: "user", nick: foundNick },
			);
		})();

		// ok to return while we process the command above
		return doSuppressChat;

		function sendMessage(message) {
			emitChat(
				socket,
				{
					nick: "server",
					emote: "server",
					metadata: { channel: "main" },
					msg: message,
					timestamp: new Date().toUTCString(),
				},
				false,
			);
		}
	}),
};

function _sendChat(nick, type, incoming, socket) {
	const messageText = sanitize(incoming.msg);
	const metadata = incoming.metadata;
	const { channel = "main" } = metadata;
	const timestamp = new Date().toUTCString();
	const isSocketBanned = isUserShadowBanned(socket);
	
	const flags = {
		addToBuffer: true,
		sendToAdmins: false,
		sendToUsers: true,
		sendToSelf: false,
		serverResponseMessage: undefined
	};

	if (channel !== "main") {
		// Someone trying to send a message to a channel they're not in?!
		// Also, let server send messages to admin chat.
		if (
			type < userTypes.ADMINISTRATOR &&
			io.sockets.manager.roomClients[socket.id]["/" + channel] !== true
		) {
			return;
		}

		flags.sendToAdmins = true;
		flags.sendToUsers = false;
	}

	if (isSocketBanned) {
		flags.sendToAdmins = true;
		flags.addToBuffer = flags.sendToUsers = false;
		flags.sendToSelf = true;
	}

	if (getToggleable("mutegray") && type <= userTypes.ANONYMOUS) {
		emitChat(
			socket,
			{
				nick: "server",
				emote: "server",
				metadata: metadata,
				msg:
					"Unregistered users are not currently allowed to chat. Sorry!",
				timestamp: timestamp,
			},
			false,
		);

		metadata.graymute = true;
		flags.sendToAdmins = true;
		flags.addToBuffer = flags.sendToUsers = false;
		flags.sendToSelf = false;
	}

	const filterResult = applyFilters(nick, messageText, socket);
	for (const [key, value] of Object.entries(filterResult.flags)) {
		if (typeof(value) === "undefined") {
			continue;
		}

		flags[key] = value;
	}
	
	const parsed = getCommand(filterResult.message);

	const messageData = {
		emote: false,
		nick: nick,
		type: type,
		msg: applyPluginFilters(parsed.msg, socket),
		metadata: metadata,
		multi: parsed.multi,
		timestamp: timestamp,
	};

	const command = chatCommandMap[parsed.command];
	if (command) {
		const { doSuppress } = command(parsed, socket, messageData);

		if (doSuppress) {
			return;
		}
	}

	if (flags.serverResponseMessage) {
		emitChat(socket, { nick: "server", emote: "server", msg: flags.serverResponseMessage, metadata, timestamp });
	}

	if (flags.sendToAdmins) {
		sessionService.forCan(actions.CAN_SEE_SHADOWBANS, session =>
			emitChat(session, {
				...messageData,
				metadata: {
					...messageData.metadata,
					graymute: true
				}
			}, false),
		);
	}

	if (flags.sendToSelf) {
		emitChat(socket, messageData, false);
	}

	if (flags.sendToUsers) {
		emitChat(io.sockets, messageData, false);
	}

	if (flags.addToBuffer) {
		const targetBuffer = SERVER.OUTBUFFER[channel] || (SERVER.OUTBUFFER[channel] = []);
		targetBuffer.push(messageData);

		if (targetBuffer.length > SERVER.settings.core.max_saved_buffer) {
			targetBuffer.shift();
		}
	}
}

/* ================= */
function setOverrideCss(path) {
	upsertMisc({ name: "overrideCss", value: path }, function () {
		io.sockets.emit("overrideCss", path);
	});
}
function setToggleable(socket, name, state, callback) {
	if (typeof SERVER.settings.toggles[name] == "undefined") {
		callback(`Toggleable ${name} not found`);
		return;
	}
	if (typeof state == "undefined") {
		state = !SERVER.settings.toggles[name][0];
	}

	SERVER.settings.toggles[name][0] = state;

	if (callback) {
		callback(null, {
			name: name,
			state: state
		});
	}
}
function getToggleable(name) {
	if (typeof SERVER.settings.toggles[name] == "undefined") {
		DefaultLog.error(events.EVENT_GENERAL, "No such toggleable {name} found", { name });
		return false;
	}

	return SERVER.settings.toggles[name][0];
}
function sendToggleables(socket) {
	var data = {};
	for (var key in SERVER.settings.toggles) {
		if (SERVER.settings.toggles.hasOwnProperty(key)) {
			data[key] = {
				label: SERVER.settings.toggles[key][1],
				state: SERVER.settings.toggles[key][0]
			};
		}
	}
	socket.emit("setToggleables", data);
}

async function saveToHistory(video) {
	if (video.duration() === 0) {
		return;
	}

	await databaseService.query`
		insert into videos_history (videoid, videotitle, videolength, videotype, date_added, meta) 
		values (${video.id()},${video.title()},${video.duration()},${video.source()},NOW(),${JSON.stringify(video.meta)})
	`;
}

async function delVideo(video, position, sanity, socket) {
	if (video.deleted) {
		return;
	}

	if (sanity && video.id() !== sanity) {
		return doorStuck(socket);
	}

	SERVER.PLAYLIST.remove(video);
	
	io.sockets.emit('delVideo', {
		position,
		sanityid: video.id()
	});
	
	await databaseService.query` delete from videos where videoid = ${video.id()} limit 1;`
		.then(() => saveToHistory(video))
		.catch(err => {
			DefaultLog.error(events.EVENT_ADMIN_DELETED_VIDEO,
				"{mod} could not delete {title}",
				{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()) }, err);
		});

	video.deleted = true;

	DefaultLog.info(events.EVENT_ADMIN_DELETED_VIDEO,
		"{mod} deleted {title}",
		{ mod: getSocketName(socket), type: "playlist", title: decodeURIComponent(video.title()) });

	//update positions
	await databaseService.query`
		update videos set position = position - 1 where position > ${position}
	`;
}

async function setUserNote(data) {
	if (!authService.can(socket.session, actions.ACTION_SET_USER_NOTE)) {
		kickForIllegalActivity(socket, "You cannot set usernote");
		return;
	}

	const {row} = await databaseService.query`
		select meta from users where name = ${data.nick}
	`;

	const meta = {
		...row[0].meta,
		note: data.note
	};

	await databaseService.query`
		update users set meta = ${JSON.stringify(meta)} where name = ${data.nick}
	`.then(() => {
		DefaultLog.info(events.EVENT_ADMIN_SET_NOTE,
			"{mod} set {nick}'s note to '{note}'",
			{ mod: getSocketName(socket), type: "user", nick: data.nick, note: data.note });

		sessionService.forNick(d.nick, s => s.updateMeta(meta));
		sessionService.forCan(actions.CAN_SEE_PRIVILEGED_USER_DATA,
			session => session.emit("fondleUser", data));
	});
}


/* RUN ONCE INIT */
initPlaylist(function () {
	initResumePosition(function () {
		initTimer();
	});
});
initShadowbant();
initHardbant();
initFilters();
initAreas();
DefaultLog.info(events.EVENT_SERVER_STATUS, "server version {version} started up", { version: SERVER.settings.core.version });

io.configure(function () {
	io.set('authorization', function (handshakeData, callback) {

		if (isUserBanned({
			ips: [handshakeData.address.address],
			nicks: []
		})) {
			callback("BAN", false); // error first callback style
		}

		// OK
		callback(null, true); // error first callback style
	});
});

io.sockets.on('connection', function (ioSocket) {
	const socket = serviceLocator.sessions.fromIoSocket(ioSocket);
	if (socket === null) {
		// the socket connection was rejected
		ioSocket.disconnect();
		DefaultLog.error(events.EVENT_GENERAL, "rejecting socket");
		return;
	}

	services.forEach(s => s.onSocketConnected(socket));

	socket.addOnAuthenticatedHandler(() => {
		if (socket.session.type < userTypes.MODERATOR) {
			return;
		}

		socket.socket.join("admin");
		sendToggleables(socket);

		for (const message of SERVER.OUTBUFFER["admin"] || []) {
			emitChat(socket, message, true);
		}

		for (const logMessage of SERVER.OUTBUFFER["adminLog"] || []) {
			socket.emit("adminLog", {
				...logMessage,
				ghost: true,
			});
		}
	});

	// Send the SERVER.PLAYLIST, and then the position.
	sendToggleables(socket);
	socket.emit("recvPlaylist", SERVER.PLAYLIST.toArray());
	sendDrinks(socket);
	sendAreas(socket);
	for (var i in SERVER.OUTBUFFER['main']) {
		emitChat(socket, SERVER.OUTBUFFER['main'][i], true);
	}

	socket.on("setOverrideCss", function (data) {
		if (!authService.can(socket.session, actions.ACTION_CAN_SET_CSS)) {
			kickForIllegalActivity(socket, "You cannot set the override theme");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_SET_CSS,
			"{mod} set css override to {css}",
			{ mod: getSocketName(socket), type: "site", css: data });

		setOverrideCss(data);
	});
	socket.on("setFilters", function (data) {
		if (!authService.can(socket.session, actions.ACTION_SET_FILTERS)) {
			kickForIllegalActivity(socket, "You cannot set the Filters");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_EDITED_FILTERS,
			"{mod} edited filters",
			{ mod: getSocketName(socket), type: "site" });

		//validate and complain if necessary

		SERVER.FILTERS = data;

		upsertMisc({ name: 'filters', value: JSON.stringify(SERVER.FILTERS) });
	});
	socket.on("searchHistory", async function (data) {
		if (!authService.can(socket.session, actions.ACTION_SEARCH_HISTORY)) {
			socket.emit("searchHistoryResults", []);
			return;
		}

		const pattern = '%' + encodeURI(data.search).replace(/%/g, '\\%') + '%';
		const { result } = await databaseService.query`
			SELECT
				*
			FROM
				videos_history
			WHERE
				videotitle LIKE ${pattern}
			ORDER BY
				date_added DESC
			LIMIT 50`;

		socket.emit("searchHistoryResults",
			result.map(res => {
				let meta = null;
				try {
					meta = JSON.parse(res.meta);
				} catch { }

				return {
					...res,
					meta: typeof (meta) === "object" ? meta : {}
				};
			}));
	});
	socket.on("delVideoHistory", async function (data) {
		if (!authService.can(socket.session, actions.ACTION_DELETE_HISTORY)) {
			return;
		}

		const logData = { mod: getSocketName(socket), type: "playlist", id: data.videoid };

		if (!/^[\w \-#]{3,50}$/.test(data.videoid)) {
			DefaultLog.error(events.EVENT_ADMIN_CLEARED_HISTORY, "{mod} could not delete history for invalid id {id}", logData);
			return;
		}

		await databaseService.query`
			delete from videos_history where videoid = ${data.videoid} limit 1
		`
			.then(() => DefaultLog.info(events.EVENT_ADMIN_CLEARED_HISTORY, "{mod} deleted history for id {id}", logData))
			.catch((err) => DefaultLog.error(events.EVENT_ADMIN_CLEARED_HISTORY, "{mod} could not delete history for invalid id {id}", logData, err));
	});
	socket.on("randomizeList", function (data) {
		if (!authService.can(socket.session, actions.ACTION_RANDOMIZE_LIST)) {
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_RANDOMIZED_PLAYLIST,
			"{mod} randomized playlist",
			{ mod: getSocketName(socket), type: "playlist" }
		);

		var newSz = SERVER.PLAYLIST.length;
		var tmp = [];
		var elem = SERVER.PLAYLIST.first;
		for (var i = 0; i < newSz; i++) {
			tmp.push(elem);

			elem = elem.next;
		}
		for (var i = 0; i < newSz; i++) {
			var x = Math.floor(Math.random() * tmp.length);
			var newGuy = tmp[x];
			tmp.splice(x, 1);
			SERVER.PLAYLIST.remove(newGuy);
			SERVER.PLAYLIST.append(newGuy);
		}
		io.sockets.emit("recvNewPlaylist", SERVER.PLAYLIST.toArray());
	});
	socket.on('getFilters', function () {
		if (!authService.can(socket.session, actions.ACTION_GET_FILTERS)) {
			kickForIllegalActivity(socket, "You cannot get filters");
			return;
		}

		socket.emit("recvFilters", SERVER.FILTERS);
	});
	socket.on('setToggleable', function (data) {
		if (!authService.can(socket.session, actions.ACTION_SET_TOGGLEABLS)) {
			kickForIllegalActivity(socket, "You cannot set a toggleable");
			return;
		}

		let tn = data.name;
		let ts = data.state;
		setToggleable(socket, tn, ts, function (err) {
			const logData = { mod: getSocketName(socket), type: "site", name: tn, state: ts ? "on" : "off" };

			if (err) {
				DefaultLog.error(events.EVENT_ADMIN_SET_TOGGLEABLE, "{mod} could not set {name} to {state}", logData);
				return;
			}

			DefaultLog.info(events.EVENT_ADMIN_SET_TOGGLEABLE, "{mod} set {name} to {state}", logData);
			sendToggleables(io.sockets);
		});
	});

	socket.on("myPlaylistIsInited", function (data) {
		sendStatus("createPlayer", socket);
	});
	socket.on("renewPos", function (data) {
		sendStatus("renewPos", socket);
	});
	socket.on("refreshMyVideo", function (data) {
		sendStatus("forceVideoChange", socket);
	});
	socket.on("refreshMyPlaylist", function () {
		socket.emit("recvNewPlaylist", SERVER.PLAYLIST.toArray());
	});

	socket.on("chat", async data => {
		const { session: { type, nick }, ip } = socket;

		if (typeof (nick) !== "string" || !ip) { 
			throw kick("You must be logged in to chat"); 
		}

		if (typeof (data) !== "object" || typeof (data.msg) !== "string") { 
			throw kick("Expected data"); 
		}
		
		if (type < userTypes.ANONYMOUS || nick === '[no username]') { 
			throw kick("Your session is broken, most likely network related. Refresh."); 
		}

		const { metadata: metaAttempt, msg } = data;
		if (msg.length > SERVER.settings.core.max_chat_size) { throw kick(`Message length exeeds max size of ${SERVER.settings.core.max_chat_size}`); }

		const metadata = {
			uuid: randomUUID(),
			nameflaunt: !!metaAttempt.nameflaunt,
			flair: ["string", "number"].includes(typeof (metaAttempt.flair))
				? metaAttempt.flair
				: "",
			channel: metaAttempt.channel
		};

		if (metadata.nameflaunt && type < 1) { throw kick(`User ${nick} attempted to flaunt their name, but they are not a mod!`); }

		sendChat(nick, type, { msg, metadata }, socket);
		DefaultLog.info(events.EVENT_CHAT, "user {session} on ip {ip} sent message {message}", {
			ip,
			session: socket.session.systemName,
			message: msg
		});

		function kick(message) {
			kickForIllegalActivity(socket, message);
			return new Error(message);
		}
	});

	socket.on("registerNick", async function (data) {
		if (!getToggleable("allowreg")) {
			return socket.emit("loginError", { message: "Registrations are currently Closed. Sorry for the inconvenience!" })
		}

		const logData = { ip: socket.ip, nick: data.nick };

		if (!socket.ip) { 
			return false; 
		}

		if (socket.ip !== "172.20.0.1") {
			const now = new Date();
			const registered = SERVER.RECENTLY_REGISTERED.get(socket.ip);

			if (registered) {
				if (now - registered.time > SERVER.settings.core.register_cooldown) {
					SERVER.RECENTLY_REGISTERED.remove(socket.ip);
				} else {
					DefaultLog.error(
						events.EVENT_REGISTER, 
						"{nick} could not register from ip {ip}", 
						logData, 
						"You are registering too many usernames, try again later."
					);

					socket.emit("loginError", { message: "You are registering too many usernames, try again later." });
				}
			} else {
				SERVER.RECENTLY_REGISTERED.set(socket.ip, now);
			}
		}

		const conditions = [
			[!data.nick, "No username inserted"],
			[!data.pass, "No password inserted"],
			[!/^[\w]+$/ig.test(data.nick), "Username must contain only letters, numbers and underscores."]
			[SERVER.nick_blacklist.has(data.nick.toLowerCase()), "Username not available."],
			[data.nick.length > 15, "Username must be under 15 characters."],
			[data.pass.length <= 5, "Password must be 6 or more characters."],
			[data.pass !== data.pass2, "Passwords do not match."],
		];

		for (const [fail, message] of conditions) {
			if (fail(data)) {
				DefaultLog.error(events.EVENT_REGISTER, "{nick} could not register from ip {ip}", logData, message);
				return socket.emit("loginError", { message });
			}
		}

		const {result} = await databaseService.query`
			select * from users where name like ${data.nick}
		`;

		//TODO: Just error that username is already in use
		if (result.length >= 1) {
			DefaultLog.error(events.EVENT_REGISTER, "{nick} could not register from ip {ip}, username already taken", logData);
			return socket.emit("loginError", { message: "Username already in use" });
		}

		bcrypt.hash(data.pass, SERVER.settings.core.bcrypt_rounds, function (err, hash) {
			if (err) {
				DefaultLog.error(events.EVENT_REGISTER, "{nick} could not register from ip {ip}", logData, err);
				DefaultLog.error(events.EVENT_GENERAL, "Failed to bcrypt for {nick}'s password", { nick: data.nick }, err);
				return;
			}

			databaseService.query`
				insert into users (name, pass, type)
				values (${data.nick}, ${hash}, ${0})
			`
				.then(() => sessionService.login(socket, data))
				.catch((err) => DefaultLog.error(events.EVENT_REGISTER, "{nick} could not register from ip {ip}", logData, err));
		});
	});
	socket.on("changePassword", function (data) {
		const nick = socket.session.nick;
		if (!nick) {
			DefaultLog.error(events.EVENT_GENERAL, "Failed to get nick from socket on ip {ip}", { ip: socket.ip });
			return;
		}

		const logData = { ip: socket.ip, nick };
		if (!data.pass || data.pass.length <= 5) {
			const err = "Invalid password. Must be at least 6 characters long.";
			DefaultLog.error(events.EVENT_USER_CHANGED_PASSWORD, "{nick} could not change password from ip {ip}", logData, err);
			socket.emit("loginError", { message: err });
			return;
		}

		bcrypt.hash(data.pass, SERVER.settings.core.bcrypt_rounds, function (err, hash) {
			if (err) {
				DefaultLog.error(events.EVENT_GENERAL, "Failed to bcrypt for {nick}'s password", { nick }, e);
				DefaultLog.error(events.EVENT_USER_CHANGED_PASSWORD, "{nick} could not change password from ip {ip}", logData, err);
				return;
			}

			databaseService.query`
				UPDATE users SET pass = ${hash} WHERE name = ${nick}
			`
				.then(() => DefaultLog.info(events.EVENT_USER_CHANGED_PASSWORD, "{nick} changed password from ip {ip}", logData))
				.then(() => socket.emit('forceRefresh'))
				.catch((err) => DefaultLog.error(events.EVENT_USER_CHANGED_PASSWORD, "{nick} could not change password from ip {ip}", logData, err))
		});
	});
	socket.on("playNext", function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			kickForIllegalActivity(socket, "You cannot skip a video");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_SKIPPED_VIDEO,
			"{mod} skipped video",
			{ mod: getSocketName(socket), type: "playlist" });

		playNext();
	});
	socket.on("sortPlaylist", async function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			kickForIllegalActivity(socket, "You cannot move videos");
			return;
		}

		const [from, to] = SERVER.PLAYLIST.multiple([data.from, data.to]);

		if (!from || !to) {
			return doorStuck(socket);
		}

		if (from.id() !== data.sanityid) {
			return doorStuck(socket);
		}

		SERVER.PLAYLIST.remove(from);

		if (data.to > data.from) {
			SERVER.PLAYLIST.insertAfter(to, from)
		} else {
			SERVER.PLAYLIST.insertBefore(to, from);
		}

		io.sockets.emit("sortPlaylist", data);

		DefaultLog.info(events.EVENT_ADMIN_MOVED_VIDEO,
			"{mod} moved {title}",
			{ mod: getSocketName(socket), title: decodeURIComponent(from.title()), type: "playlist" });

		SERVER.PLAYLIST.each((video, index) => {
			databaseService.query`
				update videos set position = ${index} where videoid = ${video.id()}
			`;
		});
	});
	socket.on("forceVideoChange", function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			kickForIllegalActivity(socket, "You cannot change the video");
			return;
		}

		/*
		PLAYLIST.setActive(data.index);
		*/

		const prev = SERVER.ACTIVE;
		const target = SERVER.PLAYLIST.at(data.index);

		if (!target || target.videoid !== data.sanityid) {
			return doorStuck(socket);
		}

		SERVER.ACTIVE.removeTag(true);
		SERVER.ACTIVE = target;
	
		DefaultLog.info(events.EVENT_ADMIN_FORCED_VIDEO_CHANGE,
			"{mod} forced video change",
			{ mod: getSocketName(socket), type: "playlist" });
	
		handleNewVideoChange();
		sendStatus("forceVideoChange", io.sockets);

		if (prev.volatile()) {
			delVideo(prev, data.index, null, socket);
		} 
	});
	socket.on("delVideo", function (data) {
		if (!authService.can(socket.session, actions.ACTION_DELETE_VIDEO)) {
			kickForIllegalActivity(socket, "You cannot delete videos.");
			return;
		}

		const video = SERVER.PLAYLIST.at(data.index);

		if (!video || video.id() !== data.sanityid) {
			return doorStuck(socket);
		}

		//switch before actually deleting the correct video
		if (video === SERVER.ACTIVE) {
			SERVER.ACTIVE = SERVER.ACTIVE.next;

			handleNewVideoChange();
			sendStatus("forceVideoChange", io.sockets);
		}
		
		delVideo(video, data.index, data.sanityid, socket);
	});
	socket.on("addVideo", async function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_PLAYLIST)) {
			kickForIllegalActivity(socket, "You cannot add a video");
			return;
		}


		
		const links = {
			socket,
			playlist: SERVER.PLAYLIST,
			active: SERVER.ACTIVE,
			...serviceLocator,
		};

		if (!VideoHandlers.has(data.videotype)) {
			DefaultLog.error(
				events.EVENT_ADMIN_ADDED_VIDEO,
				"no handler for {source}",
				{source: data.videotype},
			);

			socket.emit("dupeAdd");
			return;
		}

		VideoHandlers.get(data.videotype).handle(links, data).then(async (video) => {
			DefaultLog.info(
				events.EVENT_ADMIN_ADDED_VIDEO,
				"{mod} added {provider} video {title}",
				{mod: getSocketName(socket), provider: video.source(), title: video.title()}
			);
		}).catch((err) => {
			DefaultLog.error(
				events.EVENT_ADMIN_ADDED_VIDEO,
				"could not add {source} video: err: {msg}",
				{source: data.videotype, msg: err.message},
			);

			socket.emit("dupeAdd");
		});
	});
	socket.on("importPlaylist", function (data) {
		// old implementation can be found in source control
		return false;
	});
	socket.on("forceStateChange", function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_VIDEO)) {
			kickForIllegalActivity(socket, "You cannot manually set videostate");
			return;
		}

		SERVER.STATE = data.state;
		sendStatus("hbVideoDetail", io.sockets);
	});
	socket.on("videoSeek", function (data) {
		if (!authService.can(socket.session, actions.ACTION_CONTROL_VIDEO)) {
			kickForIllegalActivity(socket, "You cannot manually seek video");
			return;
		}

		SERVER.TIME = data;
		sendStatus("hbVideoDetail", io.sockets);
	});
	socket.on("moveLeader", function (data) {
		data = data || "Server";

		if (data === "Server") {
			if (!authService.can(socket.session, actions.ACTION_RELINQUISH_BERRY)) {
				kickForIllegalActivity(socket, "You cannot relinquish berry");
				return;
			}

			DefaultLog.info(events.EVENT_ADMIN_SET_BERRY,
				"{user} relinquished berry",
				{ user: getSocketName(socket), type: "playlist" });

			sessionService.removeBerry(socket.session);
			return;
		}

		if (!authService.can(socket.session, actions.ACTION_MOVE_BERRY_TO_USER)) {
			kickForIllegalActivity(socket, "You cannot move berry");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_SET_BERRY,
			"{mod} moved berry to {nick}",
			{ mod: getSocketName(socket), type: "playlist", nick: data });

		sessionService.forNick(data, session => sessionService.replaceBerry(session));
	});
	socket.on("addLeader", function (data) {
		if (!authService.can(socket.session, actions.ACTION_MOVE_BERRY_TO_USER)) {
			kickForIllegalActivity(socket, "You cannot add a berry");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_ADD_BERRY,
			"{mod} gave a berry to {nick}",
			{ mod: getSocketName(socket), type: "playlist", nick: data });

		sessionService.forNick(data, session => sessionService.addBerry(session));
	});
	socket.on("removeLeader", function (data) {
		if (data === socket.session.nick) {
			if (!authService.can(socket.session, actions.ACTION_RELINQUISH_BERRY)) {
				kickForIllegalActivity(socket, "You cannot relinquish berry");
				return;
			}

			DefaultLog.info(events.EVENT_ADMIN_SET_BERRY,
				"{user} relinquished berry",
				{ user: getSocketName(socket), type: "playlist" });

			sessionService.removeBerry(socket.session);
			return;
		}

		if (!authService.can(socket.session, actions.ACTION_MOVE_BERRY_TO_USER)) {
			kickForIllegalActivity(socket, "You cannot remove a berry");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_ADD_BERRY,
			"{mod} removed berry from {nick}",
			{ mod: getSocketName(socket), type: "playlist", nick: data });

		sessionService.forNick(data, session => sessionService.removeBerry(session));
	});
	socket.on("kickUser", function (data) {
		if (!authService.can(socket.session, actions.ACTION_KICK_USER)) {
			kickForIllegalActivity(socket, "You cannot kick user");
			return;
		}

		kickUserByNick(socket, data.nick, data.reason);
	});
	socket.on("shadowBan", function (data) {
		if (!authService.can(socket.session, actions.ACTION_SHADOWBAN)) {
			kickForIllegalActivity(socket, "You cannot shadowban");
			return;
		}

		const getFilledMessage = (banning, temp) => {

		}

		const message2 = `/me ${getFilledMessage(data.sban, data.temp)} ${data.nick} ${banEmotes[Math.floor(Math.random() * banEmotes.length)]}`

		var targetNick = data.nick;
		var isbanning = data.sban;
		var temp = data.temp;
		var message = "";
		if (isbanning) {
			message = temp
				? `Temporarily shadow banned ${targetNick}`
				: `Shadow banned ${targetNick}`;

			DefaultLog.info(temp ? events.EVENT_ADMIN_SHADOWBAN_TEMP : events.EVENT_ADMIN_SHADOWBAN_PERMANENT,
				"{mod} shadow banned user {nick}",
				{ mod: getSocketName(socket), nick: targetNick, type: "site" });
		}
		else {
			message = `Un-shadow banned ${targetNick}`;

			DefaultLog.info(events.EVENT_ADMIN_SHADOWBAN_FORGIVEN,
				"{mod} un-shadow banned {nick}",
				{ mod: getSocketName(socket), nick: targetNick, type: "site" });
		}

		if (isbanning) {
			message = banEmotes[Math.floor(Math.random() * banEmotes.length)] + ' ' + message;
		}

		message = '/me ' + message;
		_sendChat(socket.session.nick, 3, { msg: message, metadata: { channel: 'admin' } }, socket);


		sessionService.setShadowbanForNick(targetNick, isbanning, temp);

		const shadowbant = Object.values(sessionService.ipAddresses)
			.reduce((acc, entry) => {
				if (!entry.isShadowbanned) {
					return acc;
				}

				acc.push({
					ip: entry.ip,
					temp: this.isTempShadowban
				});

				return acc;
			}, []);

		upsertMisc({ name: 'shadowbant_ips', value: JSON.stringify(shadowbant) });
	});
	socket.on("setAreas", function (data) {
		if (!authService.can(socket.session, actions.ACTION_SET_AREAS)) {
			kickForIllegalActivity(socket, "You cannot set an area");
			return;
		}

		DefaultLog.info(events.EVENT_ADMIN_EDITED_AREA,
			"{mod} edited {area}",
			{ mod: getSocketName(socket), type: "site", area: data.areaname });

		setAreas(data.areaname, data.content);
	});
	socket.on("fondleVideo", function (data) {
		const video = SERVER.PLAYLIST.at(data.info.pos);

		if (data.sanityid && video.id() !== data.sanityid) { 
			return doorStuck(socket); 
		}

		if (!authService.can(socket.session, actions.ACTION_SET_VIDEO_VOLATILE)) {
			kickForIllegalActivity(socket, "You cannot fondle video");
			return;
		}

		const action = data.action;
		const mappings = new Map([
			['setColorTag', 'setVidColorTag'],
			['setVolatile', 'setVidVolatile'],
		]);

		data = data.info;

		switch (action) {
			case "setVolatile": setVideoVolatile(socket, video, data.volat); break;
			case "setColorTag": setVideoColorTag(socket, video, data.pos, data.tag, data.volat); break;
			default: 
				return;
		}

		io.sockets.emit(mappings.get(action), data);
	});
	socket.on("fondleUser", function (data) {
		if (!"action" in data) {
			return;
		}

		if (!/^[\w]+$/.test(data.info.nick)) {
			return;
		}

		switch (data.action) {
			case "setUserNote": setUserNote(data.info);
			default: 
				break;
		}
	});

	socket.on("getBanlist", function (data) {
		if (!authService.can(socket.session, actions.ACTION_BAN)) {
			kickForIllegalActivity(socket, "You cannot get banlist");
			return;
		}

		sendBanlist(socket);
	});
	socket.on("ban", function (data) {
		if (!authService.can(socket.session, actions.ACTION_BAN)) {
			kickForIllegalActivity(socket, "You cannot ban users");
			return;
		}

		banUser(data, getSocketName(socket));
	});
	socket.on("forceRefreshAll", function (data) {
		if (!authService.can(socket.session, actions.ACTION_FORCE_REFRESH)) {
			kickForIllegalActivity(socket, "You cannot force refresh people");
			return;
		}

		io.sockets.emit('forceRefresh', {
			...(data || {}),
			delay: true
		});
	});
	socket.on("crash", function (data) {
		//socket.emit(socket);
	});
	socket.on("error", function (err) {
		DefaultLog.error(
			events.EVENT_SOCKET,
			"caught error on socket with ip {ip} and name {nick}",
			{ ip: socket.ip, nick: getSocketName(socket) });
	});
});

function formatDrinkMessage(drinks) {
	if (isDrinkAmountExcessive(drinks)) {
		return "lol go fuck yourself";
	}

	if (Number.isInteger(drinks)) {
		return drinks;
	}

	return drinks.toFixed(2);
}

function isDrinkAmountExcessive(drinks) {
	return Math.abs(drinks) > 1000000;
}

function withAliases(keys, value) {
	const obj = {}
	for (const key of keys) {
		obj[key] = value;
	}

	return obj;
}

function assert_eq(a, b, message) {
	if (typeof a === 'object') {
		[a, b] = [JSON.stringify(a), JSON.stringify(b)];
	}

	if (a !== b) {
		throw message || "No assert message"
	}
}
function comparePlaylists() {
	const old = SERVER.PLAYLIST.toArray();
	const now = playlistService.playlist.videos();

	assert_eq(old.length, now.length, "Lengths don't match");
	assert_eq(SERVER.ACTIVE.videoid, playlistService.current().id(), `ACTIVE no match: ${SERVER.ACTIVE.videoid} !== ${playlistService.current().id()}`);

	//log the attempt
	for (let i = 0; i < old.length; i += 1) {
		let a = old[i];
		let b = now[i];

		assert_eq(a.videoid, b.id(), `ID's don't match ${a.videoid} ${b.id()}`);
		assert_eq(a.videolength, b.duration(), `Lengths don't match`);
		assert_eq(a.videotitle, b.title(), `Titles don't match: ${a.videotitle} ${b.title()}`);
		assert_eq(a.videotype, b.source(), 'Video sources do not match');
		assert_eq(a.meta, b.metadata(), `Metadata no match: ${JSON.stringify(a.meta)} !== ${JSON.stringify(b.metadata())}`);
		assert_eq(a.volat, b.volatile(), `Volatililty no match: ${a.volat} !== ${b.volatile()}`);
	}
}

/* vim: set noexpandtab : */
