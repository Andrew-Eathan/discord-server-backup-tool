
console.log("-------------------------------------------")
console.log("|andreweathan's discord server backup tool|")
console.log("|           R  E  W  R  I  T  E           |")
console.log("-------------------------------------------")
console.log()

import SQL from "./sql.js"
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