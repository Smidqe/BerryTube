
(function($){
	$.fn.timeOut = function(duration,callback) {
		return this.each(function() {
			var me = $(this);
			me.css('position','relative');
			me.css('cursor','pointer');
			var resolution = 100;
			var height = me.height();
			var d = height / duration * resolution;
			var timer = $('<div/>').appendTo(me);
			timer.css('position','absolute');
			timer.css('background',me.css('color'));
			timer.css('bottom','0');
			timer.addClass("timerTicker");
			timer.height(height);
			timer.width(me.width());
			var x = 0;
			function timeOut(){
				clearInterval(x);
				if(callback)callback();
				timer.remove();
				me.unbind('click');
				me.css('cursor','default');
			}
			var x = setInterval(function(){
				height -= d;
				if(height <= 0){
					timeOut();
				} else {
					timer.height(height);
				}
			},resolution);
			$(this).click(function(){
				timeOut();
			});
			console.log(height);
		});
	};
})(jQuery);

function confirmClick(node, cb) {
	const hasText = node.firstChild.tagName === 'SPAN';
	const fn = (e) => {
		if (!node.contains(e.target)) {
			return;
		}

		let classes = node.classList;

		if (classes.contains('confirm')) {
			if (hasText) {
				node.firstChild.textContent = node.firstChild.oldText;
			}
			
			cb();
		}

		classes.toggle('confirm');

		setTimeout(() => {
			classes.remove('confirm');
		}, 3000);
	}

	if (hasText) {
		node.firstChild.oldText = node.firstChild.textContent;
	}

	return fn;
}

(function ($) {
	$.fn.superSelect = function (data) {
		return this.each(function () {
			const $this = $(this);
			const $dropdown = $("<div/>").attr("id", "dd-jquery").appendTo("body");

			$(data.options).each(function (_i, $option) {
				$dropdown.append(
					$("<div />").addClass("super-select__option").append(
						$($option)
							.clone()
							.click(function () {
								if (data.callback)
									data.callback($option);

								$dropdown.remove();
							})));
			});

			$dropdown
				.addClass("super-select")
				.css({ top: $this.offset().top, left: $this.offset().left })
				.show("blind");
		});
	};
})(jQuery);

