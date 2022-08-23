class Ticker {
	constructor(interval) {
		this.ticks = 0;
		this.lastTick = new Date().getTime();

		this.callbacks = [];

		this.ticker = setInterval(() => {
			
		}, interval);
	}
}