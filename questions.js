import readline from "readline-sync"
import { cmdGetNumber, cmdGetString } from "./util.js"
import { chosen_options, localedata } from "./data.js"
import startBackup from "./backup.js"

function isValid(val) {
	return val != null && typeof val != "undefined"
}

export let selGuild = null;
export let selChans = []

export default async bot => {
	bot.on("ready", async _ => {
		console.log("Loaded in as " + bot.user.tag + "!")

		await bot.guilds.fetch();
		let dguilds = bot.guilds.cache;
		let list = []
		let selguilds = []

		console.log("Select a guild from your list! Type the number to the left of its name.")
		let k = 0;
		dguilds.forEach(guild => {
			k++;
			console.log(`${k}: ${guild.name} (${guild.members.cache.size} member(s))`)
			list[k] = guild
		})

		selGuild = list[cmdGetNumber(val => isValid(list[val]))]

		console.log(`Selected guild! (${selGuild.name})`);
		console.log()
		console.log("Next, select the channels you want to backup!")
		console.log("- Type the numbers next to a channel's name to select it for backup. (ex. 1-7, where 1 is category number and 7 is channel number)")
		console.log("- Add ! before the numbers above to exclude it from the list of selectable channels, if you want!")
		console.log("- Type \"all\" to select all of the channels in this guild.")
		console.log("- Type \"all (category number)\" to select all of the channels in a category!")
		console.log("- Type \"done\" when you are done selecting channels, to move onto the next step.")
		console.log()

		await selGuild.channels.fetch();

		let fancyChList = {} // future me, organise this array like this:
		let fancyCatList = []
		// category 1
		// - channel 1
		// - channel 2
		// category 2
		// - channel 1

		selGuild.channels.cache.forEach(ch => {
			switch (ch.type) {
				case "GUILD_TEXT": {
					let key = ch?.parentId ?? "noparent"
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
				let chans = fancyChList[cat.id]
				console.log(`category ${i + 1}: ${cat.name} (${chans.length} channel(s))`)

				for (let j = 0; j < chans.length; j++) {
					console.log(`- ${i + 1}-${j + 1}: #${chans[j].name}`)
				}
			}

			if (logChan != null) {
				console.log(`Added channel #${logChan.name} to list`)
				logChan = null
			}

			console.log()
			let key = cmdGetString(val => {
				let args = val.split(/\s+/g)
				let case1 = args.length == 1 && isValid(getch(val))
				let case2 = args.length == 2 && (Number(args[1]) == Number(args[1])) && args[0] == "all"
				let case3 = args.length == 1 && args[0] == "all"

				return case1
					|| case2
					|| case3
					|| args[0] == "done";
			})

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
					chans.splice(0, chans.length).forEach(chan => selChans.push(chan))
				}
				else
				{
					// add all channels in all categories
					for (let keyx in fancyChList) {
						let chans = fancyChList[keyx]
						chans.splice(0, chans.length).forEach(chan => selChans.push(chan))
					}

					console.log("Selected all channels!")
				}
			}
			else if (key.split("-").length > 1)
			{
				let chan = getch(key)
				selChans.push(chan[0])
				fancyChList[chan[1]].splice(chan[2], 1)
				logChan = chan[0]
			}

			doneChSel = key == "done" || fancyChList.length == 0;
		}

		console.log(selChans.length + " channels selected!")
        console.log("Now, specify some options for the backup process.")
        console.log("Type y/n, or an option depending on the question:")

        Object.keys(chosen_options).forEach(key => {
            let option = chosen_options[key]
            console.log(option.text);

            while (true) {
                let answer = cmdGetString(val => {
                    if (!option.not_precise && !option.accepted.includes(val)) return false;
                    return true;
                })

                if (answer == "") {
                    chosen_options[key] = option.default;
                    break;
                }

                process_answer:
                {
                    switch (option.type) {
                        case "bool":
                            chosen_options[key] = answer == "y" ? true : false
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

                            chosen_options[key] = num
                        break;
                        default:
                            chosen_options[key] = answer
                        break;
                    }
                    break;
                }
            }
        })

        console.log("Your options:")
        console.log(chosen_options)

        console.log()
        console.log("Backup will begin in 3 seconds...")

        setTimeout(_ => startBackup(bot, selGuild, selChans, chosen_options), 3000)
	})
}
