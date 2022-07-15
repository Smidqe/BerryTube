<!doctype html>
<html lang="en">
<head>
	<?php require("headers.php"); ?>
	<link rel="stylesheet" type="text/css" href="<?= cdn('css/layout-' . LAYOUT . '.css') ?>" />
</head>
<body class="layout_<?= LAYOUT ?>">
	<div id="extras">
		<div class="elem first"><a href="about.php" target="_blank">About</a></div>
	</div>
	<div id="banner"></div>

	<!-- HEADER COUNTDOWN -->
	<div id="countdown-error"></div>
    <table id="countdown-timers">
        <tbody id="countdown-body"></tbody>
        <tfoot>
            <tr>
                <td><a href="https://teamup.com/ksiyi7xykfdvgyocp3" target="_blank" rel="noopener noreferrer">full schedule</a></td>
            </tr>
        </tfoot>
    </table>

	<div class="wrapper">
		<div id="headbar">
		</div>
	</div>
	<?php if (LAYOUT === 'hd') { ?>
		<div id="videobg">
			<div id="videowrap">
				<div id="ytapiplayer">
					Loading&hellip;
				</div>
			</div>
		</div>
	<?php } ?>
	<div id="main" class="wrapper">
		<div id="rightpane">

		</div>
		<div id="leftpane">
			<?php if (LAYOUT === 'compact') { ?>
				<div id="videowrap">
					<div id="ytapiplayer">
						Loading&hellip;
					</div>
				</div>
			<?php } ?>
		</div>
		<div class="clear"></div>
	</div>
	<div class="wrapper">
		<center>
			<b>Theme</b><br>
			<span><a style="color:white" href="?LayoutType=hd">HD</a></span>
			|
			<span><a style="color:white" href="?LayoutType=compact">Regular</a></span>
			<?php if (LAYOUT == 'hd') { ?>
				|
				<span><a style="color:white" id="kiosk" href="#">Kiosk Mode</a></span>
			<?php } ?>
			<?php
				if (date('n') == 6) {
					if ($_COOKIE['no-pride'] !== 'true') {
						$prideCookie = 'no-pride=true; expires=Thu, 01 Jan 2970 00:00:00 GMT';
						$prideText = 'Disable pride month theme';
					} else {
						$prideCookie = 'no-pride=false; expires=Thu, 01 Jan 1970 00:00:00 GMT';
						$prideText = 'Enable pride month theme';
					}
					?>
					<br>
					<a style="color:white" href="#" onclick="document.cookie='<?= $prideCookie ?>; Secure'; location.reload()"><?= $prideText ?></a>
					<?php
				}
			?>
		</center>
	</div>
</body>
</html>
