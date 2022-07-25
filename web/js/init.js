'what up';

const autoCloseTimes = [
	[0, "Don't Close Automatically"],
	[30, "Close in 30 seconds"],
	[60, "Close in 1 minute"],
	[60 * 2, "Close in 2 minutes"],
	[60 * 5, "Close in 5 minutes"],
	[60 * 10, "Close in 10 minutes"]
];

var DEBUG = false;
if (typeof localStorage != "undefined") {
	DEBUG = localStorage.getItem('BT_DEBUG') === "true";
}
function dbg(...things) { if (DEBUG) { console.debug(...things); } }
function setDebugMode(mode) {
	DEBUG = !!mode;
	localStorage.setItem("BT_DEBUG", mode ? "true" : "false");
}

// VIDEO OBJECT
function Video() { }
Video.prototype = {
	videoid: null,
	videolength: null,
	videotitle: null,
	videotype: null,
	volat: false,
	meta: null,
	next: null,
	previous: null
};
Video.prototype.pack = function () {
	return {
		videoid: this.videoid,
		videolength: this.videolength,
		videotitle: this.videotitle,
		videotype: this.videotype,
		volat: this.volat,
		meta: this.meta
	};
};

// CREATE THE LINKED LIST DATATYPE
function LinkedList() { }
LinkedList.prototype = {
	length: 0,
	first: null,
	last: null
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
		//console.log(elem);
		out.push(elem.pack());
		elem = elem.next;
	}
	dbg(out);
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

var btEvents = (function () {

	var self = {};
	var hooks = {};

	self.on = function (evt, fn, once) {
		once = !!once || false;
		hooks[evt] = hooks[evt] || [];
		hooks[evt].push({ fn: fn, once: once });
	};

	self.once = function (evt, fn) {
		return self.on(evt, fn, true);
	};

	self.emit = function (evt, data) {
		hooks[evt] = hooks[evt] || [];
		for (var i = hooks[evt].length - 1; i >= 0; i -= 1) {
			var hook = hooks[evt][i];
			if (hook.fn) { hook.fn(data); }
			if (hook.once === true) {
				hooks[evt].splice(i, 1);
			}
		}
	};

	Object.freeze(self);

	return self;

})();

var PLAYER = false;
var LEADER = false;
var NAME = false;
var TYPE = -1;
var CHATLIST = new Map();
var TOGGLEABLES = {};
var IGNORELIST = [];
var CONNECTED = 0;
var PLAYLIST = new LinkedList.Circular();
var ACTIVE = new Video();
var HISTORY = [];
var FLAIR_OPTS = [];
var HISTORY_POS = 0;
var HISTORY_SIZE = 50;
var CHAT_NOTIFY = false;
var VIDEO_TYPE = false;
var MY_FLAIR_ID = 0;
var DRINKS = 0;
var NOTIFY_TITLE = "Chat!";
var MONITORED_VIDEO = null;
var KEEP_BUFFER = true;
var RCV_HOLDTIME = 1000 * 30;
var FILTERS = false;
var BANLIST = false;
var PLUGINS = [];
var NAMEFLAUNT = false;
var VOLUME = false;

//the only thing this does is prevent maltweaks from breaking \\fsnotmad
//Note: Deprecated and legacy, use Players instead 
var PLAYERS = {};

var IGNORE_GHOST_MESSAGES = false;
var ADMIN_LOG = [];
var HIGHLIGHT_LIST = [];
var ACTIVE_CHAT = 'main';
var MAIN_NOTIFY = false;
var ADMIN_NOTIFY = false;
var LAST_QUEUE_ATTEMPT = null;
var POLL_TITLE_FORMAT = '';
var POLL_OPTIONS = [];

var HIGHLIGHT_LIST = (localStorage.getItem('highlightList') || '').split(';').filter(n => n.length > 0);

var flags = new Map();
//const CHATLIST = new Map();
const gridColors = [
	"#xxxxxx",
	"#AC725E",
	"#D06B64",
	"#F83A22",
	"#FA573C",
	"#FF7537",
	"#FFAD46",
	"#42D692",
	"#16A765",
	"#7BD148",
	"#B3DC6C",
	"#FBE983",
	"#FAD165",
	"#92E1C0",
	"#9FE1E7",
	"#9FC6E7",
	"#4986E7",
	"#9A9CFF",
	"#B99AFF",
	"#CABDBF",
	"#CCA6AC",
	"#F691B2",
	"#CD74E6",
	"#A47AE2"
];

const settings = [
	//key, kind, title, cb
	['', '', '', () => {}]
];

try {
	const stored = localStorage.getItem('ignoreList');
	if (stored) {
		IGNORELIST = JSON.parse(stored);
	} else {
		localStorage.setItem('ignoreList', JSON.stringify([]));
	}
} catch (e) {
	console.log('invalid stored ignoreList', e);
}

try {
	window.socket = io.connect(SOCKET_ORIGIN, {
		'connect timeout': 4500 + Math.random() * 1000,
		'reconnect': true,
		'reconnection delay': 500 + Math.random() * 1000,
		'reopen delay': 500 + Math.random() * 1000,
		'max reconnection attempts': 10,
        'transports': ['websocket']
	});

	window.socket.on('error', function (reason) {
		if (reason == "handshake error") {
			window.location = "ban.php";
		} else {
			$(function () {
				$("<center><h1>Unable to connect Socket.IO: " + reason + "</h1></center>").prependTo(document.body);
			});
			console.error(reason);
		}
	});
} catch (e) {
	$(function () {
		$("<center><h3>" + e + "</h3></center>").prependTo(document.body);
		$("<center><h1>Aw shit! Couldn't connect to the server!</h1></center>").prependTo(document.body);
	});
	console.error(e);
}

function doDelete(entry) {
	if (!canDeleteVideo()) {
		return;
	}

	console.warn(
		entry
	)

	const data = { 
		index: entry.index(), 
		sanityid: entry[0].video.videoid 
	};

	dbg("delVideo", data);
	socket.emit("delVideo", data);
}

function doRequeue(entry) {
	if (!controlsPlaylist() || getVal("sorting")) {
		return;
	}

	setVal("sorting", true);

	var from = entry.index();
	var to = ACTIVE.domobj.index();

	if (from > to) { to++; }

	socket.emit("sortPlaylist", {
		from,
		to,
		sanityid: entry[0].video.videoid
	});

	setVal("sorting", false);
}

function doVolatile(entry) {
	if (!canToggleVolatile()) {
		return;
	}

	const volat = !entry[0].classList.contains('volatile');
	const data = {
		action: "setVolatile",
		info: {
			pos: entry.index(),
			volat
		},
		sanityid: entry[0].video.videoid
	};
	dbg(data);
	socket.emit("fondleVideo", data);
}
function doColorTag(entry, tag, volat) {
	if (!canColorTag()) {
		return;
	}

	var pos = $(entry).index();
	var id = entry[0].video.videoid;
	var data = {
		action: "setColorTag",
		info: {
			pos: pos,
			tag: tag,
			volat: volat
		},
		sanityid: id
	};
	dbg(data);
	socket.emit("fondleVideo", data);

}

function sortUserList() {
	whenExists("#chatlist ul", (list) => {
		const groups = [
			'.admin',
			'.assistant',
			'.user.leader',
			'.user:not(.leader)',
			'.anon',
			'.nobody'
		];

		const grouped = groups.map((selector) => {
			const users = Array.from(list[0].querySelectorAll(`${selector}:not(.me)`));
			
			return users.sort((a, b) => {
				//get uppercase nicks of users being compared
				const nicks = [a, b].map(user => user.getAttribute('nick').toUpperCase());
				
				return nicks[0].localeCompare(nicks[1]);
			});
		});
		
		list[0].append(
			...grouped.flat()
		);
	});
}

