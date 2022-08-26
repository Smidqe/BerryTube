let lastPollCountdown = null;

const integerRegex = /^\d+$/;

const Videosources = [
	/*
	Each source follows following format
		name,
		whole (false -> use 1st matchgroup, true -> url),
		regex,
		title (optional) 
	];

	Literal immutable regexes can be more performant than RegExp ones if not changing
	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	*/

	//youtube
	['yt', false, /youtube\.com\/watch.*?[&?]v=([\w-]{11})/g],
	['yt', false, /youtu\.be\/([\w-]{11})/],
	['yt', false, /youtube\.com\/shorts\/([\w-]{11})/],
	['yt', false, /i\.ytimg\.com\/an_webp\/([\w-]{11})\//g],
	
	
	//dailymotion
	['dm', false, /dailymotion.com\/(?:embed\/)?video\/([\w]+)/g],
	['dm', false, /dai.ly\/([\w]+)/g],
	
	//twitch
	['twitchclip', false, /clips\.twitch\.tv\/([\w-]+)/],
	['twitchclip', false, /twitch\.tv\/[\w]+\/clip\/([\w-]+)/g],
	['twitch', false, /twitch\.tv\/((?:videos\/)?[\w-]+)/g],

	//vimeo
	['vimeo', false, /vimeo.com\/([^&]+)/g],
	
	//soundbutt
	['soundcloud', false, /(https?:\/\/soundcloud.com\/[^/]+\/[^/?]+)/g],

	//reddit (is hls, but needs id)
	['reddit', false, /v\.redd\.it\/([\w]+)\//g],

	//osmf aka rtmp
	['osmf', true, /^rtmp:\/\//g, '~ Raw Livestream ~'],
	['osmf', true, /\.f4m$/g, '~ Raw Livestream ~'],
	
	//dash
	['dash', false, /https:\/\/watch.cloudflarestream.com\/([a-z0-9]+)/g, '~ Raw Livestream ~'],
	['dash', true, /\.mpd/g],

	//hls
	['hls', true, /\.m3u8$/g, '~ Raw Livestream ~'],

	//manifest
	['manifest', true, /\.json[^/]*$/g],
	
	//file
	['file', true, /\.(?:mp4|m4v|webm|mov)?[^\\/]*$/g],
];



class Countdown {
	constructor(totalTimeInSeconds, startedAt, handlers) {
		this.isEnabled = true;
		this.handlers = handlers;
		this.totalTimeInSeconds = totalTimeInSeconds;
		this.startedAt = startedAt;

		const start = startedAt;
		const tick = () => {
			if (!this.isEnabled) {
				return;
			}

			const now = new Date().getTime();
			const elapsedInSeconds = (now - start) / 1000;
			const timeLeftInSeconds = Math.max(0, totalTimeInSeconds - elapsedInSeconds);

			this.handlers.onTick({
				timeLeftInSeconds,
				percent: Math.max(0, timeLeftInSeconds / totalTimeInSeconds)
			});

			if (timeLeftInSeconds <= 0) {
				this.dispose();
			}
		};

		this.interval = window.setInterval(tick, 500);
		tick();
	}

	dispose() {
		this.isEnabled = false;
		window.clearInterval(this.interval);

		if (this.handlers.onDispose) {
			this.handlers.onDispose();
		}
	}
}

/* MAIN */
function setRuleTitle(titleBar, myData) {
	titleBar.html(['<span class="name">', myData.name, '</span> <span class="code">', myData.chatMatch, ' => ', myData.chatReplace.replace(/</g, '&lt;').replace(/>/g, '&gt'), '</span>'].join(''));
}

function onModuleLoaded(callback) {
	if (window.isModuleLoaded) {
		callback();
		return;
	}

	(window.moduleLoadedCallbacks = (window.moduleLoadedCallbacks || []))
		.push(callback);
}

function showAdminFilterWindow() {

	socket.emit('getFilters');

	var parent = $("body").dialogWindow({
		title: "Modmin Filter Config",
		uid: "adminfilter",
		center: true,
		initialLoading: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	mainOptWrap.data('rules', []);
	var controlBar = $('<div id="filterControls"/>').addClass('controlBar').appendTo(mainOptWrap);
	var ruleZone = $('<div/>').addClass('ruleZone').appendTo(mainOptWrap);
	// Add "Add" Button
	var newRuleBtn = $('<div/>').addClass('button').appendTo(controlBar);
	$('<span/>').appendTo(newRuleBtn).text("Add New Rule");

	function addRule(data) {

		myData = {
			nickMatch: ".*",
			nickParam: "i",
			chatMatch: ".*",
			chatParam: "i",
			chatReplace: "",
			actionSelector: "none",
			enable: true,
			name: "",
			meta: ""
		};
		for (var i in data) {
			myData[i] = data[i];
		}

		var newRule = $('<div/>').addClass("row").appendTo(ruleZone);
		var titleBar = $('<div/>').addClass("titleBar").appendTo(newRule);
		setRuleTitle(titleBar, myData);
		titleBar.click(function () {
			$(this).parents('.row').children('table').toggleClass('hidden');
		});
		var newTable = $('<table/>').addClass("hidden").appendTo(newRule);

		/*
		/[]/[]
		div:ruleZone
			div:rule
				name
					label, input
				nick
				text
				replace
				div:btns
					enable
					disable
					remove (double sure)
		createElement('div', {class: 'rule'},
			createPair('', ''),
			createPair('', ''),
			createRegexPair()
			createRegexPair(),

		)
		*/

		/* Rule Name */
		var nameRow = $('<tr/>').appendTo(newTable);
		var nameLabelCol = $('<td/>').appendTo(nameRow);
		var nameDataCol = $('<td/>').appendTo(nameRow);
		$('<span/>').text("Rule Name:").appendTo(nameLabelCol);
		var nameText = $('<input/>').attr('type', 'text').val(myData.name).appendTo(nameDataCol);
		newRule.data('name', nameText);

		/* USERNAME */
		var userRow = $('<tr/>').appendTo(newTable);
		var userLabelCol = $('<td/>').appendTo(userRow);
		var userDataCol = $('<td/>').appendTo(userRow);
		$('<span/>').text("Match Username:").appendTo(userLabelCol);
		$('<span/>').text("/").appendTo(userDataCol);
		var nickMatch = $('<input/>').attr('type', 'text').val(myData.nickMatch).appendTo(userDataCol);
		newRule.data('nickMatch', nickMatch);
		$('<span/>').text("/").appendTo(userDataCol);
		var nickParam = $('<input/>').attr('type', 'text').val(myData.nickParam).addClass("tiny").appendTo(userDataCol);
		newRule.data('nickParam', nickParam);

		/* Chat */
		var chatRow = $('<tr/>').appendTo(newTable);
		var chatLabelCol = $('<td/>').appendTo(chatRow);
		var chatDataCol = $('<td/>').appendTo(chatRow);
		$('<span/>').text("Match Chat:").appendTo(chatLabelCol);
		$('<span/>').text("/").appendTo(chatDataCol);
		var chatMatch = $('<input/>').attr('type', 'text').val(myData.chatMatch).appendTo(chatDataCol);
		newRule.data('chatMatch', chatMatch);
		$('<span/>').text("/").appendTo(chatDataCol);
		var chatParam = $('<input/>').attr('type', 'text').val(myData.chatParam).addClass("tiny").appendTo(chatDataCol);
		newRule.data('chatParam', chatParam);

		/* Replacements */
		var replaceRow = $('<tr/>').appendTo(newTable);
		var replaceLabelCol = $('<td/>').appendTo(replaceRow);
		var replaceDataCol = $('<td/>').appendTo(replaceRow);
		$('<span/>').text("Replace Chat:").appendTo(replaceLabelCol);
		var chatReplace = $('<input/>').attr('type', 'text').val(myData.chatReplace).appendTo(replaceDataCol);
		newRule.data('chatReplace', chatReplace);

		/* Actions */
		var _actions = [ // show meta allows a extra field, for whatever purposes.
			{ label: "No Action", tag:"none", showmeta: false },
			{ label: "Kick User", tag:"kick", showmeta: true },
			{ label: "Suppress Message", tag:"suppress", showmeta: true },
			{ label: "Force Lowercase", tag:"hush", showmeta: false },
		];
		var actionRow = $('<tr/>').appendTo(newTable);
		var actionLabelCol = $('<td/>').appendTo(actionRow);
		var actionDataCol = $('<td/>').appendTo(actionRow);
		$('<span/>').text("Action:").appendTo(actionLabelCol);
		var actionSelector = $('<select/>').appendTo(actionDataCol);
		newRule.data('actionSelector',actionSelector);
		var actionMetadata = $('<input/>').attr('type','text').addClass("hidden").appendTo(actionDataCol);
		newRule.data('actionMetadata',actionMetadata);
		for (var i in _actions) {
			$("<option/>")
				.val(_actions[i].tag)
				.text(_actions[i].label)
				.appendTo(actionSelector)
				.data("showmeta", _actions[i].showmeta);

			console.log(_actions[i].showmeta);
		}
		actionSelector.change(function () {
			if ($(this).children("option:selected").data('showmeta')) {
				actionMetadata.removeClass("hidden");
				actionMetadata.val(myData.actionMetadata);
			} else {
				actionMetadata.addClass("hidden");
			}
		});
		actionSelector.val(myData.actionSelector);
		actionSelector.change();

		/* Enabled */
		var enableRow = $('<tr/>').appendTo(newTable);
		var enableLabelCol = $('<td/>').appendTo(enableRow);
		var enableDataCol = $('<td/>').appendTo(enableRow);
		$('<span/>').text("Enable Rule:").appendTo(enableLabelCol);
		var enable = $('<input/>').attr('type', 'checkbox').appendTo(enableDataCol);
		if (myData.enable) {
			enable.prop('checked', true);
		}
		newRule.data('enable', enable);

		var rules = mainOptWrap.data('rules');
		rules.push(newRule);

		var removeBtn = $('<div id="filterRemove"/>').addClass("button").prependTo(newTable);
		$('<span/>').appendTo(removeBtn).text("Remove Rule");
		removeBtn.click(function () {
			var rules = mainOptWrap.data('rules');
			rules.splice(rules.indexOf(newRule), 1);
			newRule.remove();
		});

		function refreshTitle() {
			var row = $(this).parents('.row');
			var d = {
				chatMatch: row.data('chatMatch').val(),
				chatReplace: row.data('chatReplace').val(),
				name: row.data('name').val()
			};
			setRuleTitle(row.children('.titleBar'), d);
		}
		chatMatch.change(refreshTitle);
		chatReplace.change(refreshTitle);
		nameText.change(refreshTitle);
	}

	newRuleBtn.click(function () {
		addRule();
	});

	var testBar = $('<div/>').appendTo(mainOptWrap);
	/* Test Field */
	var testName = $('<input/>').attr('type', 'text').addClass("small").appendTo(testBar);
	$('<span/>').appendTo(testBar).text(":");
	var testChat = $('<input/>').attr('type', 'text').appendTo(testBar);
	var exampleArea = $('<div/>').appendTo(mainOptWrap);

	/* Save Button */
	var saveBtn = $('<div/>').addClass('button').appendTo(controlBar);
	$('<span/>').appendTo(saveBtn).text("Save Rules");
	saveBtn.click(function () {
		var rules = mainOptWrap.data('rules');
		var convertedRules = [];
		for (var i = 0; i < rules.length; i++) {
			//console.log($(rules[i]).data());
			var d = {
				nickMatch: $(rules[i]).data('nickMatch').val(),
				nickParam: $(rules[i]).data('nickParam').val(),
				chatMatch: $(rules[i]).data('chatMatch').val(),
				chatParam: $(rules[i]).data('chatParam').val(),
				chatReplace: $(rules[i]).data('chatReplace').val(),
				actionSelector: $(rules[i]).data('actionSelector').val(),
				actionMetadata: $(rules[i]).data('actionMetadata').val(),
				enable: $(rules[i]).data('enable').is(':checked'),
				name: $(rules[i]).data('name').val()
			};
			convertedRules.push(d);
		}
		mainOptWrap.data('convertedRules', convertedRules);
		if (canSetFilters()) {
			socket.emit("setFilters", convertedRules);
			highlight(saveBtn[0]);
		}
	});

	/* Test Button */
	var testBtn = $('<div/>').addClass('button').appendTo(testBar);
	$('<span/>').appendTo(testBtn).text("Test Rules");
	testBtn.click(function () {
		var rules = mainOptWrap.data('rules');
		var nick = testName.val();
		var msg = testChat.val();
		var actionChain = [];

		for (var i = 0; i < rules.length; i++) {
			var d = {
				nickMatch: $(rules[i]).data('nickMatch').val(),
				nickParam: $(rules[i]).data('nickParam').val(),
				chatMatch: $(rules[i]).data('chatMatch').val(),
				chatParam: $(rules[i]).data('chatParam').val(),
				chatReplace: $(rules[i]).data('chatReplace').val(),
				actionSelector: $(rules[i]).data('actionSelector').val(),
				actionMetadata: $(rules[i]).data('actionMetadata').val(),
				enable: $(rules[i]).data('enable').is(':checked')
			};
			if (!d.enable) {
				continue;
			}

			// Name Check
			const nickCheck = new RegExp(d.nickMatch, d.nickParam);
			const chatCheck = new RegExp(d.chatMatch, d.chatParam);
			
			if (nickCheck.test(nick)) { //console.log("matched name");
				if (chatCheck.test(msg)) { //console.log("matched chat");
					// Perform Action
					actionChain.push({ action: d.actionSelector, meta: d.actionMetadata });
				}
				if ($.trim(d.chatReplace).length > 0) { //console.log("doing a replace");
					msg = msg.replace(chatCheck, d.chatReplace);
				}
			}
		}
		
		var a = '';

		/*
		const a = actionChain.reduce((acc, action) => {
			switch (action.action) {
				case "none": return acc;
				case "hush": {
					msg = msg.toLowerCase();
				}
			}

			acc += `<div>ACTION: ${action.action}, ${action.meta}</div>`;
		}, '')
		for (const action of actionChain) {
			switch (action.action) {
				case "none": continue;
				case "hush": {
					msg = msg.toLowerCase();
				}
			}

			a += `<div>ACTION: ${action.action}, ${action.meta}</div>`;
		}
		*/
		for (var i = 0; i < actionChain.length; i++) {
			if (actionChain[i].action == "none") {
				continue;
			}

			if (actionChain[i].action == "hush") {
				msg = msg.toLowerCase();
			}

			a += "<div>ACTION: " + actionChain[i].action + ", " + actionChain[i].meta + "</div>";
		}
		var out = '<div>' + nick + ": " + msg + '</div>' + a;
		exampleArea.html(out);
	});

	parent.window.center();

	function loadExisting() {
		console.log(FILTERS);
		for (var i in FILTERS) {
			addRule(FILTERS[i]);
		}
		FILTERS = false; // Reset for next load.
		parent.window.setLoaded();
	}

	function waitForExisting() {
		console.log("Waiting for Existing Rules");
		setTimeout(function () {
			if (!FILTERS) {
				waitForExisting();
			} else {
				loadExisting();
			}
		}, 500);
	}
	waitForExisting();

}
function showIgnoreDialog() {
	var parent = $('body').dialogWindow({
		title: 'Ignore Management',
		uid: 'ignoremanagement',
		center: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	var banZone = $('<div/>').addClass('banZone').appendTo(mainOptWrap);

	function addBanRow(name) {
		var row = $('<div/>').addClass('row').appendTo(banZone);
		var nicks = $('<span/>').text(name);
		$('<div/>').addClass('content').append(nicks).css('width', '290px').appendTo(row);
		$('<div/>').addClass('unban button').text("Unignore").css('width', '52px').appendTo(row).click(function () {
			IGNORELIST.splice(IGNORELIST.indexOf(name), 1);
			localStorage.setItem('ignoreList', JSON.stringify(IGNORELIST));
			CHATLIST.get(name)?.dom.classList.remove('ignored');
			
			row.remove();
		});
		$('<div/>').addClass('clear').appendTo(row);
	}

	if (IGNORELIST.length) {
		for (let name of IGNORELIST) {
			addBanRow(name);
		}
	} else {
		$('<div/>', {class: 'nothing'}).text("You haven't ignored anyone. Right click on a user if you want to do so.").appendTo(banZone);
	}

	parent.window.center();
}
function showBanlistWindow() {
	socket.emit('getBanlist');

	var parent = $("body").dialogWindow({
		title: "Ban List",
		uid: "banlist",
		center: true,
		initialLoading: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	var banZone = $('<div/>').addClass('banZone').appendTo(mainOptWrap);

	parent.window.center();

	function addBanRow(data) {
		var row = $('<div/>').addClass('row').appendTo(banZone);
		var nicks = $('<span/>').text(data.nicks[0]).attr('title', data.nicks.length > 1 ? data.nicks.join(', ') : '');
		var ips = $('<span/>').text(data.ips[0]).attr('title', data.ips.length > 1 ? data.ips.join(', ') : '');
		var exp = new Date(data.bannedOn + (data.duration * 60000));
		$('<div/>').addClass('content').append(
			nicks,
			data.nicks.length > 1 ? '*, ' : ', ',
			ips,
			data.ips.length > 1 ? '*, ' : ', ',
			exp.getFullYear() + '-' + (exp.getMonth() + 1) + '-' + exp.getDate() + ' ' + addZero(exp.getHours()) + ':' + addZero(exp.getMinutes()) + ':' + addZero(exp.getSeconds())
		).appendTo(row);
		$('<div/>').addClass('unban button').text("Unban").appendTo(row).click(function () {
			socket.emit('ban', { nicks: data.nicks, ips: data.ips, duration: 0 });
			row.remove();
		});
		$('<div/>').addClass('clear').appendTo(row);
	}

	function loadExisting() {
		dbg(BANLIST);
		if (BANLIST.length == 0) {
			$('<div/>', {class: 'nothing'}).text("No one is banned. How crazy is that?").appendTo(banZone);
		}
		else {
			for (var i in BANLIST) {
				addBanRow(BANLIST[i]);
			}
		}
		BANLIST = false;
		parent.window.setLoaded();
	}

	function waitForExisting() {
		dbg("Waiting for ban list");
		setTimeout(function () {
			if (!BANLIST) {
				waitForExisting();
			}
			else {
				loadExisting();
			}
		}, 500);
	}

	waitForExisting();
}
function showBanDialog(nick) {
	const parent = $("body").dialogWindow({
		title: "Ban User",
		uid: "banuser",
		center: true
	});

	const options = [
		{length: 1, text: '1 minute'},
		{length: 5, text: '5 minute'},
		{length: 30, text: '30 minute'},
		{length: 60, text: '1 hour'},
		{length: 120, text: '2 hours'},
		{length: 180, text: '3 hours'},
		{length: 360, text: '6 hours'},
		{length: 540, text: '9 hours'},
		{length: 720, text: '12 hours'},
	];
	
	const main = createElement('div', {class: 'controlWindow'}, 
		//TODO: Move the margin into a css file instead of inlining
		createElement('p', {text: `Applying ban to ${nick}:`}),
		createElement('select', {},
			...options.map(option => createElement('option', {text: option.text, time: option.length})),
		),
		//add buttons
		createElement('div', {}, 
			createElement('div', {class: 'button', text: 'Cancel'}),
			createElement('div', {class: 'button accept', text: 'Apply'}),
		)
	).appendTo(parent);

	if (TYPE >= 2) {
		main.querySelector('select').append(
			createElement('option>', {text: 'Permanent', time: -1})
		)
	}

	for (const btn of main.querySelectorAll('.button')) {
		btn.addEventListener('click', function() {
			if (this.classList.contains('accept')) {
				socket.emit('ban', { 
					nicks: [nick], 
					ips: [querySelector(`li[nick="${nick}"]`).getAttribute('ip')], 
					duration: main.querySelector(':selected').getAttribute('time') 
				});
			}

			parent.window.close();
		});
	}

	parent.window.center();
}

function showCssOverrideWindow() {

	var curOverride = $("body").data("cssOverride");

	var parent = $("body").dialogWindow({
		title: "Admin CSS Config",
		uid: "csseditor",
		center: true
	});



	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	var warning = "Ok, so this will let you force a CSS include on everyone who connects. the source of the file can be remote, but please, please, please use the test button first, and make sure everything looks good before committing, because it could cause parts of the site to break if done badly. These changes are sent to everyone IMMEDIATELY.";
	$('<p>').appendTo(mainOptWrap).text(warning).css("width", "500px");
	$('<p>').appendTo(mainOptWrap).text("Clear and save to unset the override.").css("width", "500px");
	var cssOv = $('<input/>').appendTo(mainOptWrap).val(curOverride);
	var testBtn = $('<div/>').addClass('button').appendTo(mainOptWrap);
	$('<span/>').appendTo(testBtn).text("Test CSS Include Locally");
	testBtn.click(function () {
		setColorTheme(cssOv.val());
	});
	var commitBtn = $('<div/>').addClass('button').appendTo(mainOptWrap);
	$('<span/>').appendTo(commitBtn).text("Save and Propogate");
	commitBtn[0].onclick = confirmClick(commitBtn[0], () => socket.emit('setOverrideCss', cssOv.val()))


	parent.window.center();

}
function showCustomSqueesWindow() {
	var parent = $('body').dialogWindow({
		title: 'Custom Squee Management',
		uid: 'squeemanagement',
		center: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	var controlBar = $('<div/>').appendTo(mainOptWrap);
	var nameZone = $('<div/>').addClass('nameZone').appendTo(mainOptWrap);

	function addName(name) {
		var newName = $('<div/>').appendTo(nameZone);
		newName.append($('<input/>').attr('type', 'text').val(name),
			$('<div/>').addClass('button').append('<span>X</span>').click(function () { $(this).parent().remove(); }));
	}

	// Control buttons
	var newNameBtn = $('<div/>').addClass('button').appendTo(controlBar);
	$('<span/>').appendTo(newNameBtn).text("Add New Name");
	newNameBtn.click(function () { addName(''); });

	var saveBtn = $('<div/>').addClass('button').appendTo(controlBar);
	$('<span/>').appendTo(saveBtn).text("Save Names");
	saveBtn.click(function () {
		$('#squeeWarningText').remove();
		var error = false;
		var newList = [];
		nameZone.children().each(function (index, element) {
			var input = $(element).find('input');
			var validationRegex = (TYPE >= 1 ? /^[\w+*?. ]+$/ : /^[\w]+$/);
			
			if (validationRegex.test(input.val())) {
				newList.push(input.val());
				input.css('background-color', '#FFFFFF');
			}
			else if (input.val().length > 0) {
				error = true;
				input.css('background-color', '#FF5555');
			}
		});
		if (error) {
			$('<div/>').attr('id', 'squeeWarningText').html('Custom squees may only contain<br>alphanumeric characters and<br>underscores. Please correct the<br>rows highlighted in red.').appendTo(mainOptWrap);
		}
		else {
			HIGHLIGHT_LIST = newList;
			localStorage.setItem('highlightList', HIGHLIGHT_LIST.join(';'));
		}
		highlight(saveBtn[0]);
	});

	for (const name of HIGHLIGHT_LIST) {
		addName(name);
	}

	parent.window.center();
}

function showPluginWindow() {
	var parent = $('body').dialogWindow({
		title: 'Plugin Management',
		uid: 'pluginmanagement',
		center: true
	});

	var mainOptWrap = $('<div/>').addClass('controlWindow').appendTo(parent);
	var pluginZone = $('<div/>').appendTo(mainOptWrap);
	var warnText = $('<div/>').addClass('warnText').appendTo(mainOptWrap);

	for (var i in scriptNodes) {
		var node = scriptNodes[i];
		if (typeof node.minType === 'number' && node.minType > TYPE) {
			continue;
		}

		var nodeDiv = $('<div/>').addClass('pluginNode').appendTo(pluginZone);
		$('<div/>').addClass('pluginTitle').text(node.title).appendTo(nodeDiv);
		$('<div/>').addClass('pluginDesc').html(node.desc).appendTo(nodeDiv);
		$('<div/>').addClass('pluginAuthors').text('Author' + (node.authors.length != 1 ? 's' : '') + ': ' + node.authors.join(', ')).appendTo(nodeDiv);

		if (!node.exists) {
			var checkbox = $('<input type="checkbox"/>').data('node', node);
			
			

			if (node.enabled) {
				checkbox.prop('checked', true);
			}

			checkbox.change(function () {
				var chkNode = $(this).data('node');
				if (chkNode) {
					chkNode.enabled = this.checked;
					setStorage(chkNode.setting, this.checked);

					warnText.text(
						this.checked ? '' : 'The plugin(s) you have disabled will be unloaded the next time you refresh.'
					)
					if (this.checked) {
						loadPlugin(chkNode);
					}
				}
				else {
					dbg('Checkbox was missing its associated node!');
				}
			});

			$('<div/>').addClass('pluginEnable').append(
				$('<span/>').text('Enabled:'), checkbox
			).appendTo(nodeDiv);
		}
		else {
			$('<div/>').addClass('pluginExists').text('Please disable or uninstall this plugin\'s user script to control it through the plugin manager.').appendTo(nodeDiv);
		}
	}

	parent.window.center();
}

async function loadPlugin(node) {
	if (!node.loaded) {
		dbg('Loading ' + node.title);

		await new Promise((res) => {
			document.head.append(
				...node.css.map(css => {
					return createElement('link', {rel: 'stylesheet', type: 'text/css', href: css, defer: ''})
				}),
				...node.js.map(js => {
					return createElement('script', {type: 'text/javascript', src: js, defer: ''})
				})
			);

			res()
		})

		node.loaded = true;
	}
	else {
		dbg('Plugin exists, not re-loading.');
	}
}

function showVideoRestrictionDialog(data) {
	var parent = $("body").dialogWindow({
		title: "Confirm Queue",
		uid: "videorestriction",
		center: true
	});

	const conditions = [
		{key: 'restricted', is: data.restricted, canForce: false},
		{key: 'unembeddable', is: data.noembed, canForce: false},
		{key: 'ageblock', is: data.ageRestricted, canForce: false},
		{key: 'geoblock', is: data.geoblock, canForce: true},
	];

	/*
	const dom = createElement('div', {class: 'controlWindow'});
	const conditions = new Map([
		['restricted', {force: false, message: 'The video you attempted to queue was either removed or marked as private.'}]
		['unembeddable', {force: false, message: 'The video you attempted to queue cannot be embedded.'}],
		['ageblock', {force: false, message: 'Video cannot be queued due it being age restricted.'}]
		['geoblock', {force: true}]
	]);

	const [force, messages] = data.reasons.reduce((reason, acc) => {
		const condition = conditions.get(reason);

		acc[0] &&= condition.force;

		if (reason === 'geoblock') {
			let countryText;
			const countries = data.geoblock.countryNames || data.geoblock.countries;

			if (Array.isArray(countries)) {
				countryText = countries.join(', ');
				if (data.totalCountries > countries.length) {
					const diff = data.totalCountries - countries.length;
					countryText += ` (and ${diff} other${diff === 1 ? '' : 's'})`;
				}
			} else {
				countryText = countries;
			}
			
			if (data.geoblock.kind === 'whitelist') {
				acc[1].push(`The video you attempted to queue is only visible in these countries: ${countryText}`);
			} else {
				acc[1].push(`The video you attempted to queue is restricted in the following countries: ${countryText}`);
			}
		} else {
			acc[1].push(condition.message);
		}

		return acc;
	}, [true, []]);
	
	messages.unshift(
		'Video has following restrictions:'
	);

	if (force) {
		messages.push('Would you like to queue the video anyway?')
	}

	dom.append(
		...messages.map(msg => createElement('p', {text: msg})),
		force ?
		
	);

	*/

	//get the matched conditions
	const matched = conditions.filter(n => n.is);
	const canBeForced = matched.every(n => n.canForce);
	const buttons = canBeForced ? ['No', 'Yes'] : ['Okay'];
	const dom = $('<div>', {class: 'controlWindow'}).append(
		$('<div>').css('text-align', 'center').append(
			buttons.map(n =>
				$('<div>', {class: 'button'}).attr('force', n).append(
					$('<span>', {text: n})
				)
			)
		)
	).appendTo(parent);


	const messages = matched.map((condition) => {
		switch (condition.key) {
			case 'restricted': return "The video you attempted to queue was either removed or marked as private.";
			case 'unembeddable': return "The video you attempted to queue cannot be embedded.";
			case 'geoblock': {
				let countryText;
				const countries = data.geoblock.countryNames || data.geoblock.countries;

				if (Array.isArray(countries)) {
					countryText = countries.join(', ');
					if (data.totalCountries > countries.length) {
						const diff = data.totalCountries - countries.length;
						countryText += ` (and ${diff} other${diff === 1 ? '' : 's'})`;
					}
				} else {
					countryText = countries;
				}
				
				if (data.geoblock.kind === 'whitelist') {
					return `The video you attempted to queue is only visible in these countries: ${countryText}`;
				} else {
					return `The video you attempted to queue is restricted in the following countries: ${countryText}`;
				}
				
			}
			case 'ageblock': return 'Video cannot be queued due it being age restricted.';
		}
	});
	
	//prepend to the messages
	messages.splice(0, 0, 'Video has the following restrictions:');

	//it can still be queued
	if (canBeForced) {
		messages.push(
			'Would you like to queue the video anyway?'
		);
	}

	//attach messages
	dom.prepend(messages.map(msg => $('<p>', {text: msg}).css('width', '300px')));
	
	//listen for the button clicks
	dom.on('click', '.button', (event) => {
		if ($(event.currentTarget).is('[force="Yes"]') && LAST_QUEUE_ATTEMPT != null) {
			LAST_QUEUE_ATTEMPT.force = true;
			socket.emit("addVideo", LAST_QUEUE_ATTEMPT);
		}

		parent.window.close();
	});
	
	parent.window.center();
}
function showDoorStuckDialog() {
	var parent = $("body").dialogWindow({
		title: "Playlist Error",
		uid: "doorstuck",
		center: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');
	$('<p>').appendTo(mainOptWrap).text("Your playlist was broken but should be fixed now. If you were attempting a playlist-altering action, try it again.").css("width", "300px");
	var buttonDiv = $('<div/>').css("text-align", "center").appendTo(mainOptWrap);
	var okayBtn = $('<div/>').addClass('button').appendTo(buttonDiv);
	$('<span/>').appendTo(okayBtn).text("Okay");
	okayBtn.click(function () {
		parent.window.close();
	});

	parent.window.center();
}
function showPasswordChangeDialog() {
	var parent = $("body").dialogWindow({
		title: "Change Password",
		uid: "passwdchange",
		center: true
	});

	var mainOptWrap = $('<div/>').appendTo(parent).addClass('controlWindow');

	var errorMsg, pass1, pass2;
	mainOptWrap.append(
		$('<div>').append(
			$('<label>', {
				for: 'newpassword1',
				text: 'New password '
			})
		).append(
			pass1 = $('<input>', {
				id: 'newpassword1',
				type: 'password'
			}).attr('autocomplete', 'new-password')
		)
	).append(
		$('<div>').append(
			$('<label>', {
				for: 'newpassword2',
				text: 'New password '
			})
		).append(
			pass2 = $('<input>', {
				id: 'newpassword2',
				type: 'password'
			}).attr('autocomplete', 'new-password')
		)
	).append(
		errorMsg = $('<div>').css('color', 'red')
	);

	var buttonDiv = $('<div/>').css("text-align", "center").appendTo(mainOptWrap);

	var okayBtn = $('<div/>').addClass('button').appendTo(buttonDiv);
	$('<span/>').appendTo(okayBtn).text("Okay");
	okayBtn.click(function () {
		if (pass1.val() !== pass2.val()) {
			errorMsg.text("Passwords don't match!");
			return;
		}

		if (pass1.val().length < 6) {
			errorMsg.text("Password must be at least 6 characters long!");
			return;
		}

		socket.emit('changePassword', { pass: pass1.val() });
		parent.window.close();
	});

	parent.window.center();
}
function addZero(i) {
	if (i < 10) {
		i = "0" + i.toString();
	}
	
	return i;
}
function secToTime(seconds) {
	if (seconds <= 0) {
		return "- - : - -";
	}

	var minutes = 0;
	var hours = 0;

	minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds % 60);
	hours = Math.floor(minutes / 60);
	minutes = Math.floor(minutes % 60);

	seconds = addZero(seconds);
	minutes = addZero(minutes);

	var disp = minutes + ":" + seconds;
	if (hours > 0) {
		hours = addZero(hours);
		disp = hours + ":" + disp;
	}
	return disp;
}
function setNick(nick) {
	NAME = nick;
	document.querySelector("#chatControls .nick").textContent = NAME;

	let nickElem = document.querySelector('.setNick');

	nickElem.previousSibling.classList.remove('right');
	nickElem.previousSibling.setAttribute('aria-label', 'message');
	nickElem.remove();

	ORIGNAME = nick;
	sortUserList();
}
function recalcStats() {
	// Figure time.
	var numberMan = $("#plstats .totalVideos");
	var timeMan = $("#plstats .totalLength");

	var x = 0;

	PLAYLIST.each(video => {
		x += video.videolength;
	});

	timeMan.text(secToTime(x));

	numberMan.text(PLAYLIST.length + " Videos");
}

function setToggleable(name, state, label) {
	var opt = document.querySelector(".tgl-" + name);
	if (typeof label == "undefined") {
		TOGGLEABLES[name].state = state;
	} else {
		TOGGLEABLES[name] = {
			state: state,
			label: label
		};
	}

	if (opt) {
		opt.checked = state;
	}
}
function getToggleable(name) {
	return TOGGLEABLES[name]?.state ?? false;
}
function forceStateChange() {
	if (!controlsVideo() || ACTIVE.videolength === 0) {
		return;
	}

	socket.emit("forceStateChange", {
		state: PLAYER.getVideoState()
	});
}
function handleACL() {

	try {
		dbg("ACL INIT:");
		const body = document.body;

		body.classList.toggle('admin', TYPE === 2);
		body.classList.toggle('assistant', TYPE === 1);
		body.classList.toggle('berry', LEADER);

		if (isRegisteredUser()) {
			const headbar = document.querySelector('#headbar');
			headbar.replaceChildren();
			initLogoutForm($(headbar));
		}

		if (canSeeAdminLog()) {
			whenExists('#chatControls', function (chatControls) {
				if (!chatControls[0].querySelector('.log')) {
					const menu = createElement('div', {class: 'log', text: 'Log'});
					
					chatControls[0].append(
						menu
					);

					menu.onclick = () => showLogMenu($(menu));
				}
			});
		}

		whenExists("#playlistAddControls", (controls) => {
			const canQueue = controlsPlaylist();
			const playlist = controls[0].parentNode.querySelector('ul');

			controls[0].style.display = canQueue ? 'block' : 'none';
			Sortable.get(playlist).option('disabled', !canQueue);

			if (canQueue) {
				if (!playlist.querySelector('.delete')) {
					for (const node of playlist.childNodes) {
						addVideoEntryControls(node);
					}
				}
			} else {
				playlist.querySelectorAll('.requeue, .delete').forEach(node => node.remove());
			}

			if (ACTIVE?.domobj) {
				scrollToPlEntry(ACTIVE.domobj.index());
			}
		});

		//show/hide poll controls
		whenExists("#pollControl", function (pc) {
			pc[0].style.display = canCreatePoll() ? 'block' : 'none';
			document.querySelector('.poll-control')?.classList.toggle('enabled', canCreatePoll());
		});
		
		if (canSetAreas()) {
			$('.editBtn').remove();
			attachAreaEdit($("#dyn_header"), "header");
			attachAreaEdit($("#dyn_footer"), "footer");
			attachAreaEdit($("#dyn_motd"), "motd");
			dbg("CAN EDIT AREAS");
		} else {
			$('.editBtn').remove();
			dbg("CAN NOT AREAS");
		}

		scrollBuffersToBottom();

		dbg("ACL DONE.");
	} catch (e) {
		console.log("Error in handleACL", e);
	}
}

/*
[
  "error",
  "createPlayer",
  "renewPos",
  "recvNewPlaylist",
  "recvPlaylist",
  "hbVideoDetail",
  "sortPlaylist",
  "forceVideoChange",
  "dupeAdd",
  "badAdd",
  "setAreas",
  "addVideo",
  "addPlaylist",
  "delVideo",
  "setLeader",
  "chatMsg",
  "setNick",
  "setType",
  "setToken",
  "newChatList",
  "userJoin",
  "fondleUser",
  "userPart",
  "shadowBan",
  "unShadowBan",
  "drinkCount",
  "numConnected",
  "leaderIs",
  "setVidVolatile",
  "setVidColorTag",
  "kicked",
  "serverRestart",
  "newPoll",
  "updatePoll",
  "setToggleable",
  "setToggleables",
  "clearPoll",
  "recvFilters",
  "recvBanlist",
  "recvPlugins",
  "overrideCss",
  "loginError",
  "debug",
  "reconnecting",
  "reconnect",
  "adminLog",
  "searchHistoryResults",
  "videoRestriction",
  "doorStuck",
  "forceRefresh",
  "shitpost",
  "debugDump"
]
*/
function loginError(data) {
	$('#headbar .loginError').text(data.message);
}
function isRegisteredUser() {
	return TYPE >= 0;
}
function sendChatMsg(msg, elem) {
	//prevent sending messages without a nick
	if (!canChat() || msg.trim().length === 0) {
		return;
	}

	HISTORY.unshift(msg);
	HISTORY_POS = 0;
	HISTORY[HISTORY_POS] = "";

	if (HISTORY.length > HISTORY_SIZE) {
		HISTORY.splice(HISTORY_SIZE, 1);
	}

	const meta = {
		flair: MY_FLAIR_ID,
		channel: ACTIVE_CHAT
	};

	if (NAMEFLAUNT) { 
		meta.nameflaunt = NAMEFLAUNT; 
	}

	handleSpamChecks(function () {
		socket.emit("chat", {
			msg: msg,
			metadata: meta
		});

		elem[0].value = "";
	});
}

function handleSpamChecks(callback) {
	const defaultHtp = 15000;
	const spamShift = 3100;

	let lastTime = getVal("lasttime");
	let currentHp = getVal("chathp");

	if (typeof lastTime == "undefined" || lastTime == null) {
		lastTime = new Date().getTime() - defaultHtp;
	}

	if (typeof currentHp == "undefined" || currentHp == null) {
		currentHp = defaultHtp;
	}

	const nowTime = new Date().getTime();
	const timeDelta = nowTime - lastTime;
	const damageToApply = timeDelta - spamShift;
	currentHp = Math.min(currentHp + damageToApply, defaultHtp);

	dbg("SPAMCHECK", {
		currentHp,
		timeDelta,
		damageToApply
	});

	if (currentHp < 0) {
		dbg("SPAMCHECK: message rejected");

		$("#chatinput input").addClass("loading");
		setTimeout(function () {
			$("#chatinput input").removeClass("loading");
		}, (currentHp * -1));
	} else {
		callback();
		setVal("chathp", currentHp);
		setVal("lasttime", nowTime);
	}
}

function getLogTimestamp(msg) {
	const time = new Date(msg.logEvent.createdAt);
	
	//month, day, hours, minutes and seconds are padded with zero
	const padded = [
		time.getMonth() + 1,
		time.getDate(),
		time.getHours(), 
		time.getMinutes(), 
		time.getSeconds()
	].map(part => addZero(part));

	const date = [time.getFullYear().toString(), ...padded.slice(0, 2)].join('-');
	const timestamp = padded.slice(2).join(':'); 

	return `${date} ${timestamp}`;
}

function addLogMsg(data, to, filter = true) {
	if (to.length === 0) {
		return;
	}

	if (IGNORE_GHOST_MESSAGES && data.ghost) {
		return;
	}

	const time = getLogTimestamp(data);

	//The only time we don't have a nick is when someone gives up berry (I think?)
	const nick = data.logEvent.data.mod || data.nick || 'Berry';
	const type = data.logEvent.data.type;
	const mesg = data.logEvent.formatted;
	const event = data.logEvent.event.replace('EVENT_ADMIN_', '');

	const message = $('<tr>', {nick, type}).append(
		$('<td>', {text: time, class: 'createdAt'}),
		$('<td>', {text: nick, class: 'nick'}),
		$('<td>', {text: event, class: 'event'}),
		$('<td>', {text: mesg, class: 'message'}),
		$('<td>', {text: type, class: 'message'})
	);

	to.find('tbody').prepend(
		message
	);

	const nickFilters = to.parent().find('#logNickFilter');

	if (nickFilters.find(`option:contains(${nick})`).length === 0) {
		nickFilters.append(
			$('<option>', {text: nick})
		)
	}

	if (filter) {
		filterAdminLog();
	}
}

function scrollBuffersToBottom() {
	if (!KEEP_BUFFER) {
		return;
	}

	const buffers = [
		document.querySelector('#chatbuffer'),
		document.querySelector('#adminbuffer')
	];

	
	const heights = [];
	requestAnimationFrame(() => {
		heights.push(...buffers.map(n => n.scrollHeight));
	})
	requestAnimationFrame(() => {
		for (let index = 0; index < heights.length; index++) {
			buffers[index].scrollTop = heights[index]
		}
	})
}

function addChatMsg(data, _to) {
	whenExists(_to, function (to) {
		// Added for a safe event hook for handling addons, etc.
		btEvents.emit("chat", data);

		//const [nick, msg, meta, isGhost] = [data.msg.nick, data.msg.msg, data.msg.metadata, data.ghost]
		//const message = data.msg;

		// New format cause fuck all that argument shit. know whats cool? Objects.
		var nick = data.msg.nick;
		var msgText = data.msg.msg; // Don't hate me.
		var metadata = data.msg.metadata;
		var isGhost = data.ghost;

		const info = data.msg;


		const wrap = createElement('div', {class: 'msgwrap'});
		const message = createElement('div');

		wrap.append(
			message
		);

		if (typeof (nick !== "undefined")) {
			wrap.setAttribute('nick', info.nick);
		}

		if (IGNORELIST.includes(info.nick) && !metadata.nameflaunt) {
			return;
		}

		if (IGNORE_GHOST_MESSAGES && data.ghost) {
			return;
		}

		//TODO: Replace this with information in CHATLIST (faster and easier)
		const user = CHATLIST.get(info.nick);
		const isSquee = metadata.isSquee || (NAME?.length > 0 && detectName(NAME, msgText));
		
		let includeTimestamp = false;

		if (user) {
			wrap.classList.add(
				user.type
			);

			user.lastMessage = new Date().getTime();
		}

		if (data.msg.metadata.graymute) {
			wrap.classList.add('graymute');
		}

		message.classList.add('message');

		if (data.msg.emote) {
			message.classList.add(
				data.msg.emote === 'poll' ? 'pollNote' : data.msg.emote
			);
		}

		to[0].lastMsgRecvBy = "";

		switch (data.msg.emote) {
			case 'spoiler':
			case 'sweetiebot':
			case 'request':
			case 'act': {
				const inner = createElement('span', {class: 'msg'});

				if (data.msg.emote === 'request') {
					inner.append(formatChatMsg("requests " + msgText));
				} else {
					inner.append(formatChatMsg(msgText));
				}

				message.classList.add('message', data.msg.emote);
				message.append(
					createElement('span', {class: 'nick', text: nick}),
					inner,
				)

				if (data.msg.emote === 'spoiler') {
					message.lastChild.before(
						createElement('span', {class: 'spoiltag', text: 'SPOILER: '})
					)
				}

				includeTimestamp = true;
				
				break;
			}
			case 'server':
			case 'poll': {
				let inner = msgText;

				if (data.msg.emote === "poll") {
					inner = `${nick} has created a new poll: "${msgText}"`;
				}

				message.append(
					createElement('span', {html: inner})
				);

				break;
			}
			case 'rcv': {
				message.append(
					createElement('span', {class: 'nick', text: `${nick}:`}),
					createElement('span', {class: 'msg'}),
					createElement('span', {}, 
						formatChatMsg(msgText)
					)
				);

				wrap.madeAt = new Date().getTime();
				
				to[0].rcv.unshift(wrap);

				includeTimestamp = true;
				break;
			}
			case 'drink': {
				wrap.classList.add('drinkWrap');

				const table = createElement('table', {}, 
					createElement('tr', {}, 
						createElement('td', {}, 
							createElement('span', {class: 'nick', text: `${nick}:`}),
							createElement('span', {class: 'msg', html: `${msgText} drink!`})
						)
					)
				);

				if (data.msg.multi) {
					table.firstChild.append(
						createElement(
							'td',
							{},
							createElement('span', {class: 'multi', text: `${data.msg.multi}x`})
						)
					)
				}

				message.append(
					table
				)

				break;
			}
			case false: {
				if (to[0].lastMsgRecvBy !== nick) {
					let name = createElement('span', {class: 'nick', text: nick});

					if (metadata.nameflaunt) {
						name.classList.add('flaunt', `level_${data.msg.type}`)
					}

					if (metadata.flair) {
						name.append(
							createElement('div', {class: `flair flair_${metadata.flair}`}),
							':'
						);
					} else {
						name.textContent.concat(':');
					}

					message.append(
						name
					)

					includeTimestamp = true;
				}

				message.append(
					createElement('span', {class: 'msg'},
						createElement('span', {class: 'msg'}, formatChatMsg(msgText))
					)	
				);

				to[0].lastMsgRecvBy = nick;
				break;
			}
			default: {
				dbg(`Unknown message type, how? ${data.msg.emote}`)
			}
		}

		if (isSquee && ['act', 'sweetiebot', 'rcv', false].includes(data.msg.emote)) {
			wrap.classList.add("highlight");
			doSqueeNotify();
			addNewMailMessage(nick, data.msg.msg);
		}

		if (to[0].childNodes.length > 500) {
			Array.from(to[0].childNodes).slice(0, -500).forEach(n => n.remove())
		}

		if (includeTimestamp) {
			const d = new Date(data.msg.timestamp ?? Date.now());

			const h = addZero(d.getHours());
			const m = addZero(d.getMinutes());
			const s = addZero(d.getSeconds());

			message.prepend(
				createElement('span', {class: 'timestamp', text: `<${h}:${m}:${s}>`})
			)
		}

		if (!isGhost) {
			notifyNewMsg(metadata.channel, isSquee, data.msg.emote == "rcv");
			scrollBuffersToBottom();
		}

		to[0].append(
			wrap
		);
	});
}
function doSqueeNotify() {
	if (window.flags.get('focused')) {
		return;
	}

	if (getStorage('notifyMute') == 0) {
		NOTIFY.play();
	}

	clearInterval(CHAT_NOTIFY);

	CHAT_NOTIFY = setInterval(function () {
		document.title = document.title === WINDOW_TITLE ? NOTIFY_TITLE : WINDOW_TITLE
	}, 1000);
}

function manageDrinks(drinks) {
	//once #v exists so does #drinkCounter and #drinkWrap
	whenExists('#drinkWrap > #v', (v) => {
		const wrap = v[0].parentElement;
		const counter = wrap.querySelector('#drinkCounter');
		
		wrap.classList.toggle('hidden', drinks === 0);
		v[0].classList.toggle('hidden', drinks <= 9000);

		//added drink(s)
		if (drinks && drinks !== DRINKS && getStorage('drinkNotify')) {
			DRINK.play();
		}

		DRINKS = drinks;
		counter.textContent = DRINKS;
	});
}


function handleNumCount(data) {
	CONNECTED = data.num;

	whenExists("#connectedCount", function (area) {
		area[0].textContent = CONNECTED;
	});
}
function closePoll(data) {
	if (lastPollCountdown) {
		lastPollCountdown.dispose();
		lastPollCountdown = null;
	}

	$("#pollpane .poll-auto-close").remove();
	$("#pollpane .poll-control").remove();

	if (data.pollType == "ranked") {
		onModuleLoaded(() => window.rankedPolls.closeRankedPoll());
		$(".poll.active").removeClass("active");
	} else {
		// sort results and unbind old buttons
		const list = $(".poll.active").removeClass("active").find("ul");
		list
			.find("li")
			.detach()
			.sort(function(a, b) {
				const aOp = $(a).find(".btn").data("op");
				const bOp = $(b).find(".btn").data("op");
				const aVotes = data.votes[aOp];
				const bVotes = data.votes[bOp];

				if (aVotes === bVotes) {
					return 0;
				}
				return aVotes < bVotes ? 1 : -1;
			})
			.each(function(_, val) {
				$(val)
					.appendTo(list)
					.find(".btn")
					.unbind("click")
					.css("pointer-events", "none");
			});
	}

	// remove old polls...
	var keep = getStorage("keeppolls");
	var polls = $("#pollpane").children(".poll");
	for (var i = 0; i < polls.length; i++) {
		if ($(polls[i]).hasClass("active")) {
			continue;
		}

		if (--keep < 0) {
			$(polls[i]).remove();
		}
	}
}

function toggleMailDiv() {
	/*
	const mailbox = document.querySelector('#mailboxDiv');
	const open = mailbox.classList.contains('hidden');

	if (!open && open.children.length) {
		mailbox.classList.remove('new');
	}

	mailbox.classList.toggle('hidden', !open)
	*/
	var mailboxDiv = $('#mailboxDiv');

	if (mailboxDiv.css('display') == 'none' && $('#mailMessageDiv').children().length > 0) {
		mailboxDiv.css('display', 'block');
		$('#mailButtonDiv').addClass('expanded').removeClass('new');
	}
	else {
		mailboxDiv.css('display', 'none');
		$('#mailButtonDiv').removeClass('expanded');
	}
}

function addNewMailMessage(nick, msg) {
	if (window.flags.get('focused') && !getStorageToggle("storeAllSquees")) {
		return;
	}

	const mail = createElement('div', {class: 'mail'},
		createElement('span', {class: 'timestamp', text: ``}),
		createElement('span', {class: 'nick'}),
		createElement('span', {html: formatChatMsg(msg, false)}),
		createElement('button', {class: 'btn', text: 'X'})
	);

	var newMsg = $('<div/>').addClass('mail');
	var now = new Date();
	newMsg.append(
		$('<span/>').addClass('timestamp').text('<' + addZero(now.getHours()) + ":" + addZero(now.getMinutes()) + ":" + addZero(now.getSeconds()) + '>'),
		$('<span/>').addClass('nick').text(nick + ':'),
		$('<span/>').html(formatChatMsg(msg, false)),
		$('<button/>').addClass('btn').css('width', '20px').text('X').click(function () {
			$(this).parent().remove();
			if ($('#mailMessageDiv').children().length == 0) {
				$('#mailButtonDiv').removeClass('new');
				toggleMailDiv();
			}
		}));

	if (window.postEmoteEffects) {
		postEmoteEffects(newMsg);
	}

	var mailMsgDiv = $('#mailMessageDiv');
	mailMsgDiv.append(newMsg);
	while (mailMsgDiv.children().length > 10) {
		mailMsgDiv.children().first().remove();
	}
	$('#mailButtonDiv').addClass('new');

}
function plSearch(term) {
	/*
	if (typeof term == "undefined" || /^$/.test(term) || term.length < 3) {
		PLAYLIST.dom.classList.remove("searching");
		PLAYLIST.each((node) => {
			node.dom.
		})
		$("#playlist").removeClass("searching");
		$("#plul li").removeClass("search-hidden");
		$("#plul li.history").remove();
		$("#plul li .title").removeAttr("active-offset");
		scrollToPlEntry(ACTIVE.domobj.index());
		return;
	}
	*/

	if (typeof term == "undefined" || /^$/.test(term) || term.length < 3) {
		$("#playlist").removeClass("searching");
		$("#plul li").removeClass("search-hidden");
		$("#plul li.history").remove();
		$("#plul li .title").removeAttr("active-offset");
		scrollToPlEntry(ACTIVE.domobj.index());
		return;
	}

	if (TYPE >= 1 || LEADER) {
		socket.emit('searchHistory', { search: term });
	}

	$("#playlist").addClass("searching");
	$("#plul li").addClass("search-hidden");
	$("#plul li.active").removeClass("search-hidden");

	const rx = new RegExp(term, 'i');
	const activeIndex = ACTIVE.domobj.index();

	PLAYLIST.each((video, index) => {
		const name = decodeURI(video.videotitle);
		const item = video.domobj[0];

		if (rx.test(name)) {
			const diff = index - activeIndex;
			const str = diff !== 0 ? `(${diff > 0 ? '+' : '-'})` : '';
			
			
			item.classList.remove('search-hidden');
			item.querySelector('.title').setAttribute('active-offset', str);
		} else {
			item.classList.add('search-hidden');
		}
	})

	scrollToPlEntry(0);
}
function newPoll(data) {
	if (data.ghost && IGNORE_GHOST_MESSAGES) {
		// Ghost poll on a reconnect; just revote, don't redisplay it
		var vote = $('.voted');
		if (vote.length > 0) {
			// Just recast the vote - the CSS should still be set, and the response
			// should handle making sure the numbers are all correct
			socket.emit('votePoll', { op: vote.data('op') });
		}
	} else {
		const $existingPoll = $(".poll.active");
		if ($existingPoll.length) {
			const pollId = $existingPoll.data("id");
			if (pollId === data.id) {
				updatePoll(data);
				return;
			}

			closePoll({});
			$existingPoll.removeClass("active");
		}

		// New poll, or ghost poll on an initial connection
		addChatMsg({
			msg: {
				emote: "poll",
				nick: data.creator,
				type: 0,
				msg: data.title,
				multi: 0,
				metadata: false
			},
			ghost: false
		}, '#chatbuffer');

		whenExists("#pollpane", stack => {
			POLL_TITLE_FORMAT = data.title;
			POLL_OPTIONS.splice(0, POLL_OPTIONS.length);

			const $poll = $("<div />")
				.addClass("poll")
				.addClass("active")
				.data("id", data.id)
				.prependTo(stack);

			const $closeButton = $('<div/>').addClass("btn").addClass("close").text("X").appendTo($poll);
			const $title = $('<div/>').addClass("title").text(getPollTitle(data)).appendTo($poll);

			$closeButton.click(() => $poll.hide("blind"));

			if (data.pollType == "ranked") {
				$poll.addClass("ranked-poll");
				onModuleLoaded(() => {
					window.rankedPolls.createRankedPoll(data, $poll[0]);
					updateRankedPollEmotes();
				});
			} else {
				const votes = data.votes;
				var optionwrap = $('<ul/>').appendTo($poll);
				const options = data.options;
				for (var i = 0; i < options.length; i++) {
					var t = options[i].replace("&gt;", ">").replace("&lt;", "<");
					var iw = $('<li/>').appendTo(optionwrap);
					var row = $('<tr/>').appendTo($('<table/>').appendTo(iw));
					var optionBtn = $('<div/>').addClass("btn").text(votes[i]).appendTo($('<td/>').appendTo(row));

					if (data.obscure) {
						optionBtn.addClass("obscure");
					}

					$('<div/>').addClass("label").text(t).appendTo($('<td/>').appendTo(row));
					$('<div/>').addClass("clear").appendTo(iw);

					optionBtn.data("op", i);
					optionBtn.data("disabled", false);
					optionBtn.click(function () {
						var $this = $(this);
						if (!$this.is('.disabled')) {
							$(this).addClass('voted');
						}
						var d = $this.data("disabled");
						if (!d) {
							socket.emit("votePoll", {
								op: $this.data("op")
							});
							$this.data("disabled", true);
							optionwrap.find(".btn").addClass("disabled");
						}
					});

					POLL_OPTIONS.push(t);
				}
			}

			$("<div />")
				.addClass("poll-auto-close")
				.append(
					$("<div />")
						.addClass("poll-auto-close__time-left"),
					$("<div />")
						.addClass("poll-auto-close__progress-bar")
						.append($("<div />")
							.addClass("poll-auto-close__progress-bar-inner")))
				.appendTo($poll);

			const $pollControl = $("<div />")
				.addClass("poll-control")
				.append(
					$("<div />")
						.addClass("poll-control__auto-close")
						.append(
							$("<select>")
								.addClass("poll-control__auto-close__select")
								.append($("<option />")
									.attr("value", "")
									.text("Set Poll Timer"))
								.append($("<option />")
									.attr("value", "0")
									.text("Remove Timer"))
								.append(
									autoCloseTimes
										.filter(([time]) => time > 0)
										.map(([time, title]) => $(`<option />`)
											.text(title)
											.attr("value", time)))
								.change(function () {
									const $this = $(this);
									const closeInSeconds = parseInt($this.val(), 10);
									$this.val("");

									socket.emit("updatePoll", {
										id: data.id,
										closePollInSeconds: closeInSeconds
									});
								}))
				)
				.appendTo($poll);

			updatePollAutoClose($poll, data);

			if (canCreatePoll()) {
				$pollControl.addClass("enabled");
			}
		});
	}
}
function updatePoll(data) {
	const $poll = $(".poll.active");
	const $title = $poll.find('.title');
	let pollTitle = getPollTitle(data);

	/*
	const poll = document.querySelector('.poll.active');
	const title = poll.querySelector('.title');

	if (window.Bem) {
		title.textContent = title.textContent.replace(/\\\\([\w-]+)/i, '[](/$1)');
		Bem.applyEmotesToTextNode($(title));
	}

	switch (data.pollType) {
		case "ranked": 
	}
	*/

	if (typeof Bem !== 'undefined') {
		pollTitle = pollTitle.replace(/\\\\([\w-]+)/i, '[](/$1)');
		$title.html(Bem.applyEmotesToStr(pollTitle));
		Bem.postEmoteEffects($title);
	} else {
		$title.text(pollTitle);
	}

	if (data.pollType == "ranked") {
		onModuleLoaded(() => {
			window.rankedPolls.updateRankedPoll(data);
			updateRankedPollEmotes();
		});
	} else {
		const votes = data.votes;
		$poll.find(".btn").each(function (key, val) {
			$(val).text(votes[$(val).data("op")]);
		});
	}

	updatePollAutoClose($poll, data);
}
function updateRankedPollEmotes() {
	if (typeof Bem === 'undefined') {
		return;
	}

	const poll = document.querySelector('.poll.active');
	const options = poll.querySelector('.render-emotes');

	for (const option of options) {
		if (option.emotesRendered) {
			return;
		}

		option.emotesRendered = true;
		Bem.applyEmotesToTextNode(option);
	}
}
function updatePollAutoClose($poll, data) {
	const $progress = $poll.find(".poll-auto-close__progress-bar-inner");
	const $timeLeft = $poll.find(".poll-auto-close__time-left");
	const $autoClose = $poll.find(".poll-auto-close");

	/*
	const 
	*/

	if (data.closePollInSeconds > 0) {
		$autoClose.addClass("enabled");

		if (lastPollCountdown) {
			if (lastPollCountdown.pollId === data.id &&
				lastPollCountdown.startedAt === data.startedAt &&
				lastPollCountdown.totalTimeInSeconds === data.closePollInSeconds) {
				return;
			}

			lastPollCountdown.dispose();
		}

		lastPollCountdown = new Countdown(data.closePollInSeconds, data.startedAt, {
			onTick({ timeLeftInSeconds, percent }) {
				$timeLeft.text(timeLeftInSeconds >= 1
					? `closing in ${secondsToHuman(timeLeftInSeconds)}`
					: "closing poll...");

				$progress[0].style.width = `${percent * 100}%`;
			},
			onDispose() {
				$timeLeft.text("closing poll...");
				$progress.css("width", "0px");
			}
		});

		lastPollCountdown.pollId = data.id;
	} else {
		$autoClose.removeClass("enabled");

		if (lastPollCountdown && lastPollCountdown.pollId === data.id) {
			lastPollCountdown.dispose();
			lastPollCountdown = null;
		}
	}
}
function getPollTitle({ votes, extended }) {
	var title = POLL_TITLE_FORMAT;

	for (var i = 0; i < votes.length; i++) {
		title = title.replace(new RegExp('\\{' + i + '\\}', 'g'), new Array(votes[i] + 1).join(POLL_OPTIONS[i]));
	}

	if (typeof (extended) !== "undefined" && typeof (extended.voteCount) !== "undefined") {
		return `${title} (${extended.voteCount} vote${extended.voteCount !== 1 ? "s" : ""})`;
	}

	return title;
}
function setStorage(key, value) {
	localStorage.setItem(key, value);
}
function getStorage(key) {
	return localStorage.getItem(key);
}

function getStorageInteger(key, def = 1080) {
	const value = getStorage(key);
	if (!integerRegex.test(value)) {
		return def;
	}

	return parseInt(value, 10);
}

function setStorageInteger(key, value) {
	if (typeof (value) !== "number") {
		return;
	}

	value = parseInt(value, 10);
	setStorage(key, value.toString());
}

function setStorageToggle(key, value) {
	localStorage.setItem(key, value ? "true" : "false");
}

function getStorageToggle(key) {
	return localStorage.getItem(key) === "true";
}

function addVideoEntryControls(entry) {
	//access.can(ACCESS_PLAYLIST_CONTROLS)

	//return early if no access
	if (!controlsPlaylist()) {
		return;
	}

	const buttons = [
		{can: controlsPlaylist, fn: createQueueButton},
		{can: canDeleteVideo, fn: createDeleteButton}
	];

	for (const button of buttons) {
		if (button.can()) {
			entry.append(button.fn())
		}
	}
}

function addVideo(data, queue, sanityid) {
	dbg("Adding Video");
	dbg(data);

	// Sanity check
	if (ACTIVE.videoid != sanityid) {
		// DOOR STUCK
		socket.emit("refreshMyPlaylist");
		return;
	}



	const entry = createPlaylistItem(data);
	const dom = document.querySelector('#playlist ul');
	
	if (PLAYLIST.length === 0) {
		PLAYLIST.append(data);
		dom.append(entry);
	} else {
		PLAYLIST.insertAfter(queue ? ACTIVE : PLAYLIST.last, data);

		(queue ? ACTIVE.domobj : PLAYLIST.last.domobj).after(
			entry
		);
	}
	const jq = $(entry);

	data.domobj = jq;

	addVideoEntryControls(entry);

	entry.onDoubleClick = function() {
		if (controlsVideo()) {
			doPlaylistJump($(this))
		}
	}

	highlight(jq[0]);
	recalcStats();
}
function attachAreaEdit(elem, name) {
	if (!canSetAreas()) {
		return;
	}

	/*
	const button = createElement('button', {text: 'Edit', class: 'editBtn'});

	button.addEventListener('hover', () => {
		elem[0].classList.toggle('edit-hover')
	});

	button.addEventListener('click', () => {

	})

	elem[0].insertAfter(
		button
	)
	*/

	var orig = $(elem);
	var editbtn = $('<button>Edit</button>').addClass("editBtn").insertAfter(orig);

	editbtn.hover(function () {
		orig.css("background-image", "url(" + CDN_ORIGIN + "/images/attn.png)");
	}, function () {
		orig.css("background-image", "none");
	});

	editbtn.click(function () {

		var minheight = 100;
		var editor_wrap = $('<div></div>').insertAfter(orig);
		var editor = $('<textarea></textarea>').appendTo(editor_wrap);
		var btndiv = $('<div></div>').appendTo(editor_wrap);
		var okbtn = $('<button>Save</button>').appendTo(btndiv);
		var nobtn = $('<button>Cancel</button>').appendTo(btndiv);

		okbtn.click(function () {
			var newhtml = editor.val();
			editbtn.show();
			orig.show();
			socket.emit("setAreas", {
				content: newhtml,
				areaname: name
			});
			editor_wrap.remove();
		});

		nobtn.click(function () {
			orig.show();
			editbtn.show();
			editor_wrap.remove();
		});

		editor.html(orig.html());
		editor_wrap.height(Math.max(minheight, orig.height()));
		editor_wrap.width(orig.width());
		editor.width(orig.width());
		editor.height(editor_wrap.height() - btndiv.height());
		orig.hide();
		editbtn.hide();

	});
}

function setVidColorTag(domobj, tag, volat) {
	var ct = domobj.querySelector(".colorTag");

	if (!ct) {
		ct = createElement('div', {class: 'colorTag'});
		domobj.prepend(ct);
	}

	ct.classList.toggle('volatile', volat);

	if (tag == false) {
		ct.remove();
	} else {
		ct.classList.remove('shitpost-flag');
		ct.style['background-image'] = 'none';

		let parts = tag.split('/');
		if (parts.length === 1 && parts[0] === 'euro') {
			parts = ['flag', 'europeanunion'];
		}

		switch (parts[0]) {
			case 'flag':
				ct.classList.add('shitpost-flag');
				ct.style['background-image'] = `url(${CDN_ORIGIN}/images/famflags/${parts[1].replace(/\.\//g, '')}.png)`;
				break;
			default:
				ct.style["background-color"] = tag;
				break;
		}
	}
}
function setColorTheme(cssPath) {
	$('#themeCss').remove();
	if (cssPath.length > 0) { $("<link/>").insertAfter("#mainTheme").attr('href', cssPath).attr('rel', 'stylesheet').attr('id', "themeCss"); }
	setStorage("siteThemePath", cssPath);
}
/* Permission Abstractions */
function controlsVideo() {
	return TYPE > 0 && LEADER;
}
function controlsPlaylist() {
	return TYPE > 0 || LEADER;
}
function canColorTag() {
	return TYPE > 0;
}
function canToggleVolatile() {
	return TYPE > 0;
}
function canTempShadowBan() {
	return TYPE >= 2;
}
function canSeeAdminLog() {
	return TYPE >= 2;
}
function canDeleteVideo() {
	return TYPE > 0;
}
function canSetFilters() {
	return TYPE >= 2;
}
function canRandomizeList() {
	return TYPE > 0;
}
function canCreatePoll() {
	return TYPE > 0 || LEADER;
}
function canClosePoll() {
	return canCreatePoll();
}
function canChat() {
	return NAME && TYPE >= -1;
}
function canMoveBerry() {
	return TYPE >= 1;
}
function canKickUser() {
	return TYPE >= 2;
}
function canShadowBan() {
	return TYPE >= 2;
}
function canBan() {
	return TYPE >= 2;
}
function canSetAreas() {
	return TYPE >= 2;
}
/* Video Control */
function videoSeekTo(pos) {
	console.log("Got seek to", secToTime(pos));
	PLAYER.seek(pos);
}
function videoPlay() {
	PLAYER.play();
}
function videoLoadAtTime(vidObj, time) {
	const {
		videoid: id,
		videotype: ptype,
		videolength: length
	} = vidObj;

	//instead of attempt to acquire from players, get from volume manager
	const volume = window.volume.get(ptype);
	const change = VIDEO_TYPE !== ptype;

	if (change) {
		//we need to stop the volume grabbing before removing the player
		window.volume.stop();

		//destroy current and get new one
		[PLAYER, VIDEO_TYPE] = Players.switch(VIDEO_TYPE, ptype);

		//load the actual video
		PLAYER.loadPlayer(id, time, volume, length, vidObj.meta);

		//listen again
		window.volume.listen(PLAYER, ptype);
	} else {
		PLAYER.resetRetries();
		PLAYER.playVideo(id, time, volume, length, vidObj.meta);
	}
}
function videoPause() {
	PLAYER.pause();
}

async function parseVideoURLAsync(url) {
	return new Promise((res, rej) => {
		const match = Videosources.find(reg => reg[2].test(url));

		if (!match) {
			return rej(new Error("Unknown or unsupported source or format"))
		}
	
		const [source, whole, regex, title] = match;
		const matches = url.match(regex);

		let id = whole ? url : matches[1];

		//this is a pain to integrate into a nice package (could with regex)
		if (source === 'dash' && url.includes('watch.cloudflarestream.com')) {
			id = `https://cloudflarestream.com/${id}/manifest/video.mpd`;
		}

		res({id, source, title})
	})
}	

function formatChatMsg(msg, greentext = true) {
	msg = msg.replace(/(http[s]{0,1}:\/\/[^ ]*)/ig, '<a href="$&">$&</a>');
	
	const message = createElement('span', {
		html: msg
	});

	[message, ...message.querySelectorAll('a')].forEach(node => {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer')
	});

	if (greentext && msg.startsWith('>', 0)) {
		message.classList.add('green')
	}

	return message;
}
function detectName(nick, msg) {
	let list = HIGHLIGHT_LIST;
	
	if (nick) {
		list.push(nick);
	}

	return new RegExp(`(${list.join('|')})`, 'gi').test(msg);
}
function tabComplete(elem) {
	var chat = elem.val();
	var tabOptions = elem.data('tabcycle');
	var hasTabOptions = (tabOptions !== undefined && tabOptions != false);
	var result = [];

	if (!tabOptions) {
		var onlyword = /^([^ ]*)$/i;
		var endword = /([^ ]+)$/i;
		var m = chat.match(endword);

		if (!m) {
			return;
		}

		const re = new RegExp(`^${m[1]}.*`, 'i');

		for (const [nick, value] of CHATLIST.entries()) {
			if (re.test(nick)) {
				result.push({nick, lastchat: value.lastMessage})
			}
		}

		//sort to newest to oldest
		result.sort((a, b) => a.lastchat - b.lastchat);

		const sanitize = (str) => {
			str = chat.replace(endword, str);
			str += onlyword.test(chat) ? ": " : " ";

			return str;
		}

		if (result.length == 1) {
			elem.val(sanitize(result[0].nick));
		}
		else if (result.length > 1) {
			elem[0].tabcycle = result.map((usr) => sanitize(usr.nick));
			elem[0].tabindex = 0;

			elem.data('tabcycle', result.map((usr) => sanitize(usr.nick)));
			elem.data('tabindex', 0);

			hasTabOptions = true;
		}
	}

	if (hasTabOptions) {
		elem[0].value = tabOptions[elem[0].tabindex];
		elem[0].tabindex = (elem[0].tabindex + 1) % tabOptions.length;

		const index = elem.data('tabindex');

		elem.val(tabOptions[index]);
		elem.data('tabindex', (index + 1) % tabOptions.length);
	}
}
function revertLoaders() {
	for (const loader of document.querySelectorAll('.loading')) {
		loader.textContent = $(loader).data('revertTxt');
		loader.classList.remove('loading')
	}
}
function highlight(elem) {
	elem.classList.add('highlight');
	
	setTimeout(() => {
		elem.classList.remove('highlight')
	}, 1000)
}

function scrollToPlEntry(index) {
	const viewport = document.querySelector('.viewport');
	const item = playlist.querySelector(`:nth-child(${index + 1}):not(.search-hidden)`)
	
	requestAnimationFrame(() => {
		viewport.scrollTop = item.offsetTop - (item.offsetHeight - item.clientHeight);
	});
}
function smartRefreshScrollbar() {}

function setPlaylistPosition(to) {
	if (ACTIVE.domobj) {
		ACTIVE.domobj[0].classList.remove("active");
	}

	//don't search if the video we are switching to is next
	if (ACTIVE?.next?.videoid === to.video.videoid) {
		ACTIVE = ACTIVE.next;
	} else {
		ACTIVE = PLAYLIST.find((video) => video.videoid === to.video.videoid);
	}

	if (ACTIVE.domobj) {
		ACTIVE.domobj[0].classList.add("active");

		if (getStorage("plFolAcVid")) {
			let index = ACTIVE.domobj.index();
			scrollToPlEntry(index > 2 ? index - 2 : index);
		}
	}
}

function showChat(channel) {
	ACTIVE_CHAT = channel;

	/*
	document.body.setAttribute(
		'channel', channel
	);
	*/

	$('.chatbuffer').addClass('inactive');
	$('#chattabs .tab').removeClass('active');
	$('#chatpane').removeClass('admin');

	switch (channel) {
		case 'admin':
			$('#adminbuffer').removeClass('inactive');
			$('#admintab').removeClass('newmsg squee').addClass('active');
			$('#chatpane').addClass('admin');
			if (ADMIN_NOTIFY) {
				clearInterval(ADMIN_NOTIFY);
				$('#chatpane').removeClass('squee');
			}
			break;
		default:
			$('#chatbuffer').removeClass('inactive');
			$('#maintab').removeClass('newmsg squee').addClass('active');
			if (MAIN_NOTIFY) {
				clearInterval(MAIN_NOTIFY);
				$('#chatpane').removeClass('squee');
			}
			break;
	}

	scrollBuffersToBottom();
}

function cycleChatTab(left) {
	// TODO - if we add more tabs, we'll want to redo this to be smarter and actually account
	// for left/right difference. For now, with 2 tabs, they'll be functionally identical.
	if (TYPE >= 1) {
		if (ACTIVE_CHAT == 'main') {
			showChat('admin');
		}
		else if (ACTIVE_CHAT == 'admin') {
			showChat('main');
		}
	}
}

function notifyNewMsg(channel, isSquee, isRcv) {
	if (ACTIVE_CHAT === channel) {
		return;
	}

	const tabs = new Map([
		['main', {el: document.querySelector('#maintab'), notify: MAIN_NOTIFY}],
		['admin', {el: document.querySelector('#admintab'), notify: ADMIN_NOTIFY}],
	]);

	if (!tabs.has(channel)) {
		return;
	}

	const tab = tabs.get(channel);

	tab.el.classList.add('newmsg');
	tab.el.classList.toggle('squee', isSquee);

	if (!isSquee || (channel === "admin" && isRcv)) {
		return;
	}

	if (tab.notify) {
		clearInterval(tab.notify);
	}

	tab.notify = setInterval(() => {
		if (isRcv) {
			tab.el.closest('#chatpane')?.classList.toggle('squee');
		}
		tab.el.classList.toggle('squee');
	}, 1000);

	if (getStorage('notifyMute')) {
		NOTIFY.play();
	}
}

function sortPlaylist(data) {
	const [from, to] = PLAYLIST.multiple([data.from, data.to]);

	if (from.videoid != data.sanityid) {
		// DOOR STUCK
		return socket.emit("refreshMyPlaylist");
	}

	setVal("sorting", true);

	PLAYLIST.remove(from);

	if (data.to > data.from) {
		PLAYLIST.insertAfter(to, from);
	} else {
		PLAYLIST.insertBefore(to, from);
	}

	from.domobj.hide("blind", function () {
		if (data.to > data.from) {
			from.domobj.insertAfter(to.domobj).show("blind");
		} else {
			from.domobj.insertBefore(to.domobj).show("blind");
		}
	});

	setVal("sorting", false);
}

function filterAdminLog() {
	const buffer = $('#logBuffer');
	const parent = buffer.parent();

	const filters = {
		nick: parent.find('#logNickFilter > :selected').text(),
		type: parent.find('#logTypeFilter > :selected').text()
	}

	const body = buffer.find('tbody');
	let selector = '';

	if (filters.nick !== 'All modmins') {
		selector += `[nick="${filters.nick}"]`;
	} 

	if (filters.type !== 'All types') {
		selector += `[type=${filters.type}]`;
	}

	body.children().addClass('filtered');
	body.children(selector).removeClass('filtered');
}

function unfuckPlaylist() {
	if ($('#playlist ul li:not(.history)').length != PLAYLIST.length) {
		// Playlist and DOM are out of sync - refresh
		newPlaylist($("#plul"));
		socket.emit("renewPos");
	}
}


function secondsToHuman(seconds) {
	seconds = parseInt(seconds);

	if (seconds > 60) {
		const minutes = Math.floor(seconds / 60);
		const finalSeconds = seconds - (minutes * 60);
		return `${minutes.toString().padStart(2, "0")}:${finalSeconds.toString().padStart(2, "0")}`;
	}

	return `${seconds} second${seconds != 1 ? "s" : ""}`;
}
