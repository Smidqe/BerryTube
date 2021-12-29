// Init DB settings
const dbcon = {
	host: 'mysql',
	post: 3306,
	mysql_user: 'berrytube',
	mysql_pass: 'berrytube',
	database: process.env.MYSQL_PASSWORD || 'berrytube',
	video_table: 'videos',
	misc_table: 'misc'
};

module.exports = dbcon;
