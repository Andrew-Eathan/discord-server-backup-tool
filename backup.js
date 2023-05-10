import SQL from "./sql.js"
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import readline from "readline-sync";
import { attachmentKeys, attachmentsKeysArr, embedKeys, messageKeys, messageKeysArr } from "./data.js";

let spins = ['/', '-', '\\', '|']
let spin_idx = 0
function print(data, inplace) {
    process.stdout.write(`${spins[spin_idx++]} ${data}           \r` + (inplace ? "" : "\n"))
	spin_idx = spin_idx % spins.length;
}

function makePlaceholders(amount) {
	return Array(amount).fill("?").join(", ");
}

function sleep(time) {
	return new Promise(resolve => setTimeout(resolve, time));
}

const Clean4FS = str => str.toLowerCase().replaceAll(/\_/gm, "").replaceAll(/[^a-zA-Z0-9\(\)\s\-]+/gm, "_");

// these are later modified to fetch a low/high size based on the image size
let membersFetchOptions = { format: "png" }
let emojiFetchOptions = { format: "png" }
let roleFetchOptions = { format: "png" }

async function GetLinkData(link) {
	let res = await fetch(link).catch(e => null)
	if (!res) return null;

	let buffer = await res.buffer()
	return buffer
}

export async function OpenDatabase(folder, name) {
    print("Opening " + name + " database...")
    return await SQL.OpenFile(path.resolve(folder, name + ".db"))
}

// helper functions for backup info database
export async function GetBackupInfo(db, key) {
	let data = await db.Execute("SELECT * FROM backupinfo WHERE key = ?", key);
    if (data == null) return null;
    else return data.value;
}
export async function SetBackupInfo(db, key, value) {
    console.log("INSERT INTO backupinfo (key, value) VALUES (?, ?)", [key, value])
	return await db.Execute("INSERT INTO backupinfo (key, value) VALUES (?, ?)", [key, value]);
}
async function IsChannelSaved(db, id) {
	let data = await db.Execute("SELECT * FROM finishedchannels WHERE id = ?", id);
	console.log("chansave", id, data)
	return data != null;
}
async function MarkChannelAsSaved(db, id) {
	await db.Execute("INSERT INTO finishedchannels (id) VALUES (?)", id);
	console.log("chanmarksave", id)
}

export default async function startBackup(bot, selGuild, selChans, allCategories, allChannels, options, saveFolder) {
	// explanation:
	// we start with no previous chunk so we fetch the first ~100 messages (api limit)
	// then we find the ID of the earliest message in this chunk and assign it to prevChunk so we know where to continue next
	// we continue this until we hit <100 messages in a fetch, which means we've reached the channel's end
	// then continue to the next channel, and go on until the end, where we save this information

    if (options.save_members_images == "y")
        membersFetchOptions.size = 128;

    if (options.save_emoji_images == "y")
        emojiFetchOptions.size = 128;

    if (options.save_role_images == "y")
        roleFetchOptions.size = 128;

    let folder = saveFolder ?? Clean4FS(selGuild.name)

    if (!saveFolder)
        if (fs.existsSync(folder))
        {
            let add = 1;

            while (fs.existsSync(folder + "_" + add)) {
                add++;
            }

            folder = folder + "_" + add;
            fs.mkdirSync(folder)
        } else fs.mkdirSync(folder);

	// populate backup info
	let auxdb = await OpenDatabase(folder, "backupinfo");
	await auxdb.Execute("CREATE TABLE IF NOT EXISTS backupinfo (key text, value text)");
	await auxdb.Execute("CREATE TABLE IF NOT EXISTS finishedchannels (id text)");
	await auxdb.Execute("CREATE TABLE IF NOT EXISTS channels (id text)");

	let alreadyPopulated = await GetBackupInfo(auxdb, "alreadyPopulated");
	if (alreadyPopulated == null) {
		for (let chan of selChans) {
			console.log("INSERT INTO channels (id) VALUES (?)", chan.id)
			await auxdb.Execute("INSERT INTO channels (id) VALUES (?)", chan.id)
		}

		await SetBackupInfo(auxdb, "options", JSON.stringify(options))
		await SetBackupInfo(auxdb, "serverId", selGuild.id)
		await SetBackupInfo(auxdb, "alreadyPopulated", "yes")
		print("Populated backup info.")
	} else print("Backup info already populated, using a loaded backup.")

	// the rest
    let messages = await OpenDatabase(folder, "messages");

    let serverinfo = false;
    let roles = false;
    let members = false;
    if (options.save_server_data) {
        serverinfo = await OpenDatabase(folder, "serverinfo")
        roles = await OpenDatabase(folder, "roles")
        members = await OpenDatabase(folder, "members")
    }

    if (serverinfo) {
        await SaveServerInfo(auxdb, serverinfo, selGuild, allChannels, allCategories, options);
		await SaveRoles(auxdb, roles, selGuild, options);
		await SaveMembers(auxdb, members, selGuild, options);
    }

    await SaveMessages(auxdb, messages, selChans, options);

	print("Backup complete!\nWaiting 3 seconds for all remaining async SQL queries to finish and then quitting. Your backup is available in the folder \"" + folder + "\"!")

	await sleep(3000);
	process.exit();
}

async function FetchAllMessages(messages, channel, saveOptions, messagesSaved) {
	let prevID = "";
	let fetchAmount = 100
	let options = { limit: fetchAmount };

	// if a fetch fails this is set to true, if one succeeds it's set to false
	// if a fetch fails for the first time, it'll print the error and wait for the error to go away or be resolved
	// it also waits for player input to abort retrying and skip to the next channel if possible
	let didPreviousFetchFail = false;
	let skipped = false;
	let msgCount = 0;

	while (true) {
		if (skipped) break;

		let fetchStart = Date.now();
		let msgs = await channel.messages.fetch(options).catch(async err => {
			if (!didPreviousFetchFail) {
				didPreviousFetchFail = true;
				print("");
				print("[ ERROR ]");
				print(`Couldn't fetch messages from channel "${channel.name}" (TYPE: ${channel.type})`)
				print(`Error message: ${err}`);
				print(`Automatically retrying to fetch messages every 10 seconds. To skip this channel, type "skip".`);
			} else {
				await sleep(1000);
				return "retry";
			}

			new Promise((resolve, reject) => {
				let data = readline.question("> ").toString();
				if (skipped) {
					resolve();
					return;
				}
				else {
					if (data != "skip") {
						print("If you want to cancel the fetch retry, type skip.");
					} else {
						skipped = true;
						print("Skipped.");
					}
					resolve();
				}
			})

			await sleep(10000);
			return "retry";
		})

		if (msgs == "retry") continue;

        // so that the fetch continues from this ID
        if (msgs.size > 0) {
			let earliestMessage;
			let earliestDate = Infinity;

			for (let pairs of msgs) {
				let msg = pairs[1];

				if (msg.createdTimestamp < earliestDate) {
					earliestDate = msg.createdTimestamp;
					earliestMessage = msg;
				}
			}

            options.before = earliestMessage.id
        }

		msgCount += msgs.size;

        for (let pairs of msgs) {
			let msg = pairs[1];
			let savekeys = [];
			let savedata = [];

			savekeys.push("authorId"); savedata.push(msg.author.id);
			savekeys.push("channelId"); savedata.push(msg.channel.id);

			savekeys.push("referenceChannelId"); savedata.push(msg.reference?.channelId);
			savekeys.push("referenceGuildId"); savedata.push(msg.reference?.guildId);
			savekeys.push("referenceMessageId"); savedata.push(msg.reference?.messageId);

			for (let key of messageKeysArr) {
				if (typeof msg[key] != "undefined") {
					savekeys.push(key);
					savedata.push(msg[key]);
				}
			}

			for (let attpairs of msg.attachments) {
				let att = attpairs[1];

				messages.Execute(`INSERT INTO attachments (${attachmentsKeysArr.join(", ")}) VALUES (${makePlaceholders(attachmentsKeysArr.length)})`, [
					att.id,
					att.contentType,
					att.description,
					att.duration,
					att.ephemeral,
					att.width,
					att.height,
					att.name,
					att.size,
					att.spoiler
				])
			}

			savekeys.push("attachmentCount"); savedata.push(msg.attachments.size);
			savekeys.push("embedCount"); savedata.push(msg.embeds.length);
			savekeys.push("activity"); savedata.push(msg.activity != null ? JSON.stringify(msg.activity) : null);

			if (msg.hasThread) {
				savekeys.push("threadId"); savedata.push(msg.thread?.id);
			}

			// this code is kinda ugly but uh
			if (options.save_embeds)
				for (let embed of msg.embeds) {
					messages.Execute(`INSERT INTO embeds VALUES (${makePlaceholders(embedKeys.split(",").length)})`, [
						msg.id,
						embed.author != null ? JSON.stringify(embed.author) : null,
						embed.color,
						embed.description,
						embed.fields != null ? JSON.stringify(embed.fields) : null,
						embed.footer != null ? JSON.stringify(embed.footer) : null,
						embed.hexColor,
						embed.image != null ? JSON.stringify(embed.image) : null,
						embed.length,
						embed.provider != null ? JSON.stringify(embed.provider) : null,
						embed.thumbnail != null ? JSON.stringify(embed.thumbnail) : null,
						embed.timestamp,
						embed.title,
						embed.url,
						embed.video != null ? JSON.stringify(embed.video) : null
					])
				}

			messages.Execute(`INSERT INTO messages (${savekeys.join(", ")}) VALUES (${makePlaceholders(savekeys.length)})`, savedata);
        }

		let totalText = " - " + (messagesSaved + msgCount);
		if (saveOptions.total_message_count != -1) {
			let percentage = ((messagesSaved + msgCount) / saveOptions.total_message_count * 100).toFixed(2)
			totalText += `/${saveOptions.total_message_count} (${percentage}%)`
		}

		totalText += " total in server"

		if (msgs.size < fetchAmount) {
			print(`Channel "${channel.name}" finished backup! (messages: ${msgCount})${totalText}`)
			break;
		}

		print(`Channel "${channel.name}": ${msgCount} messages fetched${totalText}`, false);

		let timeSinceStart = Date.now() - fetchStart;
		if (timeSinceStart > options.save_interval * 1000)
			continue;
		else await sleep(options.save_interval * 1000 - timeSinceStart);
	}

	return msgCount;
}

