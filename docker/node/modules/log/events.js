// in server.js we create a logger that forwards all events that begin with "EVENT_ADMIN_" to the mod channel
exports.events = {
	// playlist
	EVENT_VIDEO_CHANGE: "EVENT_VIDEO_CHANGE",
	EVENT_ADMIN_SET_VOLATILE: "EVENT_ADMIN_SET_VOLATILE",
	EVENT_ADMIN_SHATPOST: "EVENT_ADMIN_SHATPOST",
	EVENT_ADMIN_DELETED_VIDEO: "EVENT_ADMIN_DELETED_VIDEO",
	EVENT_ADMIN_ADDED_VIDEO: "EVENT_ADMIN_ADDED_VIDEO",
	EVENT_ADMIN_RANDOMIZED_PLAYLIST: "EVENT_ADMIN_RANDOMIZED_PLAYLIST",
	EVENT_ADMIN_SKIPPED_VIDEO: "EVENT_ADMIN_SKIPPED_VIDEO",
	EVENT_ADMIN_MOVED_VIDEO: "EVENT_ADMIN_MOVED_VIDEO",
	EVENT_ADMIN_FORCED_VIDEO_CHANGE: "EVENT_ADMIN_FORCED_VIDEO_CHANGE",
	EVENT_ADMIN_CLEARED_HISTORY: "EVENT_ADMIN_CLEARED_HISTORY",

	// auth
	EVENT_LOGIN: "EVENT_LOGIN",
	EVENT_REGISTER: "EVENT_REGISTER",
	EVENT_USER_LEFT: "EVENT_USER_LEFT",
	EVENT_ADMIN_SHADOWBAN_TEMP: "EVENT_ADMIN_SHADOWBAN_TEMP",
	EVENT_ADMIN_SHADOWBAN_PERMANENT: "EVENT_ADMIN_SHADOWBAN_PERMANENT",
	EVENT_ADMIN_SHADOWBAN_FORGIVEN: "EVENT_ADMIN_SHADOWBAN_FORGIVEN",
	EVENT_ADMIN_KICKED: "EVENT_ADMIN_KICKED",
	EVENT_ADMIN_BANNED: "EVENT_ADMIN_BANNED",
	EVENT_ADMIN_SET_BERRY: "EVENT_ADMIN_SET_BERRY",
	EVENT_ADMIN_ADD_BERRY: "EVENT_ADMIN_ADD_BERRY",
	EVENT_ADMIN_REMOVE_BERRY: "EVENT_ADMIN_REMOVE_BERRY",
	EVENT_USER_CHANGED_PASSWORD: "EVENT_USER_CHANGED_PASSWORD",
	EVENT_GHOSTED: "EVENT_GHOSTED",
	EVENT_ADMIN_USER_PASSWORD_RESET: "EVENT_ADMIN_USER_PASSWORD_RESET",

	// chat
	EVENT_CHAT: "EVENT_CHAT",
	EVENT_COULD_NOT_CREATE_POLL: "EVENT_COULD_NOT_CREATE_POLL",

	// polls
	EVENT_RUNAWAY_CODE: "EVENT_RUNAWAY_CODE",
	EVENT_ADMIN_CREATED_POLL: "EVENT_ADMIN_CREATED_POLL",
	EVENT_ADMIN_UPDATED_POLL: "EVENT_ADMIN_UPDATED_POLL",
	EVENT_ADMIN_CLOSED_POLL: "EVENT_ADMIN_CLOSED_POLL",
	EVENT_POLL_RESULTS_AVAILABLE: "EVENT_POLL_RESULTS_AVAILABLE",

	// general fuckery
	EVENT_SOCKET: "EVENT_SOCKET",
	EVENT_SOCKET_ACTION_FAILED: "EVENT_SOCKET_ACTION_FAILED",
	EVENT_PROC_UNHANDLED_EXCEPTION: "EVENT_PROC_UNHANDLED_EXCEPTION",
	EVENT_REPL: "EVENT_REPL",
	EVENT_GENERAL: "EVENT_GENERAL", // <- general debug, info or error, not otherwise specified
	EVENT_SERVER_STATUS: "EVENT_SERVER_STATUS",

	// site
	EVENT_ADMIN_APPLY_FILTERS: "EVENT_ADMIN_APPLY_FILTERS",
	EVENT_ADMIN_SET_TOGGLEABLE: "EVENT_ADMIN_SET_TOGGLEABLE",
	EVENT_ADMIN_SET_CSS: "EVENT_ADMIN_SET_CSS",
	EVENT_ADMIN_EDITED_FILTERS: "EVENT_ADMIN_EDITED_FILTERS",
	EVENT_ADMIN_EDITED_AREA: "EVENT_ADMIN_EDITED_AREA",
	EVENT_ADMIN_SET_NOTE: "EVENT_ADMIN_SET_NOTE",

	// database
	EVENT_DB_CONNECTION: "EVENT_DB_CONNECTION",
	EVENT_DB_QUERY: "EVENT_DB_QUERY",

	// video
	EVENT_VIDEO_PAUSEPLAY: "EVENT_VIDEO_PAUSEPLAY",
};
