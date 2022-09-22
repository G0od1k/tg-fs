const fs = require("fs")
const path = require("path")

Object.defineProperty(Array.prototype, "chunk", {
	value: function (chunkSize) {
		var temporal = []

		for (var i = 0; i < this.length; i += chunkSize) {
			temporal.push(this.slice(i, i + chunkSize))
		}

		return temporal
	},
})

function log(bot, user, msg) {
	console.log(
		`\x1b[36m[${bot.name}]\x1b[0m \x1b[32m[${user.name}]\x1b[0m ${msg}`
	)
}

function formatFileSize(number = 0) {
	return Intl.NumberFormat(`en`, {
		notation: `compact`,
		style: `unit`,
		unit: `byte`,
		unitDisplay: `narrow`,
	}).format(number)
}

function verify(msg, bot, cmd) {
	if (bot.cfg.users[msg.chat.id] === undefined) {
		bot.sendMessage(msg.chat.id, bot.cfg.msg.accessDenied)
		log(bot.cfg, { name: msg.chat.id }, bot.cfg.msg.accessDenied)
		return true
	}
	if (cmd) {
		if (!bot.cfg.users[msg.chat.id][cmd]) {
			bot.sendMessage(msg.chat.id, bot.cfg.msg.accessDenied)
			log(
				bot.cfg,
				bot.cfg.users[msg.chat.id],
				`\x1b[33m[${cmd}]\x1b[0m ` + bot.cfg.msg.accessDenied
			)
			return true
		}
	}
	return false
}

function icon(pth, cfg) {
	const stat = fs.statSync(pth)

	let icon = cfg.defaultFileIcon

	for (i of Object.keys(cfg.icons)) {
		if (RegExp(cfg.icons[i], `i`).test(path.parse(pth).ext)) {
			icon = i
			continue
		}
	}

	return stat.isDirectory() ? cfg.defaultDirIcon : icon
}

function resolve(user, msg, cfg) {
	user.path ??= cfg.home

	let acc = true

	cfg.excludePath.concat(user.excludePath ?? []).forEach((x) => {
		acc &&= !new RegExp(x, "i").test(path.resolve(user.path, msg.text))
	})

	user.includePath?.forEach((x) => {
		acc ||= new RegExp(x, "i").test(path.resolve(user.path, msg.text))
	})

	user.path = acc ? path.resolve(user.path, msg.text) : user.path

	log(cfg, user, user.path)
}

module.exports = { log, formatFileSize, verify, icon, resolve }