async function SaveMessages(auxdb, messages, selChans, options) {
	if ((await GetBackupInfo(auxdb, "savedMessages")) == "yes") {
		print("Skipping message backup, since the loaded backup already did it.");
		return;
	}

    print("Saving messages...");

	await messages.Execute(`CREATE TABLE IF NOT EXISTS messages (${messageKeys})`);
	await messages.Execute(`CREATE TABLE IF NOT EXISTS attachments (${attachmentKeys})`);
	await messages.Execute(`CREATE TABLE IF NOT EXISTS embeds (${embedKeys})`);

	let messagesSaved = 0;

	for (let chan of selChans) {
		let activeThreads = await chan.threads?.fetchActive();
		let archivedThreads = await chan.threads?.fetchArchived({
			fetchAll: true,
			limit: 100
		});

		if (activeThreads)
			for (let pairs of activeThreads.threads) {
				if (await IsChannelSaved(auxdb, pairs[1].id)) {
					print(`Skipping active thread "${pairs[1].name}" from channel #${chan.name} because the loaded backup already has it.`);
					continue;
				}

				print(`Saving active thread "${pairs[1].name}" from channel #${chan.name}`);
				messagesSaved += await FetchAllMessages(messages, pairs[1], options, messagesSaved);
				MarkChannelAsSaved(auxdb, pairs[1].id);
			}

		if (archivedThreads)
			for (let pairs of archivedThreads.threads) {
				if (await IsChannelSaved(auxdb, pairs[1].id)) {
					print(`Skipping archived thread "${pairs[1].name}" from channel #${chan.name} because the loaded backup already has it.`);
					continue;
				}

				print(`Saving archived thread "${pairs[1].name}" from channel #${chan.name}`);
				messagesSaved += await FetchAllMessages(messages, pairs[1], options, messagesSaved);
				MarkChannelAsSaved(auxdb, pairs[1].id);
			}

		if (await IsChannelSaved(auxdb, chan.id)) {
			print(`Skipping channel #${chan.name} because the loaded backup already has it.`);
			continue;
		}

		print(`Saving messages from channel #${chan.name}`);
		messagesSaved += await FetchAllMessages(messages, chan, options, messagesSaved);
		MarkChannelAsSaved(auxdb, chan.id);
	}

	//await SetBackupInfo(auxdb, "savedMessages", "yes");
}