(function($){
	$.fn.dialogWindow = function(data) {

		var parent = $('body');
		var myData = {
			title: "New Window",
			uid: false,
			offset:{
				top:0,
				left:0
			},
			onClose: false,
			center:false,
			toolBox:false,
			initialLoading:false,
			scrollable:false,
			...data
		};

		//Tweak data
		myData.title = myData.title.replace(/ /g,'&nbsp;');

		//get handle to window list.
		var windows = $(parent).data('windows');
		if(typeof windows == "undefined"){
			$(parent).data('windows',[]);
			windows = [];
		}

		// Remove old window if new uid matches an old one.
		if (myData.uid != false) {
			const win = windows.find(win => win.data('uid') === myData.uid);

			if (win) {
				win.close();
				console.warn(
					'closing!'
				)
				//prevent double close
				$(document).unbind("mouseup.rmWindows");
			}
		}

		// Create Window
		var newWindow = $('<div/>').appendTo(parent);
		newWindow.addClass("dialogWindow");
		if (myData.scrollable) {
			newWindow.addClass('scrollableDialog');
		}
		newWindow.data('uid',myData.uid);
		newWindow.css('z-index','999');
		newWindow.close = function(){
			var windows = $(parent).data('windows');
			let index = windows.indexOf(this);

			if (index !== -1) {
				windows.splice(index,1);
			}
			
			$(this).fadeOut('fast',function(){
				$(this).remove();
			});
			if(myData.onClose)myData.onClose();
		};
		newWindow.setLoaded = function(){
			$(newWindow).find(".loading").remove();
		};

		newWindow.refreshWindowOffset = function(){
			if(myData.center){
				newWindow.center();
			} else {
				const margin = 8;
		        const offset = myData.offset;
		        const diaSize = {
		            height: newWindow.height() + margin,
		            width: newWindow.width() + margin
		        };

		        const win = $(window);
		        const scroll = {
		            top: win.scrollTop(),
		            left: win.scrollLeft()
		        };
		        const winSize = {
		            height: win.height(),
		            width: win.width()
		        };

		        if ( offset.top + diaSize.height > scroll.top + winSize.height )
		            offset.top = scroll.top + winSize.height - diaSize.height;

		        if ( offset.left + diaSize.width > scroll.left + winSize.width )
		            offset.left = scroll.left + winSize.width - diaSize.width;

				newWindow.offset(offset);
			}
		};

		windows.push(newWindow);

		if (myData.toolBox) {
			$(document).bind("mouseup.rmWindows",function (e) {
				var container = newWindow;

				if (container.has(e.target).length === 0) {
					container.close();
					$(document).unbind("mouseup.rmWindows");
				}

				console.warn('closing!')
			});
		}

		if(!myData.toolBox){
			// Toolbar
			var toolBar = $('<div/>').addClass("dialogToolbar").prependTo(newWindow);
			
			interact(toolBar[0]).draggable({
				inertia: false,
				listeners: {
					start (event) {
						if (!event.target.parentNode.position) {
							event.target.parentNode.position = [0, 0];
						}
						
						document.body.classList.add('dragging');
					},
					move (event) {
						let parent = event.target.parentNode;
						let [x, y]  = parent.position;

						parent.position = [
							x + event.dx,
							y + event.dy
						];

						parent.style.transform =
						`translate(${parent.position[0]}px, ${parent.position[1]}px)`
					},
					end () {
						document.body.classList.remove('dragging')
					}
				}
			})
			
			// Title
			var titleBar = $('<div/>').addClass("dialogTitlebar").appendTo(toolBar).html(myData.title);

			// Close Button
			var closeBtn = $('<div/>').addClass("close").appendTo(toolBar);
			closeBtn.click(function(){
				newWindow.close();
			});

			//break
			$('<div/>').css("clear",'both').appendTo(toolBar);
		}

		var contentArea = $('<div/>').appendTo(newWindow).addClass("dialogContent");
		contentArea.window = newWindow;

		// Handle block for loading.
		if(data.initialLoading){
			$('<div/>').addClass("loading").prependTo(newWindow);
		}

		newWindow.refreshWindowOffset();
		newWindow.fadeIn('fast', function() {
			newWindow.refreshWindowOffset();
		});

		return contentArea;
	};
})(jQuery);

jQuery.fn.center = function () {
	

	requestAnimationFrame(() => {
		const win = $(window);
		this.css("position","absolute");
		this.css("top", Math.max(0, ((win.height() - this.outerHeight()) / 2) + win.scrollTop()) + "px");
		this.css("left", Math.max(0, ((win.width() - this.outerWidth()) / 2) + win.scrollLeft()) + "px");
	})

    return this;
};

function whenExists(objSelector,callback){
	var guy = document.querySelectorAll(objSelector);
	if(!guy){
		setTimeout(function(){
			whenExists(objSelector,callback);
		},100);
	} else {
		callback($(guy));
	}
}

function getVal(name){
	return window.flags.get(name);
}
function setVal(name,val){
	return window.flags.set(name, val);
}

function waitForFlag(flagname,callback){
	var flag = getVal(flagname);
	if(!flag){
		setTimeout(function(){
			waitForFlag(flagname,callback);
		},100);
	} else {
		callback();
	}
}

function waitForNegativeFlag(flagname, callback) {
	var flag = getVal(flagname);
	if (flag) {
		setTimeout(function() {
			waitForNegativeFlag(flagname,callback);
		}, 100);
	}
	else {
		callback();
	}
}

function onceFunction(fn) {
	let called = false;
	return function(){
		if (!called) {
			called = true;
			fn.apply(this, arguments);
		}
	};
}

/*
This function is meant to be an somewhat of an replacement to jQuery's $('<element>')
syntax, with minor differences. But vanilla javascript is superior :P
*/
function createElement(kind, attrs = {}, ...children) {
	const element = document.createElement(kind);

	for (const [key, value] of Object.entries(attrs)) {
		switch (key) {
			case 'text': element.textContent = value; break;
			case 'html': element.innerHTML = value; break;
			default:
				element.setAttribute(key, value);
		}
	}

	if (children.length > 0) {
		element.append(
			...children
		);
	}

	return element;
};