function onYouTubeIframeAPIReady() {
	setVal("YTAPREADY", true);
}
function videoEnded() {
	if (controlsVideo()) {
		forceStateChange();
	}
}
function videoSeeked(time) {
	// Playlist progression is controlled by the server now.
	if (controlsVideo()) {
		console.log('videoSeek');
		socket.emit("videoSeek", time);
	}
}
function videoPlaying() {
	if (controlsVideo()) {
		videoGetTime(function (time) {
			SEEK_TO = time;
			if (SEEK_TO != SEEK_FROM) {
				videoSeeked(time);
			}
			SEEK_FROM = 0;
			forceStateChange();
			dbg("PLAYING");
		});
	}
}
function videoPaused() {
	if (controlsVideo()) {
		videoGetTime(function (time) {
			if (SEEK_FROM == 0) SEEK_FROM = time;
			forceStateChange();
			dbg("PAUSED");
		});
	}
}

socket.on("createPlayer", function (data) {
	console.log('createPlayer', data);

	const isNew = ACTIVE.videoid != data.video.videoid;

	unfuckPlaylist();
	setPlaylistPosition(data, true);

	// avoid skipping on socket reconnects, by not reloading current video
	if (isNew) {
		videoLoadAtTime(ACTIVE, data.time);
	}
});
socket.on("renewPos", function (data) {
	setPlaylistPosition(data, true);
});
socket.on("recvNewPlaylist", function (data) {
	PLAYLIST = new LinkedList.Circular();
	for (var i in data) {
		PLAYLIST.append(data[i]);
	}
	newPlaylist($("#plul"));
	socket.emit("renewPos");
});
socket.on("recvPlaylist", function (data) {
	PLAYLIST = new LinkedList.Circular();
	for (const video of data) {
		PLAYLIST.append(video);
	}
	whenExists("#leftpane", function (obj) {
		initPlaylist(obj);
		setVal("PLREADY", true);
	});
});
socket.on("hbVideoDetail", function (data) {
	if (controlsVideo()) {
		return;
	}

	dbg('hbVideoDetail', data);

	//not matching, refresh player
	if (ACTIVE.videoid !== data.video.videoid) {
		dbg(`ID mismatch: ${ACTIVE.videoid} !== ${data.video.videoid}`);
		socket.emit("refreshMyVideo");
		return;
	}

	//do not sync
	if (getStorage('syncAtAll') === 0 || !PLAYER) {
		return;
	}

	const accuracy = getStorage('syncAccuracy'); 
	const flags = {
		play: false,
		seek: [false, -1]
	};

	videoGetTime((time) => {
		const videoState = videoGetState();

		flags.seek = Math.abs(time - data.time) > accuracy ? [true, data.time]: flags.seek; 
		flags.play = data.state === 1 && videoState !== 1;

		if (data.state !== videoState && !flags.play) {
			dbg(`Player states don't match: ${data.state} !== ${videoState}`);
			flags.seek = [true, data.time];
		}

		if (flags.play) {
			videoPlay();
		}

		if (flags.seek[0] && time !== -1) {
			videoSeekTo(flags.seek[1]);
		}
	});
});
socket.on("sortPlaylist", function (data) {
	unfuckPlaylist();
	waitForNegativeFlag('sorting', function () { sortPlaylist(data); });
});
socket.on("forceVideoChange", function (data) {
	unfuckPlaylist();
	setPlaylistPosition(data);
	videoLoadAtTime(ACTIVE, data.time);
	if (MONITORED_VIDEO != null) {
		ATTENTION.play();
		MONITORED_VIDEO.domobj.removeClass('notify');
		MONITORED_VIDEO = null;
	}
	dbg("got new video ID from server");
	dbg(data);
	dbg("forceVideoChange comeplete");
});
socket.on("dupeAdd", function () {
	revertLoaders();
});
socket.on("badAdd", function () {
	dbg("Bad Add");
	revertLoaders();
});
socket.on("setAreas", function (data) {
	for (const area of data) {
		whenExists(`#dyn_${area.name}`, (a) => {
			a[0].innerHTML = area.html;
			a[0].querySelectorAll('a:not([rel])').forEach(
				n => n.setAttribute('rel', 'noopener noreferrer')
			);
			a[0].querySelectorAll('img:not([alt])').forEach(
				n => n.setAttribute('alt', '')
			);
		})
	}
});
socket.on("addVideo", function (data) {
	unfuckPlaylist();
	addVideo(data.video, data.queue, data.sanityid);
});
socket.on("addPlaylist", function (data) {
	dbg(data);

	for (const video of data.videos) {
		addVideo(video)
	}
});
socket.on("delVideo", function (data) {
	unfuckPlaylist();
	dbg(data);
	const item = document.querySelector(`#playlist li:nth-child(${data.position})`);
	const video = item.video;

	if (video.videoid !== data.sanityid) {
		socket.emit("refreshMyPlaylist");
		return;
	}

	item.remove();
	PLAYLIST.remove(video);

	recalcStats();
});
socket.on("setLeader", function (data) {
	if (data && !LEADER) {
		addChatMsg(
			{
				msg: {
					emote: "rcv",
					nick: "server",
					type: 0,
					msg: "You have been given berry",
					multi: 0,
					metadata: { isSquee: true },
				},
				ghost: false,
			},
			"#chatbuffer",
		);
	}

	LEADER = data;
	handleACL();
	if (sortUserList) sortUserList();
});
socket.on("chatMsg", function (data) {
	switch (data.msg.metadata.channel) {
		case 'main':
			addChatMsg(data, '#chatbuffer');
			break;
		case 'admin':
			addChatMsg(data, '#adminbuffer');
			break;
		default:
			dbg('Oh shit unexpected channel, channel=' + data.msg.metadata.channel + ', msg=' + data.msg.msg);
			addChatMsg(data, '#chatbuffer'); // This might change? Backwards compat for now, though.
			break;
	}
});
socket.on("setNick", function (data) {
	setNick(data);
});
socket.on("setType", function (data) {
	TYPE = data;
	handleACL();
});
socket.on("newChatList", function (data) {
	initChatList(data);
});
socket.on("userJoin", function (data) {
	if (getVal('chatlistInitialised')) {
		addUser(data, true, data.nick !== NAME);
	}
});
socket.on("fondleUser", function (data) {
	switch (data.action) {
		case 'setUserNote':
			updateUserNote(data.info.nick, data.info.note);
			break;
	}
});
socket.on("userPart", function (data) {
	dbg('PART'); dbg(data);
	rmUser(data.nick);
});
socket.on("shadowBan", function (data) {
	var o = $(`#chatlist ul li[nick="${data.nick}"]`);
	o.addClass('sbanned');
});
socket.on("unShadowBan", function (data) {
	var o = $(`#chatlist ul li[nick="${data.nick}"]`);
	o.removeClass('sbanned');
});
socket.on("drinkCount", function (data) {
	manageDrinks(data.drinks);
});
socket.on("numConnected", function (data) {
	handleNumCount(data);
});
socket.on(
	"leaderIs",
	data => {
		// Keep trying to set until you do.
		if (data.nick == false) {
			// server is leading.
			$("#chatlist ul li").removeClass("leader");
			return;
		}

		whenExists("#chatlist ul li", function (obj) {
			$(obj).removeClass("leader");
			$(obj).each(function (key, val) {
				if (data.nicks.includes($(val).data("nick"))) {
					$(val).addClass("leader");
				}
			});
		});

		if (sortUserList) {
			sortUserList();
		}
	}
);
socket.on("setVidVolatile", function (data) {
	pos = data.pos;
	isVolat = data.volat;
	setVidVolatile(pos, isVolat);
});
socket.on("setVidColorTag", function (data) {
	var pos = data.pos;
	var tag = data.tag;
	var volat = data.volat;
	setVidColorTag(pos, tag, volat);
});
socket.on("kicked", function (reason) {
	var msg = "You have been kicked";
	if (reason) {
		msg += ": " + reason;
	}
	$('<div/>').addClass("kicked").text(msg).appendTo($('.chatbuffer'));
});
socket.on('serverRestart', function () {
	onSocketReconnecting('serverRestart');
});
/* Poll Stuff */
socket.on("newPoll", function (data) {
	newPoll(data);
});
socket.on("updatePoll", function (data) {
	updatePoll(data);
});
socket.on("setToggleable", function (data) {
	tn = data.name;
	ts = data.state;
	setToggleable(tn, ts);
});
socket.on("setToggleables", function (data) {
	for (var i in data) {
		tn = i;
		ts = data[i].state;
		tl = data[i].label;
		setToggleable(tn, ts, tl);
	}
});
socket.on("clearPoll", function (data) {
	updatePoll(data);
	closePoll(data);
});
socket.on("recvFilters", function (data) {
	FILTERS = data;
});
socket.on("recvBanlist", function (data) {
	BANLIST = data;
});
//socket.emit("setOverrideCss","http://74.67.181.100/test.css")
socket.on("overrideCss", function (data) {
	setStorage("themeOverride", data);
	setColorTheme(data);
});
socket.on("loginError", function (data) {
	loginError(data);
});
socket.on("debug", function (data) {
	dbg(data);
});

