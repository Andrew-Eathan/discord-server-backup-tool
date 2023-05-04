import SQL from "./sql.js"
import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import Discord from "discord.js-selfbot-v13";
import JSZip from "jszip";
import { message_save_keys } from "./data.js";

let spins = ['/', '-', '\\', '|']
let spin_idx = 0
function print(data, char, inplace) {
    process.stdout.write(`${spins[spin_idx++]} ${data}           \r` + (inplace ? "" : "\n"))
	spin_idx = spin_idx % spins.length;
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

async function OpenDatabase(folder, name) {
    print("Opening " + name + " database...")
    return await SQL.OpenFile(path.resolve(folder, name + ".db"))
}

export default async function startBackup(bot, selGuild, selChans, allCategories, allChannels, options) {
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

    let folder = Clean4FS(selGuild.name)

    if (fs.existsSync(folder))
	{
		let add = 1;

		while (fs.existsSync(folder + "_" + add)) {
			add++;
		}

		folder = folder + "_" + add;
		fs.mkdirSync(folder)
	} else fs.mkdirSync(folder);

    let auxdb = await OpenDatabase(folder, "backupinfo");
    let messages = await OpenDatabase(folder, "messages");

    let serverinfo = false;
    let roles = false;
    let members = false;
    if (options.save_server_data) {
        serverinfo = await OpenDatabase(folder, "serverinfo")
        roles = await OpenDatabase(folder, "roles")
        members = await OpenDatabase(folder, "members")
    }

    let messagecounts = false;
    if (options.save_members) {
        messagecounts = await OpenDatabase(folder, "messagecounts")
    }

    let zip = false;
    if (options.save_readable) {
        zip = new JSZip();
    }

    if (serverinfo) {
        print("Saving server information...")
        await SaveServerInfo(serverinfo, selGuild, allChannels, allCategories, options, zip);
		await SaveRoles(roles, selGuild, options, zip);
		await SaveMembers(members, selGuild, options, zip);
    }

    await SaveMessages(messages, selGuild, selChans, options, zip);
}

async function SaveMessages(messages, selGuild, selChans, options, zip) {
    print("Saving messages...");

	for (let chan in selChans) {
		let savekeys = [];
		let savedata = [];

		for (let i = 0; i < message_save_keys.length; i++) {
			savekeys.push(message_save_keys[i]);
			savedata.push(chan[message_save_keys[i]]);
		}

		savekeys.push("activity", JSON.stringify(chan.activity));

		let qmarks = Array(savekeys.length).fill("?").join(", ");
		await messages.Execute(`CREATE TABLE IF NOT EXISTS ? (${qmarks}) VALUES ${qmarks}`, savedata);
	}

    let prevID;

}

async function SaveRoles(roles, selGuild, options, zip) {
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
}

async function SaveMembers(members, selGuild, options, zip) {
	print("Saving members...")

	await members.Execute("CREATE TABLE IF NOT EXISTS members (id text, username text, discriminator text, tag text, nickname text, createdTimestamp integer, bot integer, system integer, communicationDisabledTimestamp integer, displayHexColor text, joinedTimestamp integer, pending integer, premiumSinceTimestamp integer, avatar text, banner text)")

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
				savedata.push(rawimage?.toString("base64"));
			} else savedata.push(null);

			let bannerurl = member?.user.bannerURL(membersFetchOptions)
			if (bannerurl) {
				let rawimage = await GetLinkData(bannerurl);
				savedata.push(rawimage?.toString("base64"));
			} else savedata.push(null);
		} else {
			savedata.push(null);
			savedata.push(null);
		}

		await members.Execute(`INSERT INTO members (${savekeys.join(", ")}, avatar, banner) VALUES (${Array(savedata.length).fill("?").join(", ")})`, savedata);

        let qualitytext = "";

        switch (options.save_members_images) {
            case "y": qualitytext = " (low-res image)"; break;
            case "f": qualitytext = " (high-res image)"; break;
        }

        print(`${++idx}/${gmembers.size} members saved${qualitytext} - ${member?.user?.tag ?? "unnamed"}`)
	}

	print("Saved members!")
}

async function SaveServerInfo(serverinfo, selGuild, allChannels, allCategories, options, zip) {
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS serverinfo (type text, data text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS bans (id text, user text, reason text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS invites (code text, temporary integer, maxAge integer, uses integer, maxUses integer, inviterId integer, createdAt integer, expiresAt integer, url text)")
	await serverinfo.Execute("CREATE TABLE IF NOT EXISTS emojis (id text, name text, animated integer, authorId text, createdAt integer, identifier text, requiresColons integer, url text, image text)")
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
		svsave["icon"] = rawimage?.toString("base64");
	}

	let bannerurl = selGuild.bannerURL({ format: "png" })
	if (bannerurl) {
		let rawimage = await GetLinkData(bannerurl);
		svsave["banner"] = rawimage?.toString("base64");
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

		await serverinfo.Execute(`INSERT INTO channels (${savekeys.join(", ")}) VALUES (${Array(savedata.length).fill("?").join(", ")})`, savedata)

		if (zip) {
			let svinfo = zip.folder("serverinfo");

			svinfo.file("")
		}
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
}

/*
	let messag
	let prevChunk;
	let guild = await selectedGuild.fetch()
	let vanityData = {};
	let owner = guild.owner;

	try {
		vanityData = await guild.fetchVanityData()
	} catch {};

	let zip = new JSZip()
	let svinfo;

	if (chosen_options.save_server_data) {
		console.log("Saving server information...")
		svinfo = svinfo ?? zip.folder("server");

		logs.log("[Server backup start]")

		// save icon
		svinfo.file("icon.png", getLinkData(guild.iconURL({format: "png"}) ?? "https://cdn.discordapp.com/attachments/947806697878069249/953378638152228874/unknown.png?size=256"))
		svinfo.file("banner.png", getLinkData(guild.bannerURL({format: "png"}) ?? "https://cdn.discordapp.com/attachments/868443505045962783/953379661444948078/unknown.png?size=256"))

		let lookupTier = ["No Tier", "Tier 1", "Tier 2", "Tier 3"]
		let lookupECFL = ["Disabled", "Members without roles", "All members are scanned"]

		// save data stuff
		let str =
			`Main server information\r\n`
			+ `Name: ${guild.name}\r\n`
			+ `Description: ${guild?.description ?? "None"}\r\n`
			+ `Owner: ${owner?.user?.tag ?? "Unknown"} (ID ${guild.ownerID})\r\n`
			+ `Boosts: ${guild.premiumSubscriptionCount ?? "Unknown"} (${lookupTier[guild.premiumTier]})\r\n`
			+ `Verified: ${guild.verified ? "Yes" : "No"}\r\n`
			+ `Region: ${guild.region}\r\n`
			+ `Partnered: ${guild.partnered ? "Yes" : "No"}\r\n`
			+ `Guild ID: ${guild.id}\r\n`
			+ `Vanity URL (invite): ${vanityData.code ?? "None"} (${vanityData.uses ?? "Unknown"} uses)\r\n`
			+ `Verification Level: ${guild.verificationLevel}\r\n`
			+ `\r\n`
			+ `Extra info:\r\n`
			+ `AFK Channel: ${guild.afkChannel?.name ?? "None"}\r\n`
			+ `AFK Timeout: ${guild.afkTimeout}\r\n`
			+ `Member Count: ${guild.memberCount}\r\n`
			+ `Presence Count: ${guild.approximatePresenceCount}\r\n`
			+ `Created on ${dateToLocaleString(guild.createdAt, chosen_options.time_locale)} at ${timeToLocaleString(guild.createdAt, chosen_options.time_locale)} (locale: ${chosen_options.time_locale})\r\n`
			+ `Notifications: ${guild.defaultMessageNotifications == 0 ? "All" : "Only mentions"}\r\n`
			+ `Maximum members: ${guild.maximumMembers ?? "Unknown"}\r\n`
			+ `Multi-Factor Authentication level: ${guild.mfaLevel}\r\n`
			+ `Guild Preferred Locale: ${guild.preferredLocale}\r\n`
			+ `Explicit Content Filtering: ${lookupECFL[guild.explicitContentFilter]}\r\n`
			+ `\r\n`
			+ `Rules Channel: ${guild.rulesChannel?.name ?? "None"}\r\n`
			+ `System Channel (join messages, boosts, etc): ${guild.systemChannel?.name ?? "None"} (id ${guild.systemChannel?.id ?? "unknown"})\r\n`;

		logs.log("[Server backup end]")

		svinfo.file("data.txt", str)
		console.log("Saved server information!")
		logs.log("[Server backup save]")
	}

	if (chosen_options.save_members) {
		console.log("Saving members...")
		logs.log("[Member backup start]")

		svinfo = svinfo ?? zip.folder("server");
		let members = await guild.members.fetch()

		let str = `List of ${members.size} members:\r\n\r\n`
		let imagedata = {}
		let imagefolder
		let doSaveImgs = chosen_options.save_members_images
		if (doSaveImgs != "n") {
			imagefolder = svinfo.folder("member_avatars")
		}

		let i = 0;
		for (var member of members) {
			process.stdout.write(`${Math.floor((i + 1) / members.size * 100)}% (${i + 1}/${members.size})        \r`)
			i++
			// using this iteration method gives us an array of key and value for each item
			// so we need to extract the value
			member = member[1]

			// update member with latest uncached copy
			try {
				member = await member.fetch();
			} catch {};

			let user = member.user;
			let ttime = member.communicationDisabledUntil;
			let timeout = member.isCommunicationDisabled() ? `Yes, until ${dateAndTime(ttime, chosen_options.time_locale)}` : "No"
			let boosting = member.premiumSince ? `Yes, since ${dateAndTime(member.premiumSince, chosen_options.time_locale)}` : "No"

			logs.log(`Backing up ${user?.tag} (${i + 1} / ${members.size})`)

			str = str
				+ `${user?.tag}:\r\n`
				+ `Avatar URL: ${user.avatarURL({format: "png"})}\r\n`
				+ `Display Name: ${member.displayName ?? "Unknown"} (Device: ${member?.clientStatus ?? "Unknown"})\r\n`
				+ `Nickname: ${member.nickname ?? "None"}\r\n`
				+ `Timed out?: ${timeout} \r\n`
				+ `Displayed Hex Color: ${member.displayHexColor}\r\n`
				+ `ID: ${user.id}\r\n`
				+ `Joined at: ${dateToLocaleString(member.joinedAt, chosen_options.time_locale)} at ${timeToLocaleString(member.joinedAt, chosen_options.time_locale)}\r\n`
				+ `Pending membership?: ${member.pending ? "Yes" : "No"}\r\n`
				+ `Boosting?: ${boosting}\r\n`
				+ `Current presence: ${member.presence?.status ?? "Unknown"}\r\n`
				+ `Activities: Currently ${member.presence?.activities?.length ?? "unknown"}\r\n`

			// store activity info
			if (member.presence != null)
				member.presence.activities.forEach((activity, idx) => {
					str = str
						+ `    Activity ${idx + 1}:\r\n`
						+ `		   Name: ${activity.name}\r\n`
						+ `		   Details: ${activity.details ?? "None"}\r\n`
						+ `		   Started at: ${dateAndTime(activity.createdAt, chosen_options.time_locale)}\r\n`
						+ `		   Type: ${activity.type}\r\n`
						+ `		   State: ${activity.state ?? "None"}\r\n`
						+ `		   Emoji: ${activity.emoji?.toString() ?? "None"}\r\n`
						+ `		   URL: ${activity.url ?? "None"}\r\n`
				})

			str = str
				+ `Roles: ${member.roles.cache.size}\r\n`

			// store role info, use custom idx because foreach gives snowflake as key
			let role_idx = 0
			member.roles.cache.forEach(role => {
				role_idx++;
				str = str
					+ `    Role ${role_idx}:\r\n`
					+ `		   Name: ${role.name}\r\n`
					+ `		   Hex Color: ${role.hexColor}\r\n`
					+ `		   ID: ${role.id}\r\n`
			})

			str = str
				+ `Voice State: ${member.voice.serverMute ? "Server-muted" : "Not server-muted"}, ${member.voice.serverDeaf ? "Server-deafened" : "cot server-deafened"}, and camera ${member.voice.selfVideo ? "enabled" : "disabled"}\r\n`
				+ `\r\n`
				+ `\r\n`

			// incase member image saving is set, save them to a subfolder
			if (doSaveImgs == "y" || doSaveImgs == "f") {
				let userfolder = imagefolder.folder(member.user.tag);
				let size = doSaveImgs == "f" ? 4096 : 128;
				user = await user.fetch()

				// check if guild and user icons/banners are the same, to decide whether to save both or not
				let uicon = member.user.avatarURL({format: "png", size})
				let ubanner = member.user.bannerURL({format: "png", size})
				let gicon = member.displayAvatarURL({format: "png", size})
				// no guild banner, i assume it doesn't exist and i misremembered discord features

				if (uicon) userfolder.file("icon.png", getLinkData(uicon))
				if (ubanner) userfolder.file("banner.png", getLinkData(ubanner))
				if (uicon != gicon) userfolder.file("icon_this_guild.png", getLinkData(gicon))
			}
		}

		logs.log("[Member backup end]")
		console.log()
		svinfo.file("members.txt", str)
		console.log("Saved members!")
		logs.log("[Member backup save]")
	}

	// save role data
	if (chosen_options.save_roles) {
		logs.log("[Role backup start]")
		console.log("Saving role data...")
		svinfo = svinfo ?? zip.folder("server");

		let roles = await guild.roles.fetch()
		let str = `List of ${roles.size} roles:\r\n\r\n`
		let role_idx = 0;

		for (var role of roles) {
			role_idx++;
			role = role[1]

			logs.log(`Backing up ${role.name}`)

			str = str
				+ `Role ${role_idx}:\r\n`
				+ `    Position: ${role.position}\r\n`
				+ `    Displays separately: ${role.hoist ? "Yes" : "No"}\r\n`
				+ `    Name: ${role.name}\r\n`
				+ `    Hex Color: ${role.hexColor}\r\n`
				+ `    ID: ${role.id}\r\n`

			let perms = [];
			permissionBitLookup.forEach(value => {
				if (role.permissions.has(value)) perms.push("		" + value);
			})

			if (perms.length) str += ` Permissions:\r\n${perms.join("\r\n")}`

			// space before another role
			str += "\r\n\r\n"
		}

		logs.log("[Role backup end]")
		svinfo.file("roles.txt", str)
		console.log("Saved role data!")
		logs.log("[Role backup save]")
	}

	ban_save: if (chosen_options.save_bans) {
		logs.log("[Ban backup start]")
		console.log("Saving ban data...")
		svinfo = svinfo ?? zip.folder("server");

		let bans;
		try {
			bans = await guild.bans.fetch()
		}
		catch (e) {
			console.log("Couldn't save bans, you probably don't have access to view them!")
			console.log("Error stack trace: " + e)
			logs.error("Failed to backup bans")
			logs.error(e)
			break ban_save;
		}

		let str = `List of ${bans.length} bans:\r\n\r\n`
		let ban_idx = 0;

		for (var ban of bans) {
			ban_idx++;

			str = str
				+ `Ban ${ban_idx}:\r\n`
				+ `    User: ${ban.user?.tag ?? "Unknown tag"} (id ${ban.user?.id ?? "Unknown ID"})\r\n`
				+ `    Reason: ${ban.reason ?? "None provided (possibly unknown)"}\r\n`

			let perms = [];
			permissionBitLookup.forEach(value => {
				if (role.permissions.has(value)) perms.push("		" + value);
			})

			if (perms.length) str += ` Permissions:\r\n${perms.join("\r\n")}`

			// space before another role
			str += "\r\n\r\n"
		}

		logs.log("[Ban backup end]")
		svinfo.file("bans.txt")
		console.log("Saved ban data!")
		logs.log("[Ban backup save]")
	}

	// generate jszip category folders for all of the categories' channels to be put in
	let chinfo;
	let categories;

	if (selectedChannels.length) {
		chinfo = chinfo ?? zip.folder("channels");
		categories = {};

		selectedChannels.forEach(channel => {
			let parent = channel.parent?.name ?? "no category"
			if (!categories[parent])
				categories[parent] = chinfo.folder(clean4FS(parent));
		})
	}

	// for member message counts
	let mem_messages = {}

	// channel backup
	if (selectedChannels.length) {
		logs.log("[Channel backup start]")
		console.log("Backing up channels...")
		svinfo = svinfo ?? zip.folder("server");

		let key = -1
		for (var channel of selectedChannels) {
			logs.log(`[Channel #${channel.name} backup start]`)
			key++;
			console.log(`Channel ${key + 1} (#${channel.name}):`)

			let parent = channel.parent?.name ?? "no category"
			let myfolder = categories[parent].folder(clean4FS(channel.name + " (" + channel.id + ")"))
			let c_messages = 0;
			let c_bytes = 0;
			let c_lines = 0;
			let currentchunk = 0;
			let options = {
				limit: 100
			};
			let latesttxt = false;

			// save channel info
			let ch_str = `Info for channel #${channel.name}:\r\n`
				+ `Category: ${parent}\r\n`
				+ `ID: ${channel.id}\r\n`
				+ `Type: ${channel.type}\r\n`
				+ `Position: ${channel.position} (raw: ${channel.rawPosition})\r\n`
				+ `Created on ${dateToLocaleString(channel.createdAt, chosen_options.time_locale)} at ${timeToLocaleString(channel.createdAt, chosen_options.time_locale)} (locale: ${chosen_options.time_locale})\r\n`
				+ `Auto thread archive time: ${channel?.defaultAutoArchiveDuration ?? "Unknown"}\r\n`

			switch (channel.type) {
				case "GUILD_TEXT":
					case "DM":
                        case "GUILD_NEWS":
							case "GUILD_NEWS":
								ch_str += `Topic: ${channel?.topic ?? "[Unknown]"}\r\n`
									+ `Slowmode Time: ${channel.rateLimitPerUser} second(s)\r\n`
				break;
				case "GUILD_VOICE":
					case "GUILD_STAGE_VOICE":
						ch_str += `Bitrate: ${channel.bitrate}\r\n`
							+ `RTC Region: ${channel?.rtcRegion ?? "Auto"}\r\n`
							+ `Video Quality Mode: ${channel?.videoQualityMode ?? "Unknown"}\r\n`
							+ `User Limit: ${channel.userLimit}\r\n`
				break;
			}

			myfolder.file("info.txt", ch_str)
			logs.log(`[Saved channel info]`)

			let total_str = ""
			let fails = 0
			while (true) {
				let channel = selectedChannels[key];

				logs.log(`[Channel #${channel.name} message backup start]`)
				let messages = await channel.messages.fetch(options).catch(async err => {
					fails++;

					logs.error("Failed to save messages, attempt " + fails)
					logs.error(err)
					process.stdout.write("Failed to save messages, retrying... " + fails + " (err: " + err + ")      \r")

					if (fails > 10) {
						total_str += "Couldn't save messages (or any more messages): " + err + "\r\n"
						console.log("\n[ERR] Failed to back up " + channel.name + "! Error message: ", err)
						logs.error("[ERR] Failed to back up " + channel.name + ", error message: ")
						logs.error(err)
						fails = 0
					}
					else {
						return "retry";
					}

					myfolder.file("messages.txt", total_str)
					await sleep(chosen_options.interval * 1000)
					return "fail"
				})

				if (messages == "retry") continue;
				if (messages == "fail") break;
				let this_str = ""

				// turn into an array and reverse so that the last element is the latest message, and the first is the oldest
				// so that we can keep adding new messages to the start of the file
				messages = messages.map(msg => msg).reverse()
				if (messages.length > 0 && !latesttxt) {
					this_str += `[Latest message ID: ${messages[messages.length - 1].id}]\r\n`
					latesttxt = true
				}
				else if (messages.length == 0) this_str += `[No messages in this channel!]\r\n`



				for (var msg of messages) {
					let time = msg.createdAt
					let timechunk = time.getUTCDate() + time.getUTCMonth() + time.getUTCFullYear()

					// i use "time chunks" so that i can separate chat messages based on days
					if (timechunk != currentchunk) {
						this_str += `\r\n-- [${dateToLocaleString(time, chosen_options.time_locale)}] --\r\n`
						currentchunk = timechunk; // sync back up
					}

					if (chosen_options["save_member_message_count"])
						mem_messages[msg.author.id] = (mem_messages[msg.author.id] ?? 0) + 1;

					// extract and concatenate attachments
					let att_text = ""
					let attachments = []
					msg.attachments.forEach(att => attachments.push("	" + att.url))
					let att_count = attachments.length

					if (attachments.length) {
						att_text = ` + [${attachments.length} attachments]:\r\n`;
						attachments = attachments.join("\r\n") + "\r\n"
					} else attachments = "";

					// compose this message
					let final_text = "[if you see this something went wrong] " + msg.type + " - " + msg.author.tag + " - " + msg.content + "\r\n";
					let msg_reply = "";
					let time_string = `[${timeToLocaleString(time, chosen_options.time_locale)}]`

					// fetch the message this one replies to (if it replies to any at all)

					let refmsg = false
					if (msg.reference) {
						try {
							let msgreply = await channel.messages.fetch(msg.reference.messageId)
							refmsg = msgreply
							msg_reply = " replied to " + msgreply.author.tag
						}
						catch (e)
						{
							msg_reply = " replied to a deleted message"
							logs.error(`[WARN] Failed to fetch message for reference id ${msg.reference.messageId}: ${e}`)
						}
					}

					// usual message
					switch (msg?.type) {
						case "DEFAULT":
						case "REPLY": // my code from v12 already handles message references, so i think it'll be fine if i just make the case fallthrough
							if (msg.content.length)
								final_text = `${time_string} ${msg.author.tag}${msg_reply}: ${msg.content}\r\n${att_text}${attachments}`
							else if (att_count) // message without text with attachments
								final_text = `${time_string} ${msg.author.tag}${msg_reply} sent ${att_count} attachments:\r\n${attachments}`
							else { // probably a sticker
								let stickers = msg.stickers.map(s => s)
								let strick = ""
								for (let i of stickers) strick += " [" + i.name + "]"
								final_text = `${time_string} ${msg.author.tag}${msg_reply} sent sticker:${strick}\r\n`
							}
						break;
						case "CHANNEL_PINNED_MESSAGE":
							let msgtxt = refmsg ? `a message by ${refmsg.author.tag}. (content: ${msg.content.substr(0, 32) + msg.content.length > 32 ? "..." : ""})` : "a message that was deleted."
							final_text = `${time_string} ${msg.author.tag} pinned ${refmsg}\r\n`
						case "RECIPIENT_ADD":
							final_text = `${time_string} ${msg.author.tag} added a member!\r\n`
						break;
						case "RECIPIENT_REMOVE":
							final_text = `${time_string} ${msg.author.tag} removed a member!\r\n`
						break;
						case "CALL":
							final_text = `${time_string} ${msg.author.tag} started a call!\r\n`
						break;
						case "CHANNEL_NAME_CHANGE":
							final_text = `${time_string} ${msg.author.tag} changed the channel name!\r\n`
						break;
						case "CHANNEL_ICON_CHANGE":
							final_text = `${time_string} ${msg.author.tag} changed the channel icon!\r\n`
						break;
						case "PINS_ADD":
							final_text = `${time_string} ${msg.author.tag} pinned a message!\r\n`
						break;
						case "GUILD_MEMBER_JOIN":
							final_text = `${time_string} ${msg.author.tag} joined!\r\n`
						break;
						case "USER_PREMIUM_GUILD_SUBSCRIPTION":
							final_text = `${time_string} ${msg.author.tag} boosted this server!\r\n`
						break;
						case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1":
							final_text = `${time_string} This server has reached Tier 1!\r\n`
						break;
						case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2":
							final_text = `${time_string} This server has reached Tier 2!\r\n`
						break;
						case "USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3":
							final_text = `${time_string} This server has reached Tier 3!\r\n`
						break;
						case "GUILD_DISCOVERY_DISQUALIFIED":
							final_text = `${time_string} This guild has been disqualified from Guild Discovery!\r\n`
						break;
						case "GUILD_DISCOVERY_REQUALIFIED":
							final_text = `${time_string} This guild has been requalified for Guild Discovery!\r\n`
						break;
						case "THREAD_CREATED":
							final_text = `${time_string} ${msg.author.tag} created a thread: ${msg.content}\r\n`
						break;
						case "APPLICATION_COMMAND":
							final_text = `${time_string} A command for the bot ${msg.author.tag} was ran! ${msg.author.tag} responded with: ${msg.content}\r\n`
						break;
						default:
							logs.error("Error: Unimplemented message type")
							logs.error(msg)
							logs.error(final_text)
						break;
					}

					this_str += final_text
					c_messages++;
				}

				c_bytes += this_str.length;
				c_lines += this_str.split("\r\n").length
				process.stdout.write(`    ${c_bytes} bytes  |	${c_lines} lines  |  ${c_messages} msgs    \r`)
				logs.log(`    ${c_bytes} bytes  |	${c_lines} lines  |  ${c_messages} msgs    \r`)

				// add the chunk of text at the start
				total_str = this_str + total_str;

				if (messages.length < 100) {
					console.log(`\nChannel ${key + 1} complete, saved ${c_bytes} bytes, ${c_lines} lines and ${c_messages} messages`)
					logs.log(`Channel ${key + 1} complete, saved ${c_bytes} bytes, ${c_lines} lines and ${c_messages} messages`)
					myfolder.file("messages.txt", total_str)
					await sleep(chosen_options.interval * 1000)
					break;
				}

				// set messages "cursor" to the oldest message
				if (messages.length) options.before = messages.shift().id;
				await sleep(chosen_options.interval * 1000)
			}

			logs.log("[Channel backup end]")
		}

		if (chosen_options["save_member_message_count"]) {
			let str = ""
			let arr = []

			// arrayify our object
			for (var id in mem_messages) {
				arr.push([id, mem_messages[id]])
			}

			// sort
			arr.sort((a, b) => {
				return b[1] - a[1]
			})

			for (let num = 0; num < arr.length; num++) {
				let kv = arr[num]
				let member;
				try {
					member = await selectedGuild.members.fetch(kv[0])
				} catch {continue}
				if (!member) continue;

				str += `(ID ${kv[0]}) - ${member.user.tag}: ${kv[1]} message(s)\r\n`
			}

			svinfo.file("message_counts.txt", str)
			console.log("Saved member message counts!")
			logs.log("[Saved member message counts]")
		}

		console.log("Finished backing up channels!")
	}

	logs.log("Generating zip")
	let content = await zip.generateAsync({type: "nodebuffer"})
	let fname = clean4FS(getInitials(guild.name))

	try {
		fs.writeFileSync(fname + ".zip", content)
		console.log("Saved to " + fname + ".zip!")
		logs.log("Saved zip to " + fname + ".zip")
	}
	catch (e) {
		console.log("Couldn't write zip, saving as backup.zip instead! (err string: " + e + ")")
		fs.writeFileSync("backup_" + Math.floor(Math.random() * 69420) + ".zip", content)
		logs.error("Failed to save zip to " + fname + ".zip")
		logs.error(e)
	}

	console.log("Finished backing up, thank you for using this tool!")
	logs.log("Process exit")
	process.exit(0)



}*/
