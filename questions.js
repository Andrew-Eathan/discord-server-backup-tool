import readline from "readline-sync"
import { cmdGetNumber, cmdGetString } from "./util.js"
import { chosen_options } from "./data.js"
import fs from "fs";
import startBackup from "./backup.js"
import { OpenDatabase, GetBackupInfo } from "./backup.js"
import { inspect } from "util"

function isValid(val) {
	return val != null && typeof val != "undefined"
}

export let selGuild = null;
export let selChans = []

export default async bot => {
	bot.on("ready", async _ => {
		console.log("Loaded in as " + bot.user.tag + "!")

		let list = []
		let backup_options = JSON.parse(JSON.stringify(chosen_options))

		console.log("Do you have an unfinished backup? If yes, you can resume it by typing yes.\nTo begin a new server backup process, type no.\n(yes/no)");

		let unfinished = cmdGetString(val => val == "yes" || val == "no");
		if (unfinished == "yes") {
			console.log("Type the path to the folder containing the unfinished SQL backup files, relative to the folder of this script.");
			console.log("If the folder is in the same folder as your script, simply type the folder's name.")

			let folder = cmdGetString(val => {
				if (!fs.existsSync(val)) {
					console.log("No folder found at that path!")
					return false;
				}
				else {
					if (!fs.statSync(val).isDirectory()) {
						console.log("That's a file, i need a folder.")
						return false;
					}

					return true;
				}
			})

			// restore everything
			let auxdb = await OpenDatabase(folder, "backupinfo")
			backup_options = JSON.parse(await GetBackupInfo(auxdb, "options"));
			console.log("Restored options:", backup_options)

			let id = await GetBackupInfo(auxdb, "serverId");
			let guild = await bot.guilds.fetch(id);
			if (guild == null) {
				console.log("Failed to load backup, your account can't access the server from the backup (usually means you aren't in the server) server id: " + id)
				process.exit()
			}

			console.log("Loaded guild from backup: " + guild.name)

			let selChans = []
			let chansDatabase = await auxdb.ExecuteAll("SELECT * FROM channels");
			let fetchedChannels = await guild.channels.fetch();
			for (let ch of chansDatabase) {
				let chan = fetchedChannels.get(ch.id);
				if (chan == null) {
					console.log("A channel from the backup wasn't found on the server. (it was probably either deleted after the backup, or something else failed) channel id: " + ch.id);
					console.log("Skipping this channel.")
					continue;
				}

				console.log("Found channel from backup: " + chan.name + " - type: " + chan.type)
				selChans.push(chan)
			}

			let fancyCatList = []
			fetchedChannels.forEach(channel => {
				if (channel.type == "GUILD_CATEGORY") {
					fancyCatList.push(channel);
				}
			})

			console.log("Starting backup...")
			setTimeout(_ => startBackup(bot, guild, selChans, fancyCatList, fetchedChannels, backup_options, folder), 1000)
			return;
		}

		let dguilds = await bot.guilds.fetch();

		console.log("Select a guild from your list! Type the number to the left of its name.")

		let k = 0;
		for (let pairs of dguilds) {
			k++;
			console.log(`${k}: ${pairs[1].name}`)
			list[k] = pairs[1]
		}

		selGuild = list[cmdGetNumber(val => isValid(list[val]))]
		selGuild = await selGuild.fetch();

		console.log(`Selected guild! (${selGuild.name})`);
		console.log()
		console.log("Next, select the channels you want to backup!")
		console.log("- Type the numbers next to a channel's name to select it for backup. (ex. 1-7, where 1 is category number and 7 is channel number)")
		console.log("- Add ! before the numbers above to exclude it from the list of selectable channels, if you want!")
		console.log("- Type \"all\" to select all of the channels in this guild.")
		console.log("- Type \"all (category number)\" to select all of the channels in a category!")
		console.log("- Type \"done\" when you are done selecting channels, to move onto the next step.")
		console.log()

		let allChannels = await selGuild.channels.fetch();

		let fancyChList = {} // future me, organise this array like this:
		let fancyCatList = []
		// category 1
		// - channel 1
		// - channel 2
		// category 2
		// - channel 1

		fancyCatList.push({ name: "nocategory", id: "nocategory" })

		selGuild.channels.cache.forEach(ch => {
			switch (ch.type) {
				case "GUILD_TEXT":
				case "GUILD_VOICE": {
					let key = ch?.parentId ?? "nocategory"
					fancyChList[key] = fancyChList[key] ?? []
					fancyChList[key].push(ch)
				} break;
				case "GUILD_CATEGORY": {
					fancyCatList.push(ch)
				} break;
			}
		})

		let getch = numcombo => {
			let split = numcombo.split("-")
			if (split.length != 2) {
				return null
			}

			let catid = Number(split[0]) - 1
			let chanid = Number(split[1]) - 1
			let cat = fancyCatList[catid]

			if (!isValid(cat)) return null;
			return [fancyChList[cat.id][chanid], cat.id, chanid]
		}

		let doneChSel = false;
		let logChan = null;
		while (!doneChSel) {
			for (let i = 0; i < fancyCatList.length; i++) {
				let cat = fancyCatList[i]
				let chans = fancyChList[cat.id] ?? {}

				console.log(`category ${i + 1}: ${cat.name} (${chans?.length ?? 0} channel(s))`)

				for (let j = 0; j < chans.length; j++) {
					let accesstext = !chans[j].viewable ? "(HIDDEN, NOT ALLOWED)" : ""
					console.log(`- ${i + 1}-${j + 1}: #${chans[j].name} ${chans[j].type == "GUILD_VOICE" ? "(VOICE CHANNEL)" : ""} ${accesstext}`)
				}
			}

			if (logChan != null) {
				console.log(`${logChan[0] ? "Removed" : "Added"} channel #${logChan[1].name} ${logChan[0] ? "from" : "to"} list`)
				logChan = null
			}

			console.log()
			let key = cmdGetString(pval => {
				let val = pval[0] == "!" ? pval.slice(1) : pval;
				let args = val.split(/\s+/g)
				let channel = getch(val);
				let viewable = channel ? channel[0]?.viewable : true;
				let case1 = args.length == 1 && isValid(channel) && viewable;
				let case2 = args.length == 2 && (Number(args[1]) == Number(args[1])) && args[0] == "all"
				let case3 = args.length == 1 && args[0] == "all"

				if (!viewable)
					console.log("Channel not accessible by the user, please pick another.")

				return case1
					|| case2
					|| case3
					|| args[0] == "done";
			})

			let remove = key[0] == "!"
			if (remove) key = key.slice(1);

			let check = key.split(/\s+/g)
			if (check[0] == "all") {
				if (check.length > 1) {
					let idx = Number(check[1])
					let cat = fancyCatList[idx - 1]

					if (!isValid(cat)) {
						console.log("Invalid category selected!")
						return;
					}

					let chans = fancyChList[cat.id]
					chans.splice(0, chans.length).forEach(chan => {
						if (chan.viewable)
							selChans.push(chan)
						else chans.push(chan)
					})
				}
				else
				{
					// add all channels in all categories
					for (let keyx in fancyChList) {
						let chans = fancyChList[keyx]
						chans.splice(0, chans.length).forEach(chan => {
							if (chan.viewable)
								selChans.push(chan)
							else chans.push(chan)
						})
					}

					console.log("Selected all channels!")
				}
			}
			else if (key.split("-").length > 1)
			{
				let chan = getch(key)
				fancyChList[chan[1]].splice(chan[2], 1)
				logChan = [ remove, chan[0] ]

				if (!remove) {
					selChans.push(chan[0])
				}
			}

			doneChSel = key == "done" || fancyChList.length == 0;
		}

		// remove nocategory
		fancyCatList.shift();

		console.log(selChans.length + " channels selected!")
		console.log()
		console.log("Now, specify some options for the backup process.")
		console.log("Type y/n, or an option depending on the question:")

		Object.keys(backup_options).forEach(key => {
			let option = backup_options[key]
			console.log()
			console.log(option.text);

			while (true) {
				let answer = cmdGetString(val => {
					// allow screwed up numbers, the number handler will check if it's a messed up number
					if (option.type == "number") return true;
					if (!option.not_precise && !option.accepted.includes(val)) return false;
					return true;
				})

				if (answer == "") {
					backup_options[key] = option.default;
					break;
				}

				process_answer:
				{
					switch (option.type) {
						case "bool":
							backup_options[key] = answer == "y" ? true : false
						break;
						case "number":
							let num = Number(answer)
							if (isNaN(num)) {
								console.log("Please type a valid number!")
								break process_answer;
							}
							if (num < option.min || num > option.max) {
								console.log("Number outside allowed range!")
								break process_answer;
							}

							backup_options[key] = num
						break;
						default:
							backup_options[key] = answer
						break;
					}
					break;
				}
			}
		})

		console.log("Your options:")
		console.log(backup_options)

		console.log()
		console.log("Backup will begin in 3 seconds...")

		setTimeout(_ => startBackup(bot, selGuild, selChans, fancyCatList, allChannels, backup_options), 3000)
	})
}
