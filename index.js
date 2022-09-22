const TelegramBot = require("node-telegram-bot-api")
const fs = require(`fs`)
const path = require(`path`)
const { log, formatFileSize, verify, icon, resolve } = require(`./fun`)

process.env["NTBA_FIX_350"] = 1

require("./config.json").forEach((cfg) => {
	const bot = new TelegramBot(cfg.token, {
		polling: true,
		filepath: false,
	})

	bot.cfg = cfg

	const users = cfg.users

	//? ====================[With Permission]====================

	bot.onText(/\/download/, (msg) => {
		if (verify(msg, bot, "download")) return 0

		const stat = fs.statSync(users[msg.chat.id].path)
		if (stat.size) {
			bot.sendDocument(
				msg.chat.id,
				fs.createReadStream(users[msg.chat.id].path)
			)
		} else {
			bot.sendMessage(msg.chat.id, cfg.msg.emptyFile)
		}
		log(cfg, users[msg.chat.id], `download`)
	})

	bot.onText(/\/cat/, (msg) => {
		if (verify(msg, bot, "cat")) return 0

		const stat = fs.statSync(users[msg.chat.id].path)
		const stream = new fs.ReadStream(users[msg.chat.id].path)

		stream.on("readable", function () {
			const data = stream.read(Math.min(4096, stat.size))
			stream.close()

			const text = new TextDecoder()
				.decode(data ?? new Buffer.from(cfg.msg.emptyFile))
				.replace(/&/g, `&amp;`)
				.replace(/</g, `&lt;`)
				.replace(/>/g, `&gt;`)

			bot.sendMessage(msg.chat.id, `<pre>${text}</pre>`, {
				parse_mode: "HTML",
			})
			log(cfg, users[msg.chat.id], `cat`)
		})
	})

	//? ====================[Without Permission]====================

	bot.onText(/\/pwd/, (msg) => {
		if (verify(msg, bot)) return 0

		bot.sendMessage(msg.chat.id, users[msg.chat.id].path)
		log(cfg, users[msg.chat.id], `pwd`)
	})

	bot.onText(/\/home/, (msg) => {
		users[msg.chat.id].path = cfg.home
		msg.text = `.`
		log(cfg, users[msg.chat.id], `home`)
		bot.emit(`message`, msg)
	})

	bot.onText(/\/root/, (msg) => {
		if (verify(msg, bot)) return 0

		let result = ``
		let tpath = users[msg.chat.id].path

		while (tpath != path.parse(tpath).dir) {
			tpath = path.parse(tpath).dir
			result = `\`${tpath}\`\n` + result
		}

		bot.sendMessage(msg.chat.id, result, { parse_mode: `Markdown` })
		log(cfg, users[msg.chat.id], `root`)
	})

	bot.onText(/^(?<!\/)([^\/\n].*)/, (msg) => {
		if (verify(msg, bot)) return 0

		const user = users[msg.chat.id]

		resolve(user, msg, cfg)

		let stat = fs.statSync(user.path)

		if (stat.isDirectory()) {
			;[".."]
				.concat(fs.readdirSync(user.path))
				.chunk(30)
				.forEach((x, i, z) => {
					bot.sendMessage(
						msg.chat.id,
						`\`${user.path}\`\n\`=[${`${i + 1}/${z.length}]`.padEnd(
							34,
							"="
						)}\`\n` +
							x
								.map((x) => {
									const stat = fs.statSync(
										path.resolve(user.path, x)
									)

									return (
										icon(path.resolve(user.path, x), cfg) +
										`\`${x}${
											stat.isDirectory() ? `/` : ``
										}\``
									)
								})
								.join(`\n`),
						{
							parse_mode: "Markdown",
							reply_markup: {
								remove_keyboard: true,
							},
						}
					)
				})
		} else {
			bot.sendMessage(
				msg.chat.id,
				`=== *${path.basename(
					user.path
				)}* ===\n\nSize: ${formatFileSize(stat.size)}\nPath: \`${
					user.path
				}\``,
				{
					parse_mode: "Markdown",
					reply_markup: {
						keyboard: [
							["../"],
							...["download", "cat"].map((x) => [
								user[x] ? `/` + x : ``,
							]),
						],
						resize_keyboard: true,
					},
				}
			)
		}
	})
})
