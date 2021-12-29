const mysql = require("mysql");
const config = require("../../bt_data/db_info");

const { ServiceBase } = require("../base");
const { events } = require("../log");

exports.DatabaseService = class extends ServiceBase {
	constructor(services) {
		super(services);
		this.log = services.log;
	}

	init() {
		super.init();

		this.log.info(events.EVENT_DB_CONNECTION, "starting database connection to {user}@{host}:{port}", {
			host: config.host,
			port: config.post,
			user: config.mysql_user,
		});

		this.connection = mysql.createConnection({
			host: config.host,
			port: config.post,
			user: config.mysql_user,
			password: config.mysql_pass,
		});

		this.connection.on("error", function(err) {
			this.log.error(
				events.EVENT_DB_CONNECTION,
				"the database connection threw an error: attempting reconnect",
				{},
				err,
			);
			setTimeout(function() {
				this.init();
			}, 1000);
		});

		this.connection.query(`use ${config.database}`);
	}

	query(queryParts, ...params) {
		return new Promise((res, rej) => {
			const sql = queryParts.join(" ? ");
			this.connection.query(sql, params, (err, result, fields) => {
				if (err) {
					rej(err);
					this.log.error(events.EVENT_DB_QUERY, 'query "{sql}" failed', { sql }, err);
					return;
				}

				res({ result, fields });
			});
		});
	}

	async upsert(table, condition, pairs) {
		if (!pairs || pairs[0].length !== pairs[1].length) {
			throw new Error("Either no data to save/update or mismatch between fields and values");
		}

		const fillers = {
			fields: pairs[0].join(','),
			values: Array(pairs[0].length).fill('?').join(',')
		};

		return this.query(
			[`insert into ${table} (${fillers.fields}) values (${fillers.values}) on duplicate key update ${condition}`],
			...pairs[1],
		);
	}

	async update(table, condition, pairs) {
		if (!pairs || pairs[0].length !== pairs[1].length) {
			throw new Error("Either no data to save/update or mismatch between fields and values");
		}

		const fields = pairs[0].map((field, index) => `${field} = ${pairs[1][index]}`).join(',');

		return this.query(
			[`update ${table} set ${fields} where ${condition}`],
			[]
		);
	}

	async misc(name) {
		const {result} = await this.query(['select * from misc where name = ?'], name);

		if (result.length > 1) {
			throw new Error(`Multiple values found with same name: ${name}`);
		}

		return result[0]?.value ?? "";
	}
};
