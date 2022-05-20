let lastPollCountdown = null;

const integerRegex = /^\d+$/;

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
			var nickCheck = new RegExp(d.nickMatch, d.nickParam);
			var chatCheck = new RegExp(d.chatMatch, d.chatParam);
			if (nick.match(nickCheck)) { //console.log("matched name");
				if (msg.match(chatCheck)) { //console.log("matched chat");
					// Perform Action
					actionChain.push({ action: d.actionSelector, meta: d.actionMetadata });
				}
				if ($.trim(d.chatReplace).length > 0) { //console.log("doing a replace");
					msg = msg.replace(chatCheck, d.chatReplace);
				}
			}
		}
		var a = '';
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
			$(`#chatlist li[nick="${name}"]`).removeClass('ignored');
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
	
	const main = $('<div>', {class: 'controlWindow'}).append(
		//TODO: Move the margin into a css file instead of inlining
		$('<p>', {text: `Applying ban to ${nick}:`}),
		$('<select>').append(
			//add options
			...options.map(option => $('<option>', {text: option.text}).data('time', option.length)),
			//add permaban if applicable
			TYPE >= 2 ? $('<option>', {text: 'Permanent'}).data('time', -1) : undefined,
		),
		//add buttons
		$('<div>').append(
			$('<div>', {class: 'button', text: 'Cancel'}),
			$('<div>', {class: 'button', text: 'Apply'}).data('apply', true),
		)
	).appendTo(parent);

	//add event listeners
	main.on('click', 'div.button', (ev) => {
		if ($(ev.currentTarget).data('apply')) {
			socket.emit('ban', { 
				nicks: [nick], 
				ips: [$('li.' + nick).attr('ip')], 
				duration: main.find(':selected').data('time') 
			});
		}

		parent.window.close();
	});

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
			var validationRegex = (TYPE >= 1 ? /^[a-zA-Z0-9_+*?. ]+$/ : /^[a-zA-Z0-9_]+$/);
			if (input.val().match(validationRegex) != null) {
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

			var nameList = '';
			var first = true;
			for (var i = 0; i < HIGHLIGHT_LIST.length; i++) {
				if (first) {
					first = false;
				}
				else {
					nameList += ';';
				}
				nameList += HIGHLIGHT_LIST[i];
			}
			localStorage.setItem('highlightList', nameList);
		}
		highlight(saveBtn[0]);
	});

	for (var i in HIGHLIGHT_LIST) {
		addName(HIGHLIGHT_LIST[i]);
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
				var chk = $(this);
				var chkNode = chk.data('node');
				if (chkNode) {
					if (chk.is(':checked')) {
						chkNode.enabled = true;
						setStorage(chkNode.setting, true);
						loadPlugin(chkNode);
						warnText.text('');
					}
					else {
						chkNode.enabled = false;
						setStorage(chkNode.setting, false);
						warnText.text('The plugin(s) you have disabled will be unloaded the next time you refresh.');
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
function windowFocused() {
	if (CHAT_NOTIFY) {
		clearInterval(CHAT_NOTIFY);
		document.title = WINDOW_TITLE;
	}
}
function windowBlurred() {

}
function windowShown() {
	scrollBuffersToBottom();
}
function windowHidden() {

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
	elem = PLAYLIST.first;
	dbg(PLAYLIST.first.videolength);
	for (var i = 0; i < PLAYLIST.length; i++) {
		x += (elem.videolength);
		elem = elem.next;
	}
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
	var s = videoGetState();
	if (controlsVideo()) {
		if (LAST_EMIT_STATE != s) {
			socket.emit("forceStateChange", {
				state: s
			});

			LAST_EMIT_STATE = s;
		}
	}
}
function handleACL() {

	try {
		dbg("ACL INIT:");
		const body = document.body;

		body.classList.toggle('admin', TYPE === 2);
		body.classList.toggle('assistant', TYPE === 1);
		body.classList.toggle('berry', LEADER);

		if (isRegisteredUser()) {
			const me = document.querySelector('#headbar .rememberMe');
			const headbar = me.closest('#headbar');
			// If it doesn't exist we're a cached login.
			// If it exists but is unchecked clear our local storage
			// If it exists and is checked, cache login credentials.
			if (me) {
				if (me.checked) {
					var data = $(headbar).data('loginData');
					if (typeof localStorage != 'undefined' && data) {
						localStorage.setItem('nick', data.nick);
						localStorage.setItem('pass', data.pass);
					}
				}
				else {
					if (typeof localStorage != 'undefined') {
						localStorage.removeItem('nick');
						localStorage.removeItem('pass');
					}
				}
			}
			

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
			const canDelete = canDeleteVideo();

			controls[0].style.display = canQueue ? 'block' : 'none';

			const playlist = controls[0].parentNode.querySelector('ul');

			playlist.classList.toggle('controlsOn', canQueue);

			if (canQueue && !playlist.classList.contains('previouslyEnabled')) {
				playlist.classList.add("previouslyEnabled");
				Sortable.create(playlist, {
					onStart: function (event) {
						console.warn(event)
					},
					onEnd: function (event) {
						var data = {
							from: event.oldIndex,
							to: event.newIndex,
							sanityid: event.item.video.videoid
						};
						dbg(data);
						socket.emit("sortPlaylist", data);
					}
				});

				for (const node of playlist.childNodes) {
					if (!node.firstChild?.classList.contains('.requeue')) {
						node.append(createQueueButton(node));
					}

					if (canDelete && !node.lastChild?.classList.contains('.delete')) {
						node.append(createDeleteButton(node));
					}
				}
			}

			if (playlist.classList.contains('previouslyEnabled')) {
				Sortable.get(playlist).disabled = canQueue;
			}

			if (!canQueue) {
				playlist.querySelectorAll('.requeue, .delete').forEach(node => node.remove());
			}

			if (ACTIVE && ACTIVE.domobj) {
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
function loginError(data) {
	$('#headbar .loginError').text(data.message);
}
function isRegisteredUser() {
	if (TYPE >= 0) {
		return true;
	}
	return false;
}
function sendChatMsg(msg, elem) {
	//prevent sending messages without a nick
	if (!canChat())
		return;

	if (msg.trim().length > 0) {
		HISTORY_POS = 0;
		HISTORY.reverse();
		HISTORY.push(msg);
		HISTORY.reverse();
		HISTORY[HISTORY_POS] = "";
		if (HISTORY.length > HISTORY_SIZE) {
			HISTORY.splice(HISTORY_SIZE, 1);
		}

		meta = {};
		if (NAMEFLAUNT) { meta.nameflaunt = NAMEFLAUNT; }
		meta.flair = MY_FLAIR_ID;
		meta.channel = ACTIVE_CHAT;

		handleSpamChecks(function () {
			socket.emit("chat", {
				msg: msg,
				metadata: meta
			});
			elem.val("");
		});
	}
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

		const wrap = createElement('div', {class: 'msgwrap'});
		const message = createElement('div');

		wrap.append(
			message
		);

		if (typeof (nick !== "undefined")) {
			wrap.setAttribute('nick', nick);
		}

		if (IGNORELIST.includes(nick) && !metadata.nameflaunt) {
			return;
		}

		if (IGNORE_GHOST_MESSAGES && data.ghost) {
			return;
		}

		//TODO: Replace this with information in CHATLIST (faster and easier)
		const user = CHATLIST.get(nick);
		const isSquee = metadata.isSquee || (nick != NAME && NAME.length > 0 && detectName(NAME, msgText));
		
		let includeTimestamp = false;

		if (user) {
			wrap.classList.add(
				...user.type
			);
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
				let inner = createElement('span');

				if (data.msg.emote === 'poll') {
					inner.innerHTML = `${nick} has created a new poll: "${msgText}"`;
				} else {
					inner.innerHTML = msgText;
				}

				message.append(
					inner
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

				const table = createElement('table');
				const row = createElement('tr');
				const thing = createElement('td');

				row.append(
					thing
				)

				thing.append(
					createElement('span', {class: 'nick', text: `${nick}:`}),
					createElement('span', {class: 'msg'})
				)

				thing.lastChild.innerHTML = `${msgText} drink!`;

				if (data.msg.multi) {
					row.append(
						createElement(
							'td',
							{},
							createElement('span', {class: 'multi', text: `${data.msg.multi}x`})
						)
					)
				}

				table.append(
					row
				)
				message.append(
					table
				)

				break;
			}
			case false: {
				if (to[0].lastMsgRecvBy != nick) {
					let name = createElement('span', {class: 'nick'});

					if (metadata.nameflaunt) {
						name.classList.add('flaunt', `level_${data.msg.type}`)
					}

					if (metadata.flair) {
						name.textContent = nick;
						name.append(
							createElement('div', {class: `flair flair_${metadata.flair}`}),
							':'
						);
					} else {
						name.textContent = `${nick}:`
					}

					message.append(
						name
					)

					includeTimestamp = true;
				}
				let inner = createElement('span', {class: 'msg'});

				inner.append(
					formatChatMsg(msgText)
				);
				
				message.append(
					inner
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

		var d = new Date(data.msg.timestamp);

		if (user) {
			user.lastMessage = d.getTime();
		}

		if (includeTimestamp) {
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
	if (!window.flags.get('focused')) {
		if (getStorage('notifyMute') == 0) {
			NOTIFY.play();
		}
		clearInterval(CHAT_NOTIFY);
		CHAT_NOTIFY = setInterval(function () {
			if (document.title == WINDOW_TITLE) {
				document.title = NOTIFY_TITLE;
			}
			else {
				document.title = WINDOW_TITLE;
			}
		}, 1000);
	}
}

function manageDrinks(drinks) {
	console.warn(
		drinks
	)

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
function toggleChatMode() {
	var chatbuffer = $(".chatbuffer");
	var chatinput = $("#chatinput");
	var chatlist = $("#chatlist");
	var chattabs = $('#chattabs');
	var rcvOverlay = $("#rcvOverlay");
	var connectedCountWrapper = $("#connectedCountWrapper");
	if (chatinput.hasClass("wide")) {
		chatbuffer.removeClass("wide");
		chatinput.removeClass("wide");
		chattabs.removeClass('wide');
		rcvOverlay.removeClass("wide");
		connectedCountWrapper.removeClass("wide");
		chatlist.show();
	} else {
		chatbuffer.addClass("wide");
		chatinput.addClass("wide");
		chattabs.addClass('wide');
		rcvOverlay.addClass("wide");
		connectedCountWrapper.addClass("wide");
		chatlist.hide();
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
	if (!window.flags.get('focused') || getStorageToggle("storeAllSquees")) {
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

		if (typeof postEmoteEffects != 'undefined') {
			postEmoteEffects(newMsg);
		}

		var mailMsgDiv = $('#mailMessageDiv');
		mailMsgDiv.append(newMsg);
		while (mailMsgDiv.children().length > 10) {
			mailMsgDiv.children().first().remove();
		}
		$('#mailButtonDiv').addClass('new');
	}
}
function plSearch(term) {
	if (typeof term == "undefined" || term.match(/^$/) || term.length < 3) {
		$("#playlist").removeClass("searching");
		$("#plul li").removeClass("search-hidden");
		$("#plul li.history").remove();
		$("#plul li .title").removeAttr("active-offset");
		scrollToPlEntry(ACTIVE.domobj.index());
	} else {
		if (TYPE >= 1 || LEADER) {
			socket.emit('searchHistory', { search: term });
		}

		$("#playlist").addClass("searching");
		$("#plul li").addClass("search-hidden");
		$("#plul li.active").removeClass("search-hidden");

		const rx = new RegExp(term, 'i');
		const activeIndex = ACTIVE.domobj.index();

		elem = PLAYLIST.first;
		for (var i = 0; i < PLAYLIST.length; i++) {
			let name = decodeURI(elem.videotitle);
			
			if (name.match(rx)) {
				dbg(name);
				var index = i - activeIndex;
				if (index < 0) {
					index = '(' + index + ') ';
				}
				else if (index > 0) {
					index = '(+' + index + ') ';
				}
				else {
					index = '';
				}
				elem.domobj.removeClass("search-hidden").find(".title").attr("active-offset", index);
			}
			elem = elem.next;
		}
		scrollToPlEntry(0);
	}
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

	const $poll = $(".poll.active");

	// the ranked poll module code re-creates the results DOM
	// so we have to re-apply our emotes when it is updated
	$poll.find(".render-emotes").each(function () {
		const $this = $(this);
		if ($this.data("bem-processed")) {
			return;
		}

		$this.data("bem-processed", true);
		$this.html(Bem.applyEmotesToStr($this[0].innerText));
		Bem.postEmoteEffects($this);
	});
}
function updatePollAutoClose($poll, data) {
	const $progress = $poll.find(".poll-auto-close__progress-bar-inner");
	const $timeLeft = $poll.find(".poll-auto-close__time-left");
	const $autoClose = $poll.find(".poll-auto-close");

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

				$progress.css("width", `${percent * 100}%`);
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
function setCookie(c_name, value, exdays) {
	// Kept for backwards compatability. Update references when found.
	console.log("Old setCookie ref, update please!");
	return setStorage(c_name, value);
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

function getCookie(c_name) {
	// Kept for backwards compatability. Update references when found.
	console.log("Old getCookie ref, update please!");
	return getStorage(c_name);
	/*
	var i,x,y,ARRcookies=document.cookie.split(";");
	for (i=0;i<ARRcookies.length;i++){
		x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
		y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
		x=x.replace(/^\s+|\s+$/g,"");
		if(x==c_name){
			return unescape(y);
		}
	}
	*/
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
	entry.onDoubleClick = function() {
		if (controlsVideo()) {
			doPlaylistJump($(this))
		}
	}
	jq.dblclick(function () {
		if (controlsVideo()) {
			doPlaylistJump($(this));
		}
	});

	highlight(jq[0]);
	revertLoaders();
	recalcStats();
}
function attachAreaEdit(elem, name) {
	if (!canSetAreas()) {
		return;
	}

	/*
	const editBtn = createElement('button', {text: 'Edit', class: 'editBtn'})
	const buttons = createElement('div', {}, 
		createElement('button', {class: 'areaSave', text: 'Save'}),
		createElement('button', {class: 'areaCancel', text: 'Cancel'})
	),
	const editor = createElement('div', {class: 'areaEditWrap'},
		createElement('textarea'),
		buttons
	);

	buttons[0].onclick = function() {
		const textarea = this.parentNode.previousSibling;

		socket.emit("setAreas", {
			content: textarea.value,
			areaname: name
		});

		elem[0].classList.remove('editing');
		this.closest('.areaEditWrap')?.remove();
	}

	buttons[1].onclick =  function() {
		elem[0].classList.remove('editing');
		this.closest('.areaEditWrap')?.remove();
	}

	editBtn.onclick = function() {
		elem[0].append(
			editor
		);

		elem[0].classList.add('editing');
		editor.firstChild.innerHTML = elem[0].innerHTML;
	}

	*/

	if (canSetAreas()) {
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
}
function setVidVolatile(pos, isVolat) {
	elem = PLAYLIST.first;
	for (var i = 0; i < pos; i++) {
		elem = elem.next;
	}

	elem.volat = isVolat;
	if (isVolat) {
		$(elem.domobj).addClass("volatile");
	} else {
		$(elem.domobj).removeClass("volatile");
	}
	console.log(elem.domobj);
}
function setVidColorTag(pos, tag, volat) {
	elem = PLAYLIST.first;
	for (var i = 0; i < pos; i++) {
		elem = elem.next;
	}
	_setVidColorTag(elem.domobj[0], tag, volat);
}
function _setVidColorTag(domobj, tag, volat) {
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
	if (TYPE > 0) {
		return true;
	}
	return LEADER;
}
function canColorTag() {
	if (TYPE > 0) {
		return true;
	}
	return false;
}
function canToggleVolatile() {
	if (TYPE > 0) {
		return true;
	}
	return false;
}
function canTempShadowBan() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canSeeAdminLog() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canDeleteVideo() {
	if (TYPE > 0) {
		return true;
	}
	return false;
}
function canSetFilters() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canRandomizeList() {
	if (TYPE > 0) {
		return true;
	}
	return false;
}
function canCreatePoll() {
	if (TYPE > 0) {
		return true;
	}
	return LEADER;
}
function canClosePoll() {
	return canCreatePoll();
}
function canChat() {
	return NAME && TYPE >= -1;
}
function canMoveBerry() {
	if (TYPE >= 1) {
		return true;
	}
	return false;
}
function canKickUser() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canShadowBan() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canBan() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
function canSetAreas() {
	if (TYPE >= 2) {
		return true;
	}
	return false;
}
/* Video Control */
function videoPlayNext() {
	if (controlsPlaylist()) {
		socket.emit("playNext");
	}
}
function videoGetTime(callback) {
	PLAYER.getTime(callback);
}
function videoGetState() {
	return PLAYER.getVideoState();
}
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
/* Utilities */
function parseVideoURL(url, callback) {
	console.log(url);
	var m = url.match(new RegExp("youtube\\.com/watch.*?[&?]v=([a-zA-Z0-9_-]{11})")); if (m) { callback(m[1], "yt"); return; }
	var m = url.match(new RegExp("youtu\\.be/([a-zA-Z0-9_-]{11})")); if (m) { callback(m[1], "yt"); return; }
	var m = url.match(new RegExp("i\\.ytimg\\.com/an_webp/([a-zA-Z0-9_-]{11})/")); if (m) { callback(m[1], "yt"); return; }
	var m = url.match(new RegExp("dailymotion.com/(?:embed/)?video/([a-zA-Z0-9]+)")); if (m) { callback(m[1], "dm"); return; }
	var m = url.match(new RegExp("dai.ly/([a-zA-Z0-9]+)")); if (m) { callback(m[1], "dm"); return; }
	var m = url.match(new RegExp("clips\\.twitch\\.tv/([A-Za-z0-9-]+)")); if (m) { callback(m[1], "twitchclip", m[1]); return; }
	var m = url.match(new RegExp("twitch\\.tv/[A-Za-z0-9]+/clip/([A-Za-z0-9-]+)")); if (m) { callback(m[1], "twitchclip", m[1]); return; }
	var m = url.match(new RegExp("twitch\\.tv/((?:videos/)?[A-Za-z0-9]+)")); if (m) { callback(m[1], "twitch", m[1]); return; }
	var m = url.match(new RegExp("^rtmp://")); if (m) { callback(url, "osmf", "~ Raw Livestream ~"); return; }
	var m = url.match(new RegExp("\\.f4m$")); if (m) { callback(url, "osmf", "~ Raw Livestream ~"); return; }
	var m = url.match(new RegExp("vimeo.com/([^&]+)")); if (m) { callback(m[1], "vimeo"); return; }
	var m = url.match(new RegExp("(https?://soundcloud.com/[^/]+/[^/?]+)")); if (m) { callback(m[1], "soundcloud"); return; }
	var m = url.match(new RegExp("(?:videodelivery\\.net|cloudflarestream\\.com)/([a-z0-9]+)")); if (m) { callback(m[1], "cloudflare", "~ Raw Livestream ~"); return; }
	
	var m = url.match(new RegExp("v\\.redd\\.it/([^/]+)")); if (m) {callback(`https://v.redd.it/${m[1]}/DASHPlaylist.mpd`, "reddit", "~ Reddit Video ~"); return; }
	var m = url.match(new RegExp("\\.reddit\\.com/")); if (m) {callback(url, "reddit", "~ Reddit Video ~"); return; }

	var m = url.match(new RegExp("\\.mpd")); if (m) { callback(url, "dash"); return; }
	var m = url.match(new RegExp("\\.m3u8$")); if (m) { callback(url, "hls", "~ Raw Livestream ~"); return; }
	var m = url.match(new RegExp("\\.json[^\\/]*$")); if (m) { callback(url, "manifest"); return; }
	var m = url.match(new RegExp("\\.(?:mp4|m4v|webm|mov)?[^\\/]*$")); if (m) { callback(url, "file"); return; }
	// ppshrug
	callback(url, "yt");
}
function formatChatMsg(msg, greentext) {
	msg = msg.replace(/(http[s]{0,1}:\/\/[^ ]*)/ig, '<a href="$&">$&</a>');
	
	const message = createElement('span');

	message.innerHTML = msg;

	[message, ...message.querySelectorAll('a')].forEach(node => {
		node.setAttribute('target', '_blank');
		node.setAttribute('rel', 'noopener noreferrer')
	});

	if (greentext && message.startsWith('>', 0)) {
		message.classList.add('green')
	}

	return message;
}
function secondsToString(seconds) {

	var minutes = Math.floor(seconds / 60);
	var seconds = Math.floor(seconds % 60);
	var hours = Math.floor(minutes / 60);
	var minutes = Math.floor(minutes % 60);
	var days = Math.floor(hours / 24);
	var hours = Math.floor(hours % 24);

	days = days = days.toString();

	if (hours < 10) {
		hours = "0" + hours.toString();
	} else {
		hours = hours.toString();
	}

	if (minutes < 10) {
		minutes = "0" + minutes.toString();
	} else {
		minutes = minutes.toString();
	}

	if (seconds < 10) {
		seconds = "0" + seconds.toString();
	} else {
		seconds = seconds.toString();
	}

	return days + ":" + hours + ":" + minutes + ":" + seconds;
}
function isMainGameOn() {
	TIME = new Date();
	// Main game runs from 4AM Saturday UTC "to" 10AM Saturday UTC.
	if (
		TIME.getUTCDay() == 6 && // 6 for Saturday
		TIME.getUTCHours() >= 4 &&
		TIME.getUTCHours() < 10
	) {
		return true;
	}
	return false;
}
function timeToMainGame() {
	var WEEK = 604800;
	TIME = new Date();
	GAME = new Date();
	var startDay = 6;
	var startHr = 4;
	var stopHr = 10;

	var dayOffset = 0;
	var day = TIME.getUTCDay();
	while (day != startDay) {
		dayOffset++;
		day++;
		if (day >= 7) {
			day = 0;
		}
	}

	console.log(TIME.getUTCDate() + dayOffset);
	GAME.setUTCDate(TIME.getUTCDate() + dayOffset);
	GAME.setUTCHours(startHr);
	GAME.setUTCMinutes(0);
	GAME.setUTCSeconds(-1);

	var timeUntilGameStarts = (GAME.getTime() / 1000) - (TIME.getTime() / 1000);
	if (timeUntilGameStarts < 0) {
		timeUntilGameStarts += WEEK;
	}

	GAME.setUTCHours(stopHr);

	var timeUntilGameStops = (GAME.getTime() / 1000) - (TIME.getTime() / 1000);
	if (timeUntilGameStops < 0) {
		timeUntilGameStops += WEEK;
	}

	return {
		start: timeUntilGameStarts,
		stop: timeUntilGameStops
	};
}
/*function isMainGameOn(){
	TIME = new Date();
	var gameStartsAt = new Date()
	// Get days to friday.
	var dtf = (5 - TIME.getUTCDay())

	var dow = DATE.getUTCDay()

	if(dow = DATE.getUTCDay()
}*/
function detectName(nick, msg) {
	var list = '';
	if (nick) {
		list += nick;
	}
	for (var i in HIGHLIGHT_LIST) {
		if (list.length > 0) {
			list += '|';
		}
		list += HIGHLIGHT_LIST[i];
	}
	list = '(' + list + ')';
	//list = `(${[nick ?? '', HIGHLIGHT_LIST.join('|')})`;

	return (msg.match(RegExp("(^|[^-a-zA-Z0-9_])" + list + "([^a-zA-Z0-9_]|$)", 'i')) != null);
}
function tabComplete(elem) {
	console.warn('tab')
	var chat = elem.val();
	var tabOptions = elem.data('tabcycle');
	var hasTabOptions = (tabOptions !== undefined && tabOptions != false);
	var result = [];

	if (!hasTabOptions) {
		var onlyword = /^([^ ]*)$/i;
		var endword = /([^ ]+)$/i;
		var m = chat.match(endword);

		if (!m) {
			return;
		}

		const who = m[1];

		var re = new RegExp('^' + who + '.*', 'i');

		for (const [key, value] of CHATLIST.entries()) {
			if (key.match(re)) {
				result.push({nick: key, lastchat: value.lastMessage})
			}
		}

		//sort to newest to oldest
		result.sort((a, b) => a.lastchat - b.lastchat);

		const sanitize = (str) => {
			str = chat.replace(endword, str);
			if (chat.match(onlyword)) {
				str += ": ";
			}
			else {
				str += " ";
			}

			return str;
		}

		if (result.length == 1) {
			elem.val(sanitize(result[0].nick));
		}
		else if (result.length > 1) {
			tabOptions = result.map((usr) => sanitize(usr.nick));

			elem.data('tabcycle', tabOptions);
			elem.data('tabindex', 0);
			hasTabOptions = true;
		}
	}

	if (hasTabOptions) {
		const index = elem.data('tabindex');

		elem.val(tabOptions[index]);
		elem.data('tabindex', (index + 1) % tabOptions.length);
	}
}
function revertLoaders() {
	$('.loading').each(function (key, elem) {
		$(elem).text($(elem).data('revertTxt'));
		$(elem).removeClass('loading');
	});
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

function setPlaylistPosition(to, scroll = false) {
	if (ACTIVE.domobj) {
		ACTIVE.domobj[0].classList.remove("active");
	}

	var elem = PLAYLIST.first;
	let length = PLAYLIST.length;
	let index = 0;

	ACTIVE = PLAYLIST.first;
	for (var i = 0; i < length; i++) {

		//dbg(elem.videoid+" =?= "+to.video.videoid);
		if (elem.videoid == to.video.videoid) {
			ACTIVE = elem;
			index = i;
			break;
		}
		elem = elem.next;
	}

	if (ACTIVE.domobj) {
		ACTIVE.domobj[0].classList.add("active");
	}

	if (getStorage("plFolAcVid") == 1) {
		scrollToPlEntry(index > 2 ? index - 2 : index);
	}
}

function showChat(channel) {
	ACTIVE_CHAT = channel;

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

	/*
	*/
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
	if (ACTIVE_CHAT != channel) {
		var maintab = $('#maintab');
		var admintab = $('#admintab');
		switch (channel) {
			case 'main':
				maintab.addClass('newmsg');
				if (isSquee) {
					if (MAIN_NOTIFY) {
						clearInterval(MAIN_NOTIFY);
					}
					maintab.addClass('squee');
					MAIN_NOTIFY = setInterval(function () {
						if (maintab.hasClass('squee')) {
							maintab.removeClass('squee');
						}
						else {
							maintab.addClass('squee');
						}
					}, 1000);

					if (getStorage('notifyMute') == 0) {
						NOTIFY.play();
					}
				}
				break;
			case 'admin':
				admintab.addClass('newmsg');
				if (isSquee || isRcv) {
					if (ADMIN_NOTIFY) {
						clearInterval(ADMIN_NOTIFY);
					}
					admintab.addClass('squee');
					ADMIN_NOTIFY = setInterval(function () {
						if (admintab.hasClass('squee')) {
							admintab.removeClass('squee');
							$('#chatpane').removeClass('squee');
						}
						else {
							admintab.addClass('squee');
							$('#chatpane').addClass('squee');
						}
					}, 1000);

					if (getStorage('notifyMute') == 0) {
						NOTIFY.play();
					}
				}
				break;
		}
	}
}

function sortPlaylist(data) {
	setVal("sorting", true);
	var elem = PLAYLIST.first;
	var fromelem, toelem;
	for (var i = 0; i < PLAYLIST.length; i++) {
		if (i == data.from) {
			fromelem = elem;
			break;
		}
		elem = elem.next;
	}
	// Sanity check
	if (fromelem.videoid != data.sanityid) {
		// DOOR STUCK
		setVal("sorting", false);
		socket.emit("refreshMyPlaylist");
	}
	else {
		elem = PLAYLIST.first;
		for (var i = 0; i < PLAYLIST.length; i++) {
			if (i == data.to) {
				toelem = elem;
				break;
			}
			elem = elem.next;
		}

		PLAYLIST.remove(fromelem);
		if (data.to > data.from) {
			PLAYLIST.insertAfter(toelem, fromelem);
			fromelem.domobj.hide("blind", function () {
				fromelem.domobj.insertAfter(toelem.domobj).show("blind", function () {
					setVal("sorting", false);
				});
			});
		} else {
			PLAYLIST.insertBefore(toelem, fromelem);
			fromelem.domobj.hide("blind", function () {
				fromelem.domobj.insertBefore(toelem.domobj).show("blind", function () {
					setVal("sorting", false);
				});
			});
		}
	}
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

function refreshDebugDumps() {
	DEBUG_DUMPS = [];
	socket.emit('debugDump');
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