async function SaveRoles(auxdb, roles, selGuild, options) {
	if ((await GetBackupInfo(auxdb, "savedRoles")) == "yes") {
		print("Skipping role backup, since the loaded backup already did it.");
		return;
	}

	print("Saving roles...");

	// dont forget to create a new table with members list for each role
	await roles.Execute("CREATE TABLE IF NOT EXISTS roles (id text, name text, createdTimestamp integer, hoist integer, mentionable integer, tags string, position integer, rawPosition integer, hexColor text, unicodeEmoji text, icon text)");

    let droles = await selGuild.roles.fetch();
    let idx = 0;
    for (let pairs of droles) {
        let role = pairs[1];
        let icondata = null;

        if (options.save_role_images != "n") {
            let url = role.iconURL(roleFetchOptions);
            if (url) {
                icondata = await GetLinkData(url);
            }
        }

        await roles.Execute("INSERT INTO roles (id, name, createdTimestamp, hoist, mentionable, tags, position, rawPosition, hexColor, unicodeEmoji, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            role.id,
            role.name,
            role.createdTimestamp,
            role.hoist,
            role.mentionable,
            JSON.stringify(role.tags),
            role.position,
            role.rawPosition,
            role.hexColor,
            role.unicodeEmoji,
            icondata
        ])

        let qualitytext = "";

        switch (options.save_roles_images) {
            case "y": qualitytext = " (low-res image)"; break;
            case "f": qualitytext = " (high-res image)"; break;
        }

        print(`${++idx}/${droles.size} roles saved${qualitytext} - ${role.name ?? "unnamed"}`)
    }

    print("Saved roles!")
	await SetBackupInfo(auxdb, "savedRoles", "yes");
}

async function SaveMembers(auxdb, members, selGuild, options) {
	if ((await GetBackupInfo(auxdb, "savedMembers")) == "yes") {
		print("Skipping member backup, since the loaded backup already did it.");
		return;
	}

	print("Saving members...")

	await members.Execute("CREATE TABLE IF NOT EXISTS members (id text, username text, discriminator text, tag text, nickname text, createdTimestamp integer, bot integer, system integer, communicationDisabledTimestamp integer, displayHexColor text, joinedTimestamp integer, pending integer, premiumSinceTimestamp integer, avatar blob, banner blob)")

	let savekeys = [
		"id",
		"username",
		"discriminator",
		"tag",
		"nickname",
		"createdTimestamp",
		"bot",
		"system",
		"communicationDisabledTimestamp",
		"displayHexColor",
		"joinedTimestamp",
		"pending",
		"premiumSinceTimestamp"
	]

	let gmembers = await selGuild.members.fetch();
	let idx = 0

	for (let pairs of gmembers) {
		let member = pairs[1];
		let savedata = [];

		for (let savekey of savekeys) {
			let data = member[savekey];
			if (typeof data == "undefined" || typeof data == "null") data = member?.user[savekey];

			savedata.push(data);
		}

		if (options.save_members_images != "n") {
			// force fetch so that the avatar and banner is available
			await member?.user.fetch();

			let avatarurl = member?.user.avatarURL(membersFetchOptions)
			if (avatarurl) {
				let rawimage = await GetLinkData(avatarurl);
				savedata.push(rawimage);
			} else savedata.push(null);

			let bannerurl = member?.user.bannerURL(membersFetchOptions)
			if (bannerurl) {
				let rawimage = await GetLinkData(bannerurl);
				savedata.push(rawimage);
			} else savedata.push(null);
		} else {
			savedata.push(null);
			savedata.push(null);
		}

		await members.Execute(`INSERT INTO members (${savekeys.join(", ")}, avatar, banner) VALUES (${makePlaceholders(savedata.length)})`, savedata);

        let qualitytext = "";

        switch (options.save_members_images) {
            case "y": qualitytext = " (low-res image)"; break;
            case "f": qualitytext = " (high-res image)"; break;
        }

        print(`${++idx}/${gmembers.size} members saved${qualitytext} - ${member?.user?.tag ?? "unnamed"}`)
	}

	print("Saved members!")
	await SetBackupInfo(auxdb, "savedMembers", "yes");
}