function showLogMenu() {
	const win = $("body").dialogWindow({
		title: "Berrytube Log",
		uid: "logmenu",
		center: true
	});

	const filters = {
		nick: ['All modmins', 'Berry', 'Server'],
		type: ['All types', 'site', 'user', 'playlist']
	};

	/*
	const fieldset = createElement('fieldset', {id: 'logFilters'},
		createElement('legend', {text: 'Search Filters'}),
		createElement('select', {id: 'logNickFilter'},
			...filters.nick.map((kind) => createEelement('option', {text: kind}))
		),
		createElement('select', {id: 'logTypeFilter'},
			...filters.type.map((kind) => createElement('option', {text: kind}))
		)
	);

	win[0].append(
		fieldset
	);
	*/

	win.append(
		$('<fieldset>', {id: 'logFilters'}).append(
			$('<legend>', {text: 'Search Filters'}),
			$('<select>', {id: 'logNickFilter'}).append(
				...filters.nick.map((kind) => $('<option>', {text: kind}))
			),
			$('<select>', {id: 'logTypeFilter'}).append(
				...filters.type.map((kind) => $('<option>', {text: kind}))
			)
		)
	);
	
	win.on('change', 'select', function() {
		filterAdminLog();
	});

	const columns = ['time', 'modmin', 'event', 'message', 'type']
	const table = $('<table>').append(
		$('<thead>').append(
			$('<tr>').append(
				...columns.map(header => 
					$('<th>', {text: header})
				),
			)
		),
		$('<tbody>')
	);

	const buffer = $('<div>', {id: 'logBuffer'}).append(
		table
	);

	win.append(
		buffer
	);

	//add the messages in the buffer
	ADMIN_LOG.forEach(log => addLogMsg(log, buffer, false));

	win.resizable({ handles: 'e' });
	win.css('min-width', '400px');
	win.window.center();
}