socket.on('reconnecting', () => { onSocketReconnecting('reconnecting'); });
function onSocketReconnecting(from) {
	// The socket disconnected and is trying to reconnect; display a message indicating it
	if ($('.chatbuffer .reconnecting').length == 0) {
		let msg = 'Connection lost. Attempting to reconnect...';
		if (from === 'serverRestart') {
			msg = 'Server is restarting... Reconnecting soon!';
		}

		$('.chatbuffer').append($('<div/>').addClass('reconnecting').text(msg));
		$('#chatinput input').prop('disabled', true);
		scrollBuffersToBottom();
	}

	// Also set this flag so that we don't get the ghost messages when we reconnect
	IGNORE_GHOST_MESSAGES = true;
}

socket.on('reconnect', function () {
	// Reconnection was successful; if there's login data set, log the user back in
	$('.chatbuffer .reconnecting').remove();
	$('#chatinput input').prop('disabled', false);
	scrollBuffersToBottom();

	var data = $('#headbar').data('loginData');
	if (data != undefined) {
		data.ghostBust = true;
		socket.emit('setNick', data);
	}
});
function cleanupSessionNick(s) {
	return s.replace(/session\((\d+), ([^,]+), ([^)]+)\)/, '$2');
}
socket.on('adminLog', function (data) {
	if (data.timestamp) {
		data.timestamp = new Date(data.timestamp);
	}
	if (data.nick) {
		data.nick = cleanupSessionNick(data.nick);
	}
	if (data.msg) {
		data.msg = cleanupSessionNick(data.msg);
	}
	if (data.logEvent && data.logEvent.data && data.logEvent.data.mod) {
		data.logEvent.data.mod = cleanupSessionNick(data.logEvent.data.mod);
	}
	if (data.logEvent && data.logEvent.formatted) {
		data.logEvent.formatted = cleanupSessionNick(data.logEvent.formatted);
	}
	ADMIN_LOG.push(data);
	if (ADMIN_LOG.length > 200) {
		ADMIN_LOG.shift();
	}
	addLogMsg(data, $('#logBuffer'));
});
socket.on('searchHistoryResults', function (data) {
	var plul = $('#playlist ul');
	for (var i in data) {
		var vid = data[i];
		var entry = $("<li/>").addClass('history').appendTo(plul);
		entry.data('plobject', vid);
		vid.domobj = entry;

		$("<div/>").addClass('title').text(decodeURIComponent(vid.videotitle)).appendTo(entry);

		$("<div/>").addClass('delete').text("X").click(function () {
			var video = $(this).parent().data('plobject');
			var type = video.videotype;
			var id = video.videoid;
			socket.emit('delVideoHistory', {
				videotype: type,
				videoid: id
			});

			$(this).parent().remove();
		}).mousedown(function (e) {
			e.stopPropagation();
			e.preventDefault();
		}).appendTo(entry);

		$("<div/>").addClass('requeue').text("V").click(function () {
			var video = $(this).parent().data('plobject');
			var type = video.videotype;
			var id = video.videoid;
			var videotitle = video.videotitle;
			LAST_QUEUE_ATTEMPT = {
				queue: true,
				videotype: type,
				videoid: id,
				videotitle: videotitle,
				volat: true
			};
			socket.emit('addVideo', LAST_QUEUE_ATTEMPT);

			$(this).parent().remove();
		}).mousedown(function (e) {
			e.stopPropagation();
			e.preventDefault();
		}).appendTo(entry);

		$("<div/>").addClass('requeue').text("Q").click(function () {
			var video = $(this).parent().data('plobject');
			var type = video.videotype;
			var id = video.videoid;
			var videotitle = video.videotitle;
			LAST_QUEUE_ATTEMPT = {
				queue: true,
				videotype: type,
				videoid: id,
				videotitle: videotitle,
				volat: false
			};
			socket.emit('addVideo', LAST_QUEUE_ATTEMPT);

			$(this).parent().remove();
		}).mousedown(function (e) {
			e.stopPropagation();
			e.preventDefault();
		}).appendTo(entry);

		entry.bind("contextmenu", function (e) {
			var me = $(this);
			var cmds = $("body").dialogWindow({
				title: "Video Options",
				uid: "videomenu",
				offset: {
					top: e.pageY,
					left: e.pageX
				},
				toolBox: true
			});

			const video = me[0].video;
			let info = ['', ''];

			switch (video.videotype) {
				case 'yt': info = ['yt', 'Youtube', `https://youtu.be/${video.videoid}`]; break;
				case 'vimeo': info = ['vimeo', `https://youtu.be/${video.videoid}`]; break;
				case 'dm': info = ['dm', `https://youtu.be/${video.videoid}`]; break;
				case 'soundcloud': info = ['soundcloud', 'Soundcloud', video.meta.permalink]; break;
				default:
					break;
			}

			if (info[0] === '') {
				cmds.window.close();
				return false;
			}

			const option = createElement('ul', {class: 'optionList'});
			const button = createElement(
				'div', {class: 'button'},
				createElement('span', {text: `Open on ${info[1]}`})
			);

			button.onclick = () => {
				if (video.videotype === 'soundcloud' && !info[2]) {
					return;
				}
				
				window.open(info[2], '_blank');
			}

			return false;
		});

		var seconds = vid.videolength;
		$("<div/>").addClass('time').text(secToTime(seconds)).appendTo(entry);

		$('<div/>').addClass("clear").appendTo(entry);
	}

	scrollToPlEntry(0);
});
socket.on('videoRestriction', function (data) {
	showVideoRestrictionDialog(data);
});
socket.on('doorStuck', function () {
	// DOOR STUCK, DOOR STUCK
	// PLEASE
	// I BEG YOU
	// YOU'RE A... A GENUINE DICK SUCKER
	showDoorStuckDialog();
});
socket.on('forceRefresh', function (data) {
	let delay = 0;
	if (data && data.delay) {
		if (data.delay === true) {
			if (data.delayMin === undefined) {
				data.delayMin = 100;
			}
			if (data.delayMax === undefined) {
				data.delayMax = 5000;
			}
			delay = Math.random() * (data.delayMax - data.delayMin) + data.delayMin;
		} else {
			delay = data.delay;
		}
	}
	setTimeout(function () {
		// disable drunk mode to skip confirmation dialog
		if (window.Bem) {
			Bem.loggingIn = true;
		}
		window.location.reload();
	}, delay);
});
socket.on('shitpost', function (data) {
	const parts = data.msg.split(' ');
	switch (parts[0].toLowerCase()) {
		case 'roll':
		case 'spin':
		case 'zspin':
			const rollTarget = $(parts[1] || '#ytapiplayer,#chatpane');
			const animation = parts[2] || '-zspin';
			rollTarget.css('animation', '1.5s ' + animation);
			setTimeout(function () {
				rollTarget.css('animation', '');
			}, 1500 + 100);
			break;
	}
});
socket.on('debugDump', function (data) {
	DEBUG_DUMPS.push(data);
});