async function SaveServerInfo(auxdb, serverinfo, selGuild, allChannels, allCategories, options) {
	if ((await GetBackupInfo(auxdb, "savedServerInfo")) == "yes") {
		print("Skipping server backup, since the loaded backup already did it.");
		return;
	}

	print("Saving server information...")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS serverinfo (type text, data text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS bans (id text, user text, reason text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS invites (code text, temporary integer, maxAge integer, uses integer, maxUses integer, inviterId integer, createdAt integer, expiresAt integer, url text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS emojis (id text, name text, animated integer, authorId text, createdAt integer, identifier text, requiresColons integer, url text, image blob)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS channels (name text, type text, id text, parentId text, position integer, rawPosition integer, createdAt integer, nsfw integer, lastMessageId text, topic text, rateLimitPerUser integer, bitrate integer, rtcRegion text, userLimit integer)")

	print("Saving server settings...");

	// save server-specific info
	let svsave = {}
	let sv_savekeys = [
		"afkChannelId",
		"afkTimeout",
		"createdTimestamp",
		"description",
		"explicitContentFilter",
		"verificationLevel",
		"defaultMessageNotifications",
		"id",
		"maximumBitrate",
		"maximumMembers",
		"maximumPresences",
		"maxStageVideoChannelUsers",
		"maxVideoChannelUsers",
		"memberCount",
		"mfaLevel",
		"name",
		"nameAcronym",
		"nsfwLevel",
		"ownerId",
		"partnered",
		"preferredLocale",
		"premiumProgressBarEnabled",
		"premiumSubscriptionCount",
		"premiumTier",
		"publicUpdatesChannelId",
		"rulesChannelId",
		"systemChannelId",
		"verificationLevel",
		"verified",
		"widgetChannelId",
		"widgetEnabled"
	]

	try {
		let vanityData = await selGuild.fetchVanityData();
		svsave["vanityURLCode"] = vanityData.code;
		svsave["vanityURLUses"] = vanityData.uses;
	} catch(e) {
		print("Couldn't save vanity invite data, server probably doesn't have a custom invite. (" + e + ")");
	}

	for (let savekey of sv_savekeys) {
		svsave[savekey] = selGuild[savekey];
	}

	svsave["features"] = JSON.stringify(selGuild.features);

	let iconurl = selGuild.iconURL({ format: "png" })
	if (iconurl) {
		let rawimage = await GetLinkData(iconurl);
		svsave["icon"] = rawimage;
	}

	let bannerurl = selGuild.bannerURL({ format: "png" })
	if (bannerurl) {
		let rawimage = await GetLinkData(bannerurl);
		svsave["banner"] = rawimage;
	}

	let discoveryurl = selGuild.discoverySplashURL({ format: "png" })
	if (discoveryurl) {
		let rawimage = await GetLinkData(discoveryurl);
		svsave["discoverySplash"] = rawimage?.toString("base64");
	}

	try {
		let bans = await selGuild.bans.fetch();

		for (let id in bans) {
			await serverinfo.Execute("INSERT INTO bans (id, user, reason) VALUES (?, ?, ?)", [
				id,
				bans[id].user,
				bans[id].reason
			]);
		}
	} catch(e) {
		print("Couldn't save bans list, your account probably doesn't have the permission to see them. (" + e + ")");
	}

    print("Saving emojis...")
	let emojis = await selGuild.emojis.fetch()
    let idx = 0;
	for (let pairs of emojis) {
		let emoji = pairs[1];
		let imagedata = null;

		if (options.save_emoji_images != "n") {
            let suffix = options.save_emoji_images == "y" ? "?size=64" : ""
			imagedata = await GetLinkData(emoji.url + suffix)
        }

		await serverinfo.Execute("INSERT INTO emojis (id, name, animated, authorId, createdAt, identifier, requiresColons, url, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			emoji?.id, // why are all of these nullable wtf discord
			emoji?.name,
			emoji?.animated,
			emoji?.author?.id,
			emoji?.createdTimestamp,
			emoji.identifier, // except this?? what
			emoji?.requiresColons,
			emoji?.url,
			imagedata
		]);

        let qualitytext = "";

        switch (options.save_emoji_images) {
            case "y": qualitytext = " (low-res)"; break;
            case "f": qualitytext = " (high-res)"; break;
        }

        print(`${++idx}/${emojis.size} emojis saved${qualitytext} - :${emoji?.name ?? "unnamed"}:`)
	}

	try {
		let invites = await selGuild.invites.fetch();

		// indexed by code
		for (let code in invites) {
			let invite = invites[code];

			await serverinfo.Execute("INSERT INTO invites (code, temporary, maxAge, uses, maxUses, inviterId, createdat, expiresat, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
				invite.code,
				invite.temporary,
				invite.maxAge,
				invite.uses,
				invite.maxUses,
				invite.inviterId,
				invite.createdAt,
				invite.expiresat,
				invite.url
			])
		}
	} catch (e) {
		print("Couldn't save invites, your account probably doesn't have the permission to see them. (" + e + ")");
	}

	for (let k in svsave) {
		await serverinfo.Execute("INSERT INTO serverinfo (type, data) VALUES (?, ?)", [k, svsave[k]]);
	}

	print("Saved server settings!");

	// save list of channels and each of the channels' data
	for (let pairs of allChannels) {
		let ch = pairs[1];

		print("Saving settings for #" + ch.name)

		let savekeys = [];
		let savedata = [];

		savekeys.push("name"); savedata.push(ch.name);
		savekeys.push("type"); savedata.push(ch.type);
		savekeys.push("id"); savedata.push(ch.id);
		savekeys.push("parentId"); savedata.push(ch.parentId);
		savekeys.push("position"); savedata.push(ch.position);
		savekeys.push("rawPosition"); savedata.push(ch.rawPosition);
		savekeys.push("createdAt"); savedata.push(ch.createdAt);
		savekeys.push("nsfw"); savedata.push(ch.nsfw ? 1 : 0);
		savekeys.push("topic"); savedata.push(ch.topic);
		savekeys.push("lastMessageId"); savedata.push(ch.lastMessageId);

		switch (ch.type) {
			case "GUILD_TEXT": {
				savekeys.push("rateLimitPerUser"); savedata.push(ch.rateLimitPerUser);
			} break;
			case "GUILD_VOICE": {
				savekeys.push("bitrate"); savedata.push(ch.bitrate);
				savekeys.push("rtcRegion"); savedata.push(ch.rtcRegion);
				savekeys.push("userLimit"); savedata.push(ch.userLimit);
			} break;
		}

		await serverinfo.Execute(`INSERT INTO channels (${savekeys.join(", ")}) VALUES (${makePlaceholders(savedata.length)})`, savedata)
	}

	print("Saved channels!")

	let lookupCategories = {}
	for (let cat of allCategories) {
		lookupCategories[cat.id] = cat;
	}
	for (let ch of allChannels) {
		if (ch.parentId && !selCategories[ch.parentId] && lookupCategories[ch.parentId]) {
			selCategories[ch.parentId] = lookupCategories[ch.parentId];
		}
	}

	print("Saving categories...");

	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS categories (name text, type text, id text, position integer, rawposition integer, created integer)")

	for (let cat of Object.values(allCategories)) {
		await serverinfo.Execute("INSERT INTO categories (name, type, id, position, rawposition, created) VALUES (?, ?, ?, ?, ?, ?)", [
			cat.name, cat.type, cat.id, cat.position, cat.rawPosition, cat.createdAt
		])
	}

	print("Saved all server-related info!");
	await SetBackupInfo(auxdb, "savedServerInfo", "yes");
}