function showConfigMenu(on) {

	/*
	if($("#settingsGui").length > 0){
		$("#settingsGui").hide("blind",function(){
			$(this).remove();
		})
		return;
	}
	const settings = [
		[]
	];
	*/
	// Position this beast.
	var settWin = $("body").dialogWindow({
		title: "BerryTube Settings",
		uid: "configmenu",
		center: true,
		scrollable: true
	});

	var cmds = $("<div/>").attr('id', 'settingsGui').prependTo(settWin);
	var optWrap = $("<ul/>").prependTo(cmds);

	var configOps = $('<fieldset/>').appendTo($('<li/>').appendTo(optWrap));
	$('<legend/>').appendTo(configOps).text("User Options");
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Sync video:").appendTo(row);
	var syncOnOff = $('<input/>').attr('type', 'checkbox').prop('checked', getStorageToggle('syncAtAll')).appendTo(row);
	
	syncOnOff.change(function () { //
		setStorage('syncAtAll', this.checked)
	});

	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Sync within").appendTo(row);
	var syncAccuracy = $('<input/>').attr('type', 'text').val(getStorage('syncAccuracy')).addClass("small").appendTo(row);
	syncAccuracy.keyup(function () { //
		setStorage('syncAccuracy', parseInt(syncAccuracy.val()));
	});
	$('<span/>').text("seconds.").appendTo(row);
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Enable notify sound:").appendTo(row);
	var notifyMute = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage('notifyMute') == 0) { notifyMute.prop('checked', true); }
	notifyMute.change(function () { //
		setStorage('notifyMute', this.checked | 0);
	});
	//----------------------------------------
	$("<div />")
		.appendTo(configOps)
		.append($("<span />").text("Store all squees in inbox:"))
		.append($("<input />").attr("type", "checkbox")
			.prop("checked", getStorageToggle("storeAllSquees"))
			.change(function () {
				setStorageToggle("storeAllSquees", $(this).is(":checked"));
			}));
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Enable drink sound:").appendTo(row);
	var notifyDrink = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("drinkNotify") == 1) { notifyDrink.prop('checked', true); }
	notifyDrink.change(function () { //
		setStorage('drinkNotify', this.checked | 0);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Use alternate video player:").appendTo(row);
	var useLegacyPlayer = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("legacyPlayer") == 1) { useLegacyPlayer.prop('checked', true); }
	useLegacyPlayer.change(function () { //
		setStorage('legacyPlayer', this.checked | 0);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Show timestamps in chat:").appendTo(row);
	var showChatTimestamps = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("showTimestamps") == 1) { showChatTimestamps.prop('checked', true); }
	showChatTimestamps.change(function () { //
		document.body.classList.toggle('showTimestamps', !this.checked);
		setStorage('showTimestamps', this.checked | 0);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Show flair in chat:").appendTo(row);
	var showChatFlair = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("showChatflair") == 1) { showChatFlair.prop('checked', true); }
	showChatFlair.change(function () {
		document.body.classList.toggle('hideChatFlair', !this.checked);
		setStorage('showChatflair', this.checked | 0);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Playlist follows active video:").appendTo(row);
	var plFolAcVid = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("plFolAcVid") == 1) { plFolAcVid.prop('checked', true); }
	plFolAcVid.change(function () { //
		setStorage('plFolAcVid', this.checked | 0);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Keep").appendTo(row);
	var keepPolls = $('<input/>').attr('type', 'text').val(getStorage("keeppolls")).addClass("small").appendTo(row);
	keepPolls.keyup(function () { //
		setStorage('keeppolls', parseInt(keepPolls.val()));
	});
	$('<span/>').text("old polls.").appendTo(row);
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Select theme:").appendTo(row);
	var themeSelect = $('<select/>').appendTo(row);

	var themes = [];
	var found = false;
	themes.push({ name: "Berry Punch", path: "" });
	themes.push({ name: "Luna", path: "css/colors-woona.css" });
	themes.push({ name: "Appleoosa", path: "css/colors-appleoosans.css" });
	themes.push({ name: "Holiday", path: "css/colors-holiday.css" });
	for (var i = 0; i < themes.length; i++) {
		var opt = $("<option/>").appendTo(themeSelect).data("css", themes[i].path).text(themes[i].name);
		if (themes[i].path == getStorage("siteThemePath")) {
			opt.prop('selected', true);
			found = true;
		}
	}
	if (!found && typeof getStorage("siteThemePath") != "undefined") {
		$("<option/>").appendTo(themeSelect).data("css", getStorage("siteThemePath")).text("3rd Party Theme").prop('selected', true);
	}
	themeSelect.change(function () {
		var cssPath = themeSelect.find(":selected").data("css");
		setColorTheme(cssPath);
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	$('<span/>').text("Night mode (for select themes):").appendTo(row);
	var nightMode = $('<input/>').attr('type', 'checkbox').appendTo(row);
	if (getStorage("nightMode") != 0) { nightMode.prop('checked', true); }
	nightMode.change(function () { //
		if ($(this).is(":checked")) {
			setStorage('nightMode', 1);
			$('body').addClass('night');
		} else {
			setStorage('nightMode', 0);
			$('body').removeClass('night');
		}
	});
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	var showSqueesBtn = $('<div/>').appendTo(row).addClass('button');
	var showSqueesBtn_label = $('<span/>').appendTo(showSqueesBtn).text("Manage custom squees");
	showSqueesBtn.click(showCustomSqueesWindow);
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	var showSqueesBtn = $('<div/>').appendTo(row).addClass('button');
	var showSqueesBtn_label = $('<span/>').appendTo(showSqueesBtn).text("Manage 3rd-party plugins");
	showSqueesBtn.click(showPluginWindow);
	//----------------------------------------
	var row = $('<div/>').appendTo(configOps);
	var showIgnoreDialogBtn = $('<div/>').appendTo(row).addClass('button');
	var showIgnoreDialogBtn_label = $('<span/>').appendTo(showIgnoreDialogBtn).text("Manage ignored users");
	showIgnoreDialogBtn.click(showIgnoreDialog);
	if (TYPE >= 1) {
		var modOps = $('<fieldset/>').appendTo($('<li/>').appendTo(optWrap));
		$('<legend/>').appendTo(modOps).text("+Options").addClass("mod");

		// Show Hidden
		var row = $('<div/>').appendTo(modOps);
		$('<span/>').text("Show Shadowban Chatter:").appendTo(row);
		var showShadowChatter = $('<input/>').attr('type', 'checkbox').appendTo(row);
		if (getStorage("sbchatter") == 1) { showShadowChatter.prop('checked', true); }
		showShadowChatter.change(function () { //
			setStorage('sbchatter', this.checked | 0);
			document.body.classList.toggle('showSBChatter', !this.checked);
		});

		

		if (TYPE >= 2) {
			for (const [key, value] of Object.entries(TOGGLEABLES)) {

			}

			for (var i in TOGGLEABLES) {
				(function (i) {
					var row = $('<div/>').appendTo(modOps);
					$('<span/>').text("Toggle: " + TOGGLEABLES[i].label).appendTo(row);
					var flutterYays = $('<input/>').attr('type', 'checkbox').addClass('tgl-' + i).appendTo(row);
					if (TOGGLEABLES[i].state) {
						flutterYays.prop('checked', true);
					}
					flutterYays.click(function (event) {
						event.stopPropagation();
						socket.emit('setToggleable', {name: i, state: this.checked});
						return false;
					});
				})(i);
			}

			// Filter window
			var row = $('<div/>').appendTo(modOps);
			var showFilterBtn = $('<div/>').appendTo(row).addClass('button');
			var showFilterBtn_label = $('<span/>').appendTo(showFilterBtn).text("Show Filter Menu");
			showFilterBtn.click(function () {
				showAdminFilterWindow();
			});

			// Ban list
			var row = $('<div/>').appendTo(modOps);
			var showBanlistBtn = $('<div/>').appendTo(row).addClass('button');
			var showBanlistBtn_label = $('<span/>').appendTo(showBanlistBtn).text("Show Ban List");
			showBanlistBtn.click(function () {
				showBanlistWindow();
			});

		}
	}
	//----------------------------------------
	if (TYPE >= 2) {
		var adminOps = $('<fieldset/>').appendTo($('<li/>').appendTo(optWrap));
		$('<legend/>').appendTo(adminOps).text("Admin Options").addClass("admin");

		// Filter window
		var row = $('<div/>').appendTo(adminOps);
		var showCssBtn = $('<div/>').appendTo(row).addClass('button');
		var showCssBtn_label = $('<span/>').appendTo(showCssBtn).text("Show CSS Menu");
		showCssBtn.click(function () {
			showCssOverrideWindow();
		});

	}

	settWin.window.center();
}
function isMe(name) {
	return name === NAME;
}
function isIgnored(name) {
	return IGNORELIST.includes(name);
}

function showUserActions(who) {

	var who = $(who);
	var target = who[0].getAttribute('nick');

	// Position this beast.
	var cmds = $("body").dialogWindow({
		title: "User Menu",
		uid: "usermenu",
		offset: who.offset(),
		toolBox: true
	});

	var name = $('<h1/>').text(target).appendTo(cmds);
	var optWrap = $("<ul/>").attr('id', 'userOps').appendTo(cmds);

	/*
	const options = [
		{on: canMoveBerry, op: setBerry, text: ''},
		{on: canMoveBerry, op: removeBerry, text: ''},
		{on: canKickUser, op: removeBerry, text: ''},
		{on: }
	]

	for (const opt of options) {
		if (opt.can()) {
			const elem = createElement('li', {text: opt.text, class: 'btn'});
			
			optWrap[0].append(elem);

			elem.addEventListener('click', opt.listener);
		}
	}
	*/

	if (canMoveBerry()) {
		var option = $('<li/>').text("Add berry").addClass('btn').appendTo(optWrap);
		option.click(function () {
			socket.emit("addLeader", target);
			cmds.window.close();
		});
	}
	if (canMoveBerry() || (LEADER && target == NAME)) {
		var option = $('<li/>').text("Remove berry").addClass('btn').appendTo(optWrap);
		option.click(function () {
			socket.emit("removeLeader", target);
			cmds.window.close();
		});
	}
	if (canKickUser() && target != NAME) {
		var option = $('<li/>').text("Kick user").addClass('btn').appendTo(optWrap);
		option.click(function () {
			socket.emit("kickUser", { nick: target });
			cmds.window.close();
		});
	}
	if (IGNORELIST.indexOf(target) == -1 && target != NAME) {
		var option = $('<li/>').text("Ignore user").addClass('btn').appendTo(optWrap);
		option.click(function () {
			IGNORELIST.push(target);
			localStorage.setItem('ignoreList', JSON.stringify(IGNORELIST));
			who.addClass('ignored');
			cmds.window.close();
		});
	}
	if (IGNORELIST.indexOf(target) != -1 && target != NAME) {
		var option = $('<li/>').text("Unignore user").addClass('btn').appendTo(optWrap);
		option.click(function () {
			IGNORELIST.splice(IGNORELIST.indexOf(target), 1);
			localStorage.setItem('ignoreList', JSON.stringify(IGNORELIST));
			who.removeClass('ignored');
			cmds.window.close();
		});
	}

	if (canShadowBan() && target != NAME) {
		var ban = $('<li/>').text("Shadowban").addClass('btn').appendTo(optWrap);
		ban.click(function () {
			socket.emit("shadowBan", { nick: target, sban: true, temp: false });
			cmds.window.close();
		});
	}

	if (canTempShadowBan() && target != NAME) {
		var tban = $('<li/>').text("Temp shadowban").addClass('btn').appendTo(optWrap);
		var uban = $('<li/>').text("Unshadowban").addClass('btn').appendTo(optWrap);
		tban.click(function () {
			socket.emit("shadowBan", { nick: target, sban: true, temp: true });
			cmds.window.close();
		});
		uban.click(function () {
			socket.emit("shadowBan", { nick: target, sban: false, temp: false });
			cmds.window.close();
		});
	}

	if (canBan() && target != NAME) {
		var ban = $('<li/>').text("Ban").addClass('btn').appendTo(optWrap);
		ban.click(function () {
			showBanDialog(target);
			cmds.window.close();
		});
	}

	if (TYPE >= 1 && target != NAME && !who.hasClass('anon')) {
		var edit = $('<li/>').text("Edit note").addClass('btn').appendTo(optWrap);
		edit.click(function () {
			showEditNote(target);
			cmds.window.close();
		});
	}

	var aliases = who.data('aliases');
	if (aliases !== undefined) {
		$('<h2/>').text('Recent Aliases').appendTo(cmds);
		var aliasList = $('<ul id="userAliases"/>').appendTo(cmds);
		for (var i in aliases) {
			$('<li/>').text(aliases[i]).appendTo(aliasList);
		}
	}
}
function showEditNote(nick) {
	var parent = $("body").dialogWindow({
		title: "Edit Note",
		uid: "editnote",
		center: true
	});



	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	$('<p>').appendTo(mainOptWrap).text("Editing note for " + nick + ":").css("width", "300px");
	var input = $('<textarea>').appendTo(mainOptWrap).css("width", "300px").attr('rows', 20).val($(`#chatlist li[nick="${nick}"]`).data('note'));
	var buttonDiv = $('<div/>').css("text-align", "center").appendTo(mainOptWrap);
	var cancelBtn = $('<div/>').addClass('button').appendTo(buttonDiv);
	$('<span/>').appendTo(cancelBtn).text("Cancel");
	cancelBtn.click(function () {
		parent.window.close();
	});
	var saveBtn = $('<div/>').addClass('button').appendTo(buttonDiv);
	$('<span/>').appendTo(saveBtn).text("Save");
	saveBtn.click(function () {
		socket.emit('fondleUser', {
			action: 'setUserNote',
			info: {
				nick: nick,
				note: input.val()
			}
		});
		parent.window.close();
	});

	parent.window.center();
}
function addUser(data, sortafter, animate = false) {
	if (CHATLIST.has(data.nick)) {
		return;
	}

	const typeMappings = new Map([
		[-1, "anon"],
		[0, "user"],
		[1, "assistant"],
		[2, "admin"]
	]);

	whenExists('#chatlist ul', function (chatul) {
		const user = createElement(
			'li', {nick: data.nick}, 
			createElement('span', {class: 'chatlistname', text: data.nick})
		);
		
		chatul[0].append(
			user
		);

		if (animate) {
			$(user).show('blind')
		}

		user.classList.toggle('me', data.nick === NAME);
		user.classList.toggle('ignored', IGNORELIST.includes(data.nick));
		user.classList.toggle('sbanned', data.shadowbanned)

		user.classList.add(typeMappings.get(data.type));

		if (data.type !== -2) {
			CHATLIST.set(data.nick, {
				lastMessage: 0,
				type: typeMappings.get(data.type)
			});

			user.onclick = () => showUserActions($(user));
			user.oncontextmenu = () => {
				showUserActions($(user));
				return false;
			};
		}

		if (data.meta) {
			user.setAttribute('ip', data.meta.ip);
			updateUserAliases(data.meta.ip, data.meta.aliases);
			updateUserNote(data.nick, data.meta.note);
		}

		if (sortafter) {
			sortUserList();
		}
	});
}
function updateUserAliases(ip, aliases) {
	$('#chatlist li[ip="' + ip + '"]').data('aliases', aliases);
}
function updateUserNote(nick, note) {
	if (note === undefined) {
		note = '';
	}
	var elem = $(`#chatlist li[nick="${nick}"]`);
	elem.data('note', note).attr('title', note);
	if (note.length > 0) {
		elem.addClass('note');
	}
	else {
		elem.removeClass('note');
	}
}

function rmUser(nick) {
	document.querySelector(`#chatlist ul li[nick="${nick}"]`)?.remove();
	CHATLIST.delete(nick);
}

function createColorGrid(entry, volatile) {
	const colorGrid = createElement('div', {class: 'colorGrid'});

	for (const color of gridColors) {
		const pixel = createElement('div', {class: 'swatch'});
		const clear = color === '#xxxxxx';

		if (clear) {
			pixel.classList.add('kill')
		}

		if (volatile) {
			pixel.classList.add('volatile')
		}

		pixel.style.backgroundColor = color
		pixel.onclick = () => doColorTag(entry, clear ? false : color, false)
		
		colorGrid.append(
			pixel
		)
	}

	return colorGrid
}
function skipVideo(video) {
	//check if we are at ACTIVE
	if (video !== ACTIVE) {
		return;
	}

	socket.emit("playNext");
}
function toggleEndNotification(video) {
	if (video !== ACTIVE) {
		return;
	}

	video.domobj[0].classList.toggle('notify', MONITORED_VIDEO === null)
	MONITORED_VIDEO = MONITORED_VIDEO ? null : video;
}

function isActive(video) {
	return video === ACTIVE;
}

function openVideoSource(video) {
	let source = '';

	switch (video.videotype) {
		case 'yt': source = `https://youtu.be/${video.videoid}`; break;
		case 'vimeo': source = `https://youtu.be/${video.videoid}`; break;
		case 'dm': source = `https://youtu.be/${video.videoid}`; break;
		case 'soundcloud': source = video.meta.permalink; break;
		default:
			break;
	}

	window.open(source, '_blank');
}

function addVideoControls(entry, optionList) {
	const video = entry[0].video;
	const options = [
		{text: 'Toggle volatile', fn: doVolatile},
		{text: 'Jump to video', fn: doPlaylistJump},
		{on: isActive, text: 'Skip video', fn: skipVideo},
		{text: 'Open at source', fn: openVideoSource},
		{on: isActive, text: 'Toggle video end notification', fn: toggleEndNotification}
	];

	for (const option of options) {
		if (option.on && !option.on(video)) {
			continue;
		}

		const button = createElement('div', {class: 'button', text: option.text});

		button.addEventListener('click', () => option.fn(video));

		optionList[0].append(
			createElement('li', {}, 
				button
			)
		)
	}

	// Color Tags
	if (canColorTag()) {
		optionList[0].append(
			createElement('li', {},
				createElement('hr')
			),
			createElement('li', {},
				createColorGrid(entry[0], true),
				createColorGrid(entry[0], false)
			)
		)
	}
}

function moveToRCV(overlay, node, time) {
	dbg("returning in " + (RCV_HOLDTIME - time));

	overlay.append(
		node
	);

	const timeout = createElement('div', {class: 'rmTimer'});

	//node.show('blind');
	node.style.display = 'block';
	node.querySelector('.message')?.append(
		timeout
	);

	$(timeout).timeOut(RCV_HOLDTIME - time, () => {
		node.remove();
	});
}

function initRCVOverlay(above) {
	const overlay = createElement('div', {id: 'rcvOverlay'});
	
	above[0].insertAdjacentElement("beforebegin", overlay);
	above[0].rcv = [];
	above[0].onscroll = function() {
		let keep = [];
		let now = new Date().getTime();

		for (const msg of this.rcv) {
			if ($(msg).position().top < 0) {
				const hold = now - msg.madeAt;

				if (hold < RCV_HOLDTIME) {
					moveToRCV(overlay, msg.cloneNode(true), hold);
				}
			} else {
				keep.push(msg);
			}
		}

		this.rcv = keep;
	}

	return overlay;
}

async function attemptQueue(url, volatile) {
	await parseVideoURLAsync(url).then(info => {
		let existing = PLAYLIST.find(video => video.videoid === info.id);

		if (existing) {
			doRequeue(existing.domobj);
		} else {
			LAST_QUEUE_ATTEMPT = {
				queue: true,
				videotype: info.source,
				videoid: info.id,
				videotitle: info.title,
				volat: volatile
			};

			socket.emit("addVideo", LAST_QUEUE_ATTEMPT);
		}
	}).finally(revertLoaders);
}

function createPlaylistControls() {
	const wrap = createElement('div', {id: 'playlistAddControls'})
}
function initPlaylistControls(plwrap) {
	/*
	const wrap = createElement('div', {id: 'playlistAddControls'},

	)
	*/
	// Add controls
	var plcontrolwrap = $('<div id="playlistAddControls"/>').insertBefore(plwrap);
	var openVideoButton = $('<div/>').addClass('slideBtn').text("Import Video").appendTo(plcontrolwrap);
	var videoImportWrap = $('<div/>').addClass('import hidden').insertAfter(openVideoButton);
	openVideoButton.click(function () {
		this.nextSibling.classList.toggle('hidden');
	});

	$('<div/>').addClass("note").html('Video or <a target="_blank" href="manifest.php">manifest</a> URL:').appendTo(videoImportWrap);
	var container = $('<div/>').appendTo(videoImportWrap);
	var impwrap = $('<div/>').addClass("impele").appendTo(container);
	var videoImport = $('<input/>').appendTo(impwrap);

	var vqBtn = $('<div/>').addClass("impele").addClass("btn").text("Q").appendTo(container);
	vqBtn.click(async function () {
		let btn = $(this);

		await attemptQueue($(videoImport).val(), false).then(() => {
			btn.data('revertTxt', "Q");
			btn.text('').addClass("loading");
		})
	});

	var vvBtn = $('<div id="addVolatButton"/>').addClass("impele").addClass("btn").text("V").appendTo(container);
	vvBtn.click(async function () {
		let btn = $(this);

		await attemptQueue($(videoImport).val(), true).then(() => {
			btn.data('revertTxt', "Q");
			btn.text('').addClass("loading");
		})
	});

	videoImport.keyup(function (e) { if (e.keyCode == 13) { vvBtn.click(); } });
	$('<div/>').addClass("clear").appendTo(container);

	var openPlaylistControls = $('<div/>').addClass('slideBtn').text("Misc Controls").appendTo(plcontrolwrap);
	var playlistControlWrap = $('<div/>').addClass('import').insertAfter(openPlaylistControls);
	openPlaylistControls.click(function () {
		if (playlistControlWrap.is(":hidden")) {
			playlistControlWrap.show("blind");
		} else {
			playlistControlWrap.hide("blind");
		}
	});

	var container = $('<div/>').appendTo(playlistControlWrap);
	window.MISC_CONTROL = container;
	var randomizeBtn = $('<div/>').addClass("misc").addClass("btn").text("Randomize List").appendTo(container);
	randomizeBtn.click(function () {
		if (controlsPlaylist()) {
			if (confirm("Really Randomize list? This should be done SPARINGLY! Its a decent bit of overhead, and will LAG PEOPLE FOR A LITTLE WHILE.")) { socket.emit("randomizeList"); }
		}
	});

	initMultiqueue();
}

function initMultiqueue(){
	window.__multiQueueUnbind && window.__multiQueueUnbind();
	$('#batch-queuing-patch').remove();
	$('.mq-controls').remove();

	const css = `
		.hidden {
			display: none!important;
		}
		.multi-queue {
			background: transparent;
		}
		#playlistAddControls .multi-queue {
			resize: vertical;
			height: 100px;
			color: inherit;
		}
		.multi-queue-button {
			color: inherit;
			width: auto!important;
			background: transparent;
		}
		#playlistAddControls .btn.multi-queue-button {
			height: auto;
		}
		body #playlistAddControls .multi-queue-button:disabled {
			background-color: #999;
		}
		.multi-queue-container { 
			flex-direction: column;
			display: flex;
			padding: 5px;
		}
	`;

	const $import = $(".import .misc.btn").parent();
	const $inputContainer = $import;
	const $btnContainer = $inputContainer.parent();
	const $multiInputDiv = $('<div class="mq-controls multi-queue-container hidden"></div>');
	const $multiInputQueueBtn = $(
		'<button class="mq-controls misc btn multi-queue-button">Queue</button>'
	);
	const $multiInput = $('<textarea class="mq-controls multi-queue"></textarea>');
	const $mButton = $(
		'<div class="mq-controls misc btn multi-queue-button">Batch queue</div>'
	);

	$multiInputDiv.append($multiInput);
	$multiInputDiv.append($multiInputQueueBtn);
	$import.find('.clear').before($mButton);
	$btnContainer.append($multiInputDiv);
	
	$("head").append(`<style id="batch-queuing-patch">${css}</style>`);

	$mButton.on("click", function () {
		$multiInputDiv.toggleClass(`hidden`);
	});
	$multiInputQueueBtn.on("click", function () {
		batchQueue();
	});

	async function batchQueue() {
		const val = $multiInput.val();
		if (val === "") return;

		const list = val
			.split("\n")
			.filter((l) => l != "")
			.reverse();

		$multiInputQueueBtn.attr("disabled", true).text("Queuing...");

		for (let i = 0; i < list.length; i++) {
			const link = list[i];
			$multiInputQueueBtn.text(`Queuing... [${i + 1}/${list.length}]`);
			await attemptQueue(link, true);
		}

		$multiInputQueueBtn.text("Done");

		setTimeout((_) => {
			$multiInputQueueBtn.attr("disabled", false).text("Queue");
		}, 1500);
	}
}

function doPlaylistJump(video) {
	if (!controlsPlaylist() || video === ACTIVE) {
		return;
	}

	socket.emit("forceVideoChange", { 
		index: $(video.domobj).index(), 
		sanityid: video.videoid 
	});
}

function createQueueButton() {
	return createElement('div', {text: 'Q', class: 'requeue'});
}
function createDeleteButton() {
	return createElement('div', {text: 'X', class: 'delete'});
}

function createPlaylistItem(data) {
	const item = createElement('li');
	
	if (data.meta.colorTag) {
		setVidColorTag(item, data.meta.colorTag, data.meta.colorTagVolat || false);
	}

	item.append(
		createElement('div', {class: 'title', text: decodeURI(data.videotitle).replace(/&amp;/g, '&')}),
		createElement('div', {class: 'time', text: secToTime(data.videolength)}),
	);

	if (data.volat) {
		item.classList.add('volatile');
	}

	item.video = data;

	return item;
}

function newPlaylist(plul) {
	plul[0].replaceChildren();

	const fragment = new DocumentFragment();

	PLAYLIST.each(video => {
		let entry = createPlaylistItem(video);

		video.domobj = $(entry);
		
		fragment.append(
			entry
		);
	})

	plul[0].append(
		fragment
	)
	
	recalcStats();
}

function initPlaylist(parent) {
	$("#playlist").remove();
	plwrap = $('<div id="playlist"/>').appendTo(parent);
	

	var viewPort = $('<div/>').addClass('viewport').appendTo(plwrap);
	var overview = $('<div/>').addClass('overview').appendTo(viewPort);

	plul = $("<ul/>").appendTo(overview).attr('id', 'plul');

	initPlaylistControls(plwrap);
	dbg("asking for permission to make the player");
	
	$('<div/>').addClass("clear").appendTo(plwrap);

	var searchArea = $('<div/>').appendTo(plwrap).attr('id', 'searchbox');
	var videoSearch = $('<input/>').appendTo(searchArea);
	videoSearch.keyup(function (e) {
		clearTimeout(getVal("searchTime"));

		if (e.keyCode == 13) {
			videoSearch.submit();
		} else {
			var x = setTimeout(function () {
				videoSearch.submit();
			}, 1000);

			setVal("searchTime", x);
		}
	});
	videoSearch.submit(function () {
		plSearch($(this).val());
	});

	var stats = $('<div/>').appendTo(plwrap).attr('id', 'plstats');
	var totalVideos = $('<div/>').appendTo(stats).addClass('totalVideos').text("0");
	var totalLength = $('<div/>').appendTo(stats).addClass('totalLength').text("0");

	totalVideos.click(function () {
		videoSearch.val('');
		if (searchArea.is(":hidden")) {
			searchArea.show("blind");
			videoSearch.focus();
		} else {
			searchArea.hide("blind");
			videoSearch.blur();
			plSearch();
		}
	});

	// This looks silly, but it's to avoid double-firing events on reconnect
	$(window).unbind('keydown', keydownEventHandler).keydown(keydownEventHandler);
	$(plwrap).on("contextmenu", "li", function (e) {
		var me = $(this);
		var cmds = $("body").dialogWindow({
			title: "Video Options",
			uid: "videomenu",
			offset: {
				top: e.pageY - 5,
				left: e.pageX - 5
			},
			toolBox: true
		});
		var optionList = $("<ul/>").addClass("optionList").appendTo(cmds);
		addVideoControls(me, optionList);

		if (optionList.children().length == 0) {
			cmds.window.close();
		}

		return false;
	});

	//plwrap.tinyscrollbar();
	
	newPlaylist(plul);

	//add delegated controls
	plul[0].addEventListener('click', (e) => {
		const target = e.target;
		const video = target.closest('li');

		if (target.classList.contains('requeue')) {
			doRequeue(video)
		}

		if (target.classList.contains('delete')) {
			const confirm = target.classList.contains('confirm');

			if (confirm) {
				doDelete($(video));
			}

			target.classList.toggle('confirm', !confirm)
		}
	});

	Sortable.create(plul[0], {
		disabled: true,
		onEnd: function (event) {
			if (event.oldIndex === event.newIndex) {
				return;
			}

			socket.emit("sortPlaylist", {
				from: event.oldIndex,
				to: event.newIndex,
				sanityid: event.item.video.videoid
			});
		}
	});
}

function keydownEventHandler(event) {
	if (event.keyCode == 27) {
		// Esc
		// async in case the dialog is doing stuff on keydown
		setTimeout(() => {
			const wins = $(document.body).data('windows');
			if (!wins || wins.length === 0) {
				// MalTweaks header/motd/footer
				$('.floatinner:visible').last().next('.mtclose').click();
				return;
			}

			wins[wins.length - 1].close();
		}, 0);
	}
	else if (event.keyCode == 70 && event.ctrlKey && !event.shiftKey && !event.altKey) {
		// Ctrl+F
		$('.totalVideos').click();
		event.preventDefault();
		return false;
	}
	else if (event.keyCode == 33 && event.altKey) {
		// Left arrow
		cycleChatTab(true);
		return false;
	}
	else if (event.keyCode == 34 && event.altKey) {
		// Right arrow
		cycleChatTab(false);
		return false;
	}
	else {
		return true;
	}
}

function initFlairOpts() {
	const flairs = [
		'No Booze :C',
		'Wine',
		'Cocktail',
		'Cider',
		'Liquor',
		'Liquor',
		'Beer',
		'Green',
		'Water',
		'Coffee',
		'Sparkling Water',
		'Tea'
	];

	FLAIR_OPTS = flairs.map((flair, index) => {
		return createElement('div', {class: `drinkflair flair_${index}`, title: flair, flair_id: index});
	});
}

function initChatControls(parent) {
	$("#chatControls").remove();

	var chatControls = $('<div/>').attr('id', 'chatControls').appendTo(parent);
	var _loginAs = $('<div/>').addClass('loginAs').text("Logged in as:").appendTo(chatControls);
	var loginAs = $('<span/>').addClass('nick').text("anonymous").appendTo(_loginAs);
	loginAs.click(function () {
		if (TYPE <= 1) {
			return;
		}

		NAMEFLAUNT = !this.classList.contains('flaunt');

		if (NAMEFLAUNT) {
			this.classList.add(`level_${TYPE}`, 'flaunt');
		} else {
			this.classList.remove(`level_${TYPE}`, 'flaunt')
		}
	});

	initFlairOpts();
	var flairMenuWrap = $('<div/>').attr('id', 'flairMenu').appendTo(chatControls);
	
	flairMenuWrap[0].append(
		createElement('div', {class: 'flairMenuItems hidden'},
			...FLAIR_OPTS
		)
	);
	
	/*
	flairMenuWrap.click(function () {
		flairMenuWrap.superSelect({
			options: FLAIR_OPTS,
			callback: function (selected) {
				MY_FLAIR_ID = parseInt(selected.getAttribute('flair_id') || 0);
				
				setStorage('myFlairID', MY_FLAIR_ID); // TODO - This used to expire after a day, wat do?
				
				flairMenuWrap.removeClass().addClass('flair_' + MY_FLAIR_ID);
			}
		});
	});
	*/

	var flairArrow = $('<div/>').attr('id', 'flairArrow').appendTo(chatControls);
	flairArrow.click(function () {
		flairMenuWrap.click();
	});

	var settingsMenu = $('<div/>').addClass('settings').appendTo(chatControls).text("Settings");
	settingsMenu.click(function () {
		showConfigMenu(settingsMenu);
	});
}

function initChat(parent) {
	const maintab = createElement('div', {id: 'maintab', class: 'tab active', text: '#Main'});
	const admintab = createElement('div', {id: 'admintab', class: 'tab', text: '#OPS'});

	maintab.onclick = () => showChat('main');
	admintab.onclick = () => showChat('admin');

	const usercountWrap = createElement('div', {id: 'connectedCountWrapper', title: `Kick rocks<br />I'm loading.`}, 
		'Connected users:',
		createElement('span', {id: 'connectedCount'})
	);

	usercountWrap.onclick = toggleChatMode;

	const inputbar = createElement('input', {maxlength: 400, 'aria-label': 'nickname'})
	const input = createElement('div', {id: 'chatinput', class: 'right'}, inputbar);
	
	const placeholder = createElement('div', {text: 'Enter a nickname:', class: 'setNick'});
	const pane = createElement('div', {id: 'chatpane'},
		createElement('div', {id: 'chattabs'}, 
			maintab,
			admintab
		),
		createElement('div', {id: 'chatbuffer', class: 'chatbuffer'},
			createElement('div', {id: 'sbstare'}, 
				createElement('span', {}, '[](/sbstare)')
			)
		),
		createElement('div', {id: 'adminbuffer', class: 'chatbuffer inactive'}),
		usercountWrap,
		createElement('div', {id: 'chatlist'}, 
			createElement('ul')
		),
		input,
		placeholder
	)


	parent.append(
		pane
	)


	inputbar.addEventListener('keydown', function (e) {
		if (e.keyCode !== 9) {
			let self = $(this);
			self.data('tabcycle', false);
			self.data('tabindex', 0);
		}

		switch (e.keyCode) {
			case 13: this.onsubmit(); break;
			case 9: {
				e.preventDefault();
				tabComplete($(this));
				break;
			}
			case 38:
			case 40: {
				if (e.keyCode === 38 && HISTORY_POS < HISTORY.length) {
					HISTORY_POS += 1;
				}

				if (e.keyCode === 40 && HISTORY_POS > 0) {
					HISTORY_POS -= 1;
				}

				this.value = HISTORY[HISTORY_POS];
				break;
			}
			default: {
				HISTORY_POS = 0;
				HISTORY[HISTORY_POS] = this.value;
			}
		}
	});

	inputbar.onsubmit = function() {
		if (canChat()) {
			sendChatMsg(this.value, $(this));
			return;
		}

		const data = {
			nick: this.value,
			pass: false
		};

		socket.emit("setNick", data);
		this.value = '';
	}

	// Because FUCK YOUR EYEBALLS
	
	//TODO: Move out from here, most users never see this
	//TODO: Move to handleACL?
	input.prepend(
		createAdminRainbow()
	);

	initPolls($(chatpane));
	initChatControls($(chatpane));
}
function createAdminRainbow() {
	const letters = [
		['A', '#EE4144'],
		['D', '#F37033'],
		['M', '#FDF6AF'],
		['O', '#62BC4D'],
		['P', '#1E98D3'],
		['S', '#672F89'],
	].map(([char, color]) => {
		const element = createElement('span');
		element.style.color = color;
		element.append(char);
		return element;
	});

	return createElement('div', {id: 'adminRainbow'},
		...letters
	)
}
function initChatList(data) {
	data.forEach(user => addUser(user, false));
	sortUserList();

	setVal('chatlistInitialised', true);
}
function initLogoutForm(headbar) {
	var logoutForm = $('<form/>').attr('method', 'post').appendTo(headbar);
	var layoutTable = $('<table/>').appendTo(logoutForm);

	var row = $('<tr/>').appendTo(layoutTable);
	$('<span/>').text('Logged in as ' + ORIGNAME).appendTo($('<td/>').appendTo(row));
	$('<input/>').attr('name', 'logout').attr('type', 'hidden').appendTo($('<td/>').appendTo(row));

	var passwdbtn = $('<div/>', {
		id: 'passwordbtn',
		class: 'submit'
	}).text("Change password").appendTo($('<td/>').appendTo(row));
	passwdbtn.click(function () {
		showPasswordChangeDialog();
	});

	var logoutbtn = $('<div/>').addClass("submit").text("Logout").appendTo($('<td/>').appendTo(row));
	logoutbtn.click(function () {
		if (localStorage["autologin"]) {
			localStorage.removeItem("autologin")
		}

		logoutForm.submit();
	});
}
function createLoginForm() {
	const rows = [
		[
			{for: 'loginname', text: 'Username'}, 
			{id: 'loginname', type: 'text', autocomplete: 'username'}, 
			{class: 'submit register', text: 'Register'}
		],
		[
			{for: 'loginpass', text: 'Password'}, 
			{id: 'loginpass', type: 'password', autocomplete: 'current-password'}, 
			{class: 'submit login', text: 'Login'}
		]
	];

	const table = createElement('table', {},
		...rows.map(row => createElement('tr', {}, 
			createElement('td', {}, createElement('label', row[0])),
			createElement('td', {}, createElement('input', row[1])),
			createElement('td', {}, createElement('div', row[2])),
		),
	));

	table.append(
		createElement('tr', {}, 
			createElement('td', {}, 
				createElement('label', {text: "Remember Me"}, 
					createElement('input', {type: 'checkbox', checked: "checked", id: "rememberMe"})
				),
			)
		)
	)

	return table;
}

function createRegistrationForm() {
	const rows = [
		[
			{for: 'regname', text: 'Desired username'}, 
			{id: 'regname', type: 'text', autocomplete: 'username'}, 
			{class: 'submit', text: 'Login'}
		],
		[
			{for: 'regpass', text: 'Password'}, 
			{id: 'regpass', type: 'password', autocomplete: 'new-password'}, 
			{}
		],
		[
			{for: 'regpass2', text: 'Confirm password'}, 
			{id: 'regpass2', type: 'password', autocomplete: 'new-password'}, 
			{class: 'submit', text: 'Register'}
		]
	];

	
	const table = createElement('table', {},
		...rows.map(row => createElement('tr', {}, 
			createElement('td', {}, createElement('label', row[0])),
			createElement('td', {}, createElement('input', row[1])),
			createElement('td', {}, createElement('div', row[2])),
		)
	));

	return table;
}
async function initLoginForm(headbar) {
	const table = createLoginForm();
	const submitter = function() {
		const form = this.closest('form');

		$('#headbar .loginError').html('');

		var nick = form["loginname"].value;
		var pass = form["loginpass"].value;
		var pass2 = form["regpass2"]?.value;
		
		var data = { nick: nick, pass: pass };

		if (pass2) {
			data['pass2'] = pass2;
		}

		if (form["rememberMe"].checked) {
			localStorage.setItem('autologin', JSON.stringify(data));
		}

		if (pass2) {
			socket.emit('registerNick', data);
		} else {
			socket.emit('setNick', data);
		}
		
		return false;
	}

	headbar.append(
		createElement('div', {}, 
			createElement('form', {method: 'post'}, table)
		),
		createElement('div', {class: 'loginError'})
	);
	
	table.querySelector('.login').addEventListener('click', submitter);
	table.querySelector('.register').addEventListener('click', function() {
		if (this.classList.contains('register')) {
			const register = createRegistrationForm();
			const head = this.closest('#headbar');
	
			register.onsubmit = submitter;
			
			head.firstElementChild.classList.add('hidden');
			head.firstElementChild.after(
				createElement('div', {}, 
					createElement('form', {method: 'post'}, register)
				),
			)
		}
	});

	if (localStorage["autologin"]) {
		const details = JSON.parse(localStorage.getItem("autologin"));

		socket.emit('setNick', {
			nick: details.nick,
			pass: details.pass
		});
	}
}
function initDrinkCounter() {
	const elements = [
		document.querySelector('#videobg'),
		document.querySelector('#videowrap')
	]

	const wrap = createElement('div', {id: 'drinkWrap', class: 'hidden'}, 
		createElement('div', {id: 'v', class: 'hidden'}),
		createElement('span', {}, 
			'Current video has ',
			createElement('span', {id: 'drinkCounter', text: '0'}),
			' drinks.'
		)
	);

	(elements[0] || elements[1]).append(
		wrap
	);
}
function addPollOpt(to, optionCount) {
	const options = [];

	for (let i = 0; i < optionCount; i++) {
		const input = createElement('input', {type: 'checkbox', tabindex: -1, class: 'optionWrap__two-thirds-checkbox'});
		const option = createElement('div', {class: 'optionWrap'}, 
			createElement('input', {type: 'text', class: 'option'}),
			createElement('label', {class: 'optionWrap__two-thirds'},
				createElement('span', {class: 'optionWrap__two-thirds-text'}),
				input
			)
		);

		input.onchange = function() {
			this.closest('.optionWrap__two-thirds').classList.toggle('is-checked', this.checked)
		}

		options.push(option);
	}

	to[0].append(
		...options
	)
}
function initPolls(under) {
	const chat = createElement('div', {id: 'pollpane'});
	const newButton = createElement('div', {id: 'pc-control-new', class: 'btn', text: 'New Poll'});
	const closeButton = createElement('div', {id: 'pc-control-close', class: 'btn', text: 'Close Active Poll'});

	const controls = createElement('div', {id: 'pollControl'},
		createElement('table', {class: 'mainbtns'}, 
			createElement('tr', {}, 
				createElement('td', {},
					newButton
				),
				createElement('td', {},
					closeButton
				)
			)
		),
		createElement('div', {class: 'clear'}),
		createElement('div', {id: 'pc-control-canvas', class: 'options'})
	)

	newButton.onclick = function() {
		const canvas = controls.lastChild;
		const jq = $(canvas);

		if (canvas.style.display !== 'block') {
			jq.show("blind");
			newButton.textContent = "Cancel";
		} else {
			jq.hide("blind");
			newButton.textContent = "New Poll";
		}
	}
	closeButton.onclick = () => {
		if (canClosePoll()) {
			socket.emit("closePoll");
		}
	}

	chat.append(
		controls
	);
	under[0].after(
		chat
	);

	/*
	const table = createElement('table', {}, 
		createElement('tr', {},
			createElement('td', {},
				createElement('label', {text: 'Poll Title'})
			),
			createElement('td', {class: 'optionWrap'}, 
				createElement('input', {type: 'text'})
			),
			createElement('td', {},
				createElement('input', {class: 'cb', type: 'checkbox', title: 'Obscure votes until poll closes.', checked: true})
			),
		),
		createElement('tr', {},
			createElement('td'),
			createElement('td', {},
				createElement('div', {class: 'btn', text: 'New Option'})
			),
			createElement('td', {},
				createElement('div', {class: 'btn', text: '+5'})
			),
		),
		createElement('tr', {class: 'c-poll-select'},
			createElement('td', {}),
			createElement('td', {},
				createElement(
					'select', {class: 'c-poll-select__select'},
					...autoCloseTimes.map(([time, title]) => createElement('option', {selected: time === 0, text: title, value: time}))
				)
			)
		)


	);
	*/

	var table = $('<table/>').appendTo(controls.lastChild);

	// Title Row
	var row = $('<tr/>').appendTo(table);
	var td = $('<td/>').appendTo(row);
	$('<label/>').text('Poll Title').appendTo(td);

	var td = $('<td/>').appendTo(row);
	var x = $('<div/>').appendTo(td).addClass("optionWrap");
	newPollTitle = $('<input/>').attr('type', 'text').appendTo(x);

	var td = $('<td/>').appendTo(row);
	newPollObscure = $('<input/>').addClass("cb").attr('type', 'checkbox').attr("title", "Obscure votes until poll closes.").prop('checked', true).appendTo(td);

	// Options Row Container
	var row = $('<tr/>').appendTo(table);
	var td = $('<td/>').appendTo(row);
	$('<label/>').text('Poll Options').appendTo(td);

	var td = $('<td/>').appendTo(row);
	var optionContainer = $('<div/>').addClass("optionContainer").appendTo(td);

	// New Option Row
	var row = $('<tr/>').appendTo(table);
	$('<td/>').appendTo(row);
	var td = $('<td/>').appendTo(row);
	var newOptionBtn = $('<div/>').addClass("btn").text("New Option").appendTo(td);
	var td = $('<td/>').appendTo(row);
	var newOptionManyBtn = $('<div/>').addClass("btn").text("+5").appendTo(td);


	const automaticClose = $(createElement(
		'select', {class: 'c-poll-select__select'},
		...autoCloseTimes.map(([time, title]) => createElement('option', {selected: time === 0, text: title, value: time}))
	));

	$("<tr />", {class: 'c-poll-select'})
		.append($("<td />"))
		.append($("<td />").append(automaticClose))
		.appendTo(table);

	// Submit Row
	var row = $('<tr/>').appendTo(table);
	$('<td/>').appendTo(row);
	td = $('<td/>').addClass("c-split-btn-row").appendTo(row);

	const createPollBtn = $('<div/>')
		.addClass("btn")
		.addClass("c-split-btn-row__button")
		.text("Normal Poll")
		.appendTo(td);

	// Ranked Row
	var createRankedPollBtn = $('<div/>')
		.addClass("btn")
		.addClass("c-split-btn-row__button")
		.text("Ranked Poll")
		.appendTo(td);

	// Runoff row
	var row = $('<tr/>').appendTo(table);
	$('<td/>').appendTo(row);
	var td = $('<td/>').appendTo(row);
	var createRunoffBtn = $('<div/>').addClass('btn').text('Create Runoff').appendTo(td);

	var td = $('<td/>').appendTo(row);
	var x = $('<div/>').appendTo(td).addClass('optionWrap');
	var runoffThreshold = $('<input/>').attr('type', 'text').attr('title', 'Vote threshold for the runoff.').appendTo(x);

	// Init
	addPollOpt(optionContainer, 5);
	newOptionBtn.click(function () {
		addPollOpt(optionContainer, 1);
	});
	newOptionManyBtn.click(function () {
		addPollOpt(optionContainer, 5);
	});

	createPollBtn.click(() => createPoll("normal"));
	createRankedPollBtn.click(() => createPoll("ranked"));
	createRunoffBtn.click(function () {
		if (!canCreatePoll()) {
			return;
		}

		var threshold = parseInt(runoffThreshold.val(), 10);

		if (isNaN(threshold)) {
			return;
		}



		var ops = [];
		$('.poll.active tr').each(function (index, elem) {
			var $elem = $(elem);
			var count = parseInt($elem.find('.btn').text());
			if (!isNaN(count) && count >= threshold) {
				const label = POLL_OPTIONS[index];
				const isTwoThirds = label.endsWith(' (⅔ required)');
				const text = isTwoThirds ? label.substr(0, label.length - ' (⅔ required)'.length) : label;
				ops.push({ text, isTwoThirds });
			}
		});

		/*
		const ops = [];

		for
		*/

		if (ops.length > 0) {
			socket.emit('newPoll', {
				title: newPollTitle.val(),
				obscure: newPollObscure.is(":checked"),
				ops: ops,
				closePollInSeconds: parseInt(automaticClose.val()),
			});
			newPollTitle.val('');
			runoffThreshold.val('');
			canvas.find('.option').parent().remove();
			addPollOpt(optionContainer, 2);
			newPollObscure.prop('checked', true);
			newPollBtn.click();
		}

	});

	function createPoll(pollType = "normal") {
		if (!canCreatePoll()) { return; }

		const options = getOptions();
		if (!options.length) {
			return;
		}

		socket.emit("newPoll", {
			title: $(newPollTitle).val(),
			obscure: newPollObscure.is(":checked"),
			ops: options,
			pollType,
			closePollInSeconds: parseInt(automaticClose.val())
		});

		newPollTitle.val("");
		runoffThreshold.val("");
		canvas.find(".option").parent().remove();
		addPollOpt(optionContainer, 5);
		newPollObscure.prop('checked', true);
		newPollBtn.click();
		automaticClose.val(0);
	}

	function getOptions() {
		console.warn(
			canvas
		)
		const opWraps = canvas[0].querySelectorAll(".optionWrap");
		const ret = [];

		for (const opWrap of opWraps) {
			const textInput = opWrap.querySelector(".option");
			if (!textInput) { continue; }

			const text = textInput.value;
			if (!text.trim().length) { continue; }

			const isTwoThirds = opWrap.querySelector(".optionWrap__two-thirds-checkbox").checked;
			ret.push({ text, isTwoThirds });
		}

		return ret;
	}
}
function initAreas() {
	document.querySelector('#countdown-timers').after(
		createElement('div', {class: 'wrapper'},
			createElement('div', {id: 'dyn_header', class: 'dynarea'})
		)
	);

	document.querySelector('#pollpane').after(
		createElement('div', {id: 'dyn_motd', class: 'dynarea'})
	);
	document.querySelector('#main').after(
		createElement('div', {id: 'dyn_footer', class: 'dynarea'})
	);
}
function initMailbox() {
	const clear = createElement('button', {class: 'btn', text: 'Clear'});
	const button = createElement('div', {id: 'mailButtonDiv'},
		createElement('img', {src: `${CDN_ORIGIN}/images/envelope.png`, alt: 'mail'})
	)

	button.addEventListener('click', toggleMailDiv);

	clear.onclick = function() {
		this.parentNode.previousSibling.replaceChildren();
		this.closest('#mailDiv').classList.remove('new');

		toggleMailDiv();
	}
}

function loadDefaultSettings() {
	const options = [
		{key: 'syncAtAll', default: 1},
		{key: 'syncAccuracy', default: 2},
		{key: 'notifyMute', default: 0},
		{key: 'storeAllSquees', default: 1},
		{key: 'drinkNotify', default: 0},
		{key: 'legacyPlayer', default: 0},
		{key: 'showTimestamps', default: 0},
		{key: 'showChatflair', default: 1},
		{key: 'plFolAcVid', default: 1},
		{key: 'keeppolls', default: 5},
		{key: 'sbchatter', default: 0},
		{key: 'nightMode', default: 1},
	];

	for (const opt of options) {
		if (!getStorage(opt.key)) {
			setStorage(opt.key, opt.default)
		}
	}

	const body = document.body;

	// Reactions
	if (getStorage('showTimestamps') == 1) { body.classList.add('showTimestamps'); }
	if (getStorage('sbchatter') == 1) { body.classList.add('showSBChatter'); }
	if (getStorage('showChatflair') == 0) { body.classList.add('hideChatFlair'); }
	if (getStorage('nightMode') == 1) { body.classList.add('night'); }

}

function loadAllPlugins() {
	//Init plugin manager stuff
	for (const node of scriptNodes) {
		var selector = '';
		if (node.js.length > 0) {
			// Use the first js file as the selector, if there is one
			selector = 'script[src="' + node.js[0] + '"]';
		}
		else if (node.css.length > 0) {
			// If there are no js files, use the first css file
			selector = 'link[href="' + node.css[0] + '"]';
		}

		if (selector == '') {
			// If there were no js or css files, or if the selector returns a match, skip this
			// entry - it's either a bad node or they user has it installed as a user script
			console.warn('Bad node ' + node.title + ', ignoring.');
			continue;
		}

		node.exists = !!document.querySelector(selector);
		node.enabled = getStorageToggle(node.setting) && !node.exists;
		node.loaded = false;

		if (node.enabled) {
			loadPlugin(node);
		}
	}
}

$(async function () {
	dbg("page loaded, firing onload scripts");

	document.body.addEventListener('keyup', (e) => {
		if (e.code === 'Escape') {
			e.preventDefault();
		}
	});

	setTimeout(function () {
		if (MY_COUNTRY && window.cookieconsent) {
			let cookiepopupShown = false;
			window.cookieconsent.hasTransition = false;
			window.cookieconsent.initialise({
				palette: {
					popup: {
						background: "#64386b",
						text: "#ffcdfd"
					},
					button: {
						background: "#f8a8ff",
						text: "#3f0045"
					}
				},
				theme: "classic",
				position: "bottom-right",
				law: {
					countryCode: MY_COUNTRY
				},
				cookie: {
					secure: true
				},
				content: {
					message: 'Like every other website on the planet, we use cookies.',
					link: 'Would you like to know more?',
					href: 'https://cookiesandyou.com'
				},
				elements: {
					messagelink:
						'<span id="cookieconsent:desc" class="cc-message">' +
						'<img id="cookieconsent-image">' +
						'{{message}} ' +
						'<a tabindex="0" class="cc-link" href="{{href}}" target="_blank" rel="noreferrer noopener">{{link}}</a>' +
						'</span>'
				}
			}, function (popup) {
				if (!cookiepopupShown && popup.options.enabled || popup.options.revokable) {
					cookiepopupShown = true;
					
					document.head.append(
						createElement('link', {
							rel: 'stylesheet',
							href: 'https://cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.1.0/cookieconsent.min.css',
							integrity: 'sha256-ebN46PPB/s45oUcqLn2SCrgOtYgVJaFiLZ26qVSqI8M=',
							crossorigin: 'anonymous'
						})
					)
					
					//.attr('src', CDN_ORIGIN + '/images/cookies/' + Math.floor(Math.random() * 5) + '.png')
					querySelector('#cookieconsent-image').setAttribute(
						'src',
						`${CDN_ORIGIN}/images/cookies/${Math.floor(Math.random() * 5)}.png`
					)
				}
			});
		}
	}, 1000);

	initLoginForm(document.querySelector('#headbar'));

	//initPlaylist($("#leftpane"));
	initChat(document.querySelector('#rightpane'));
	

	initDrinkCounter();

	initAreas();
	initRCVOverlay($("#chatbuffer"));
	initMailbox();

	loadDefaultSettings();
	MY_FLAIR_ID = getStorageInteger('myFlairID', 0);

	if (MY_FLAIR_ID !== 0) {
		document.querySelector('#flairMenu').classList.add(`flair_${MY_FLAIR_ID}`);
	}

	document.addEventListener('visibilitychange', function () {
		window.flags.set('focused', !document.hidden);

		if (!document.hidden) {
			scrollBuffersToBottom();

			if (CHAT_NOTIFY) {
				clearInterval(CHAT_NOTIFY);
			}
			
			document.title = WINDOW_TITLE;
		}
	});

	const chatbuffer = document.querySelector('.chatbuffer');

	chatbuffer.addEventListener('mouseenter', () => KEEP_BUFFER = false);
	chatbuffer.addEventListener('mouseleave', () => {
		KEEP_BUFFER = true;
		scrollBuffersToBottom();
	});

	// make emotes copyable as [](/emote)
	function collectCopy(node) {
		if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute('emote_id')) {
			const emote = Bem.emotes[parseInt(node.getAttribute('emote_id'), 10)];
			const title = node.textContent ? `*${node.textContent}*` : '';
			return `[${title}](/${emote.names[0]})`;
		} else if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent;
		} else if (!(node.classList.contains('chatbuffer') && node.classList.contains('inactive'))) {
			return Array.from(node.childNodes).map(collectCopy).join(' ');
		}
	}
	
	document.body.addEventListener('copy', (event) => {
		try {
			// if the selection is entirely outside the chat buffers, don't customize
			if (Array.from(document.querySelectorAll('.chatbuffer')).every(buffer => !document.getSelection().containsNode(buffer, true))) {
				return;
			}

			const text = Array.from(document.getSelection().getRangeAt(0).cloneContents().childNodes).map(collectCopy).join(' ');
			event.originalEvent.clipboardData.setData('text/plain', text);
			return false;
		} catch (err) {
			console.error('Error customizing copy operation', err);
		}
	});

	setVal("INIT_FINISHED", true);

	loadAllPlugins();
});