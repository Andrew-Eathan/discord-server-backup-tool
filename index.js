
console.log("-------------------------------------------")
console.log("|andreweathan's discord server backup tool|")
console.log("|           R  E  W  R  I  T  E           |")
console.log("-------------------------------------------")
console.log()

import { OpenDatabases } from "./sql.js"
import { BackupActive } from "./backup.js"
import Discord from "discord.js-selfbot-v13"
import readline from "readline-sync"
await import ("dotenv/config")

let token = process.env.TOKEN

if (token.length <= 0)
	token = readline.question("Insert token > ");

let bot = new Discord.Client({
	intents: Discord.Intents.ALL, /*[
		1, // guilds
        2, // members
    	4, // guild bans
		256, // presences
		512, // messages
		32768, // message content
	],*/
	checkUpdate: false
});

import questions from "./questions.js"
questions(bot)

bot.login(token);
console.log("Logging in...")

let interrupted = false;
process.on('SIGINT', async function() {
    if (!BackupActive) {
        console.log("Quitting");
        process.exit();
    }

    if (interrupted) process.exit();
    interrupted = true;

	let original = OpenDatabases.length
	console.log("Caught interrupt signal, closing " + original + " open databases...")

	for (let i = original - 1; i >= 0; i--) {
		await OpenDatabases[i].Close();
		console.log(`${original - i} / ${original}`);
	}

	console.log("Done. If you want to resume your backup (if it hasn't finished yet), you can do so later!")
	process.exit();
});
