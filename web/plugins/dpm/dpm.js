
$(function() {
    var startTime = new Date().getTime();
	let dpmCounter = null;

    function doDpm() {
        if (PLAYER.getTime) {
            PLAYER.getTime(function(time) {
				if (time > -1) {
					dpmCounter.textContent = ' DPM: ' + (DRINKS / (time / 60)).toFixed(2);
				} else {
					dpmCounter.textContent = ' DPM: ' + (DRINKS / ((new Date() - startTime) / 60000)).toFixed(2);
				}
            });
        }
        else if (startTime > -1) {
            dpmCounter.textContent = ' DPM: ' + (DRINKS / ((new Date() - startTime) / 60000)).toFixed(2);
        }
        else {
            dpmCounter.textContent = '';
        }
    }

    socket.on('forceVideoChange', function() {
        startTime = new Date().getTime();
    });

    $('<style type="text/css"/>').text('.dpmCounter { font-size: 40px !important; visibility: visible !important; }').appendTo($('head'));
    $('<span/>').addClass('dpmCounter').appendTo($('#drinkWrap'));

	dpmCounter = document.querySelector('.dpmCounter');
    setInterval(doDpm, 1000);
});
