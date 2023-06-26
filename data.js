export const messageKeysArr = [
	"id",
	"applicationId",
	"type",
	"content",
	"createdTimestamp",
	"editedTimestamp",
	"hasThread",
	"pinned",
	"system",
	"tts"
]

export const attachmentsKeysArr = [
	"messageId",
	"attachmentId",
	"contentType",
	"description",
	"duration",
	"ephemeral",
	"width",
	"height",
	"name",
	"size",
	"spoiler"
]

export const messageKeys
	  = "id text, authorId text, channelId text, applicationId text, type text, content text, createdTimestamp integer, editedTimestamp integer, " +
		"hasThread integer, threadId text, embedCount integer, pinned integer, system integer, tts integer, activity text, attachmentCount integer, referenceChannelId text, referenceGuildId text, referenceMessageId text"

export const attachmentKeys = "messageId text, attachmentId, contentType text, description text, duration real, ephemeral integer, width integer, height integer, id text, name text, size integer, spoiler integer"

export const embedKeys = "id text, author text, color integer, description text, fields text, footer text, hexColor text, image text, length integer, provider text, thumbnail text, timestamp text, title text, url text, video text"

export const localedata = [
	"af", "af-NA", "am", "ar", "ar-AE", "ar-BH", "ar-DJ", "ar-DZ", "ar-EG", "ar-EH", "ar-ER", "ar-IL", "ar-IQ", "ar-JO", "ar-KM", "ar-KW", "ar-LB", "ar-LY", "ar-MA", "ar-MR", "ar-OM", "ar-PS", "ar-QA", "ar-SA", "ar-SD", "ar-SO", "ar-SS", "ar-SY", "ar-TD", "ar-TN", "ar-YE", "as", "az", "az-Latn", "be", "bg", "bn", "bn-IN", "bs", "bs-Latn", "ca", "ca-AD", "ca-ES-VALENCIA", "ca-FR", "ca-IT", "cs", "cy", "da", "da-GL", "de", "de-AT", "de-BE", "de-CH", "de-IT", "de-LI", "de-LU", "el", "el-CY", "en", "en-001", "en-150", "en-AE", "en-AG", "en-AI", "en-AS", "en-AT", "en-AU", "en-BB", "en-BE", "en-BI", "en-BM", "en-BS", "en-BW", "en-BZ", "en-CA", "en-CC", "en-CH", "en-CK", "en-CM", "en-CX", "en-CY", "en-DE", "en-DG", "en-DK", "en-DM", "en-ER", "en-FI", "en-FJ", "en-FK", "en-FM", "en-GB", "en-GD", "en-GG", "en-GH", "en-GI", "en-GM", "en-GU", "en-GY", "en-HK", "en-IE", "en-IL", "en-IM", "en-IN", "en-IO", "en-JE", "en-JM", "en-KE", "en-KI", "en-KN", "en-KY", "en-LC", "en-LR", "en-LS", "en-MG", "en-MH", "en-MO", "en-MP", "en-MS", "en-MT", "en-MU", "en-MW", "en-MY", "en-NA", "en-NF", "en-NG", "en-NL", "en-NR", "en-NU", "en-NZ", "en-PG", "en-PH", "en-PK", "en-PN", "en-PR", "en-PW", "en-RW", "en-SB", "en-SC", "en-SD", "en-SE", "en-SG", "en-SH", "en-SI", "en-SL", "en-SS", "en-SX", "en-SZ", "en-TC", "en-TK", "en-TO", "en-TT", "en-TV", "en-TZ", "en-UG", "en-UM", "en-US-POSIX", "en-VC", "en-VG", "en-VI", "en-VU", "en-WS", "en-ZA", "en-ZM", "en-ZW", "es", "es-419", "es-AR", "es-BO", "es-BR", "es-BZ", "es-CL", "es-CO", "es-CR", "es-CU", "es-DO", "es-EA", "es-EC", "es-GQ", "es-GT", "es-HN", "es-IC", "es-MX", "es-NI", "es-PA", "es-PE", "es-PH", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE", "et", "eu", "fa", "fa-AF", "fi", "fil", "fr", "fr-BE", "fr-BF", "fr-BI", "fr-BJ", "fr-BL", "fr-CA", "fr-CD", "fr-CF", "fr-CG", "fr-CH", "fr-CI", "fr-CM", "fr-DJ", "fr-DZ", "fr-GA", "fr-GF", "fr-GN", "fr-GP", "fr-GQ", "fr-HT", "fr-KM", "fr-LU", "fr-MA", "fr-MC", "fr-MF", "fr-MG", "fr-ML", "fr-MQ", "fr-MR", "fr-MU", "fr-NC", "fr-NE", "fr-PF", "fr-PM", "fr-RE", "fr-RW", "fr-SC", "fr-SN", "fr-SY", "fr-TD", "fr-TG", "fr-TN", "fr-VU", "fr-WF", "fr-YT", "ga", "ga-GB", "gl", "gu", "he", "hi", "hr", "hr-BA", "hu", "hy", "id", "is", "it", "it-CH", "it-SM", "it-VA", "ja", "jv", "ka", "kk", "km", "kn", "ko", "ko-KP", "ky", "lo", "lt", "lv", "mk", "ml", "mn", "mr", "ms", "ms-BN", "ms-ID", "ms-SG", "my", "nb", "nb-SJ", "ne", "ne-IN", "nl", "nl-AW", "nl-BE", "nl-BQ", "nl-CW", "nl-SR", "nl-SX", "or", "pa", "pa-Guru", "pl", "ps", "ps-PK", "pt", "pt-AO", "pt-CH", "pt-CV", "pt-GQ", "pt-GW", "pt-LU", "pt-MO", "pt-MZ", "pt-PT", "pt-ST", "pt-TL", "ro", "ro-MD", "root", "ru", "ru-BY", "ru-KG", "ru-KZ", "ru-MD", "ru-UA", "sd", "sd-Arab", "si", "sk", "sl", "so", "so-DJ", "so-ET", "so-KE", "sq", "sq-MK", "sq-XK", "sr", "sr-Cyrl", "sr-Cyrl-BA", "sr-Cyrl-ME", "sr-Cyrl-XK", "sr-Latn", "sr-Latn-BA", "sr-Latn-ME", "sr-Latn-XK", "sv", "sv-AX", "sv-FI", "sw", "sw-CD", "sw-KE", "sw-UG", "ta", "ta-LK", "ta-MY", "ta-SG", "te", "th", "tk", "tr", "tr-CY", "uk", "ur", "ur-IN", "uz", "uz-Latn", "vi", "yue", "yue-Hant", "zh", "zh-Hans", "zh-Hans-HK", "zh-Hans-MO", "zh-Hans-SG", "zh-Hant", "zh-Hant-HK", "zh-Hant-MO", "zu"
]
export let chosen_options = {
	"save_server_data": {
		text: "Save server information? (name, data, icon, moderation, members, etc)",
		default: true,
		accepted: [
			"y", "n"
		],
		type: "bool"
	},
	"save_members_images": {
		text: "Save the avatars and banners of members? Type one of y, n, or f:\n(y)es in low quality, yes in (f)ull quality, (n)o",
		default: "y",
		accepted: [
			"y", "n", "f"
		],
		type: "choice"
	},
	"save_emoji_images": {
		text: "Save custom server emoji images? Type y, n, or f:\n(y)es in low quality, yes in (f)ull quality, (n)o",
		default: "y",
		accepted: [
			"y", "n", "f"
		],
		type: "choice"
	},
	"save_role_images": {
		text: "Save role icon images? Type y, n, or f:\n(y)es in low quality, yes in (f)ull quality, (n)o",
		default: "y",
		accepted: [
			"y", "n", "f"
		],
		type: "choice"
	},
	// this will be a separate tool
	/*"save_readable": {
		text: "Save everything in a human-readable and accessible form? (text files)\nBy default, this tool only stores data in SQL databases, which can be used to easily filter through all of the data programatically. (Recommended)",
		default: true,
		accepted: [
			"y", "n"
		],
		type: "bool"
	},*/
	"save_embeds": {
		text: "Save all message embed data?\nNote: This isn't recommended, it takes up a lot of space in the end, but most bots use embeds in their messages, so if you disable this, you won't save those emeds.",
		default: false,
		accepted: [
			"y", "n"
		],
		type: "bool"
	},
	"save_interval": {
		text: "How quickly should this tool fetch messages from Discord, in seconds? If it's done too quickly, Discord may ratelimit you if the value is too small. (0.5-10)",
		min: 0.5,
		max: 10,
		default: 1.5,
		type: "number"
	},
	"total_message_count": {
		text: "Type the amount of messages in the server.\nTo find out this number, use Discord's search function in the server, and search \"before:2069\".\nNOTE: If you don't want to save all of the channels in a guild (only some), then type -1 to disable this.",
		min: -1,
		max: 2147483647,
		default: -1,
		type: "number"
	}
}

// used in export tool
export let serverinfoDataLookup = {
    "afkChannelId": {
        name: "AFK Channel",
        type: "channel"
    },
    "afkTimeout": {
        name: "AFK Timeout (time until user considered AFK and moved)",
    },
    "createdTimestamp": {
        name: "Server creation date",
        type: "date"
    },
    "description": {
        name: "Server description"
    },
    "explicitContentFilter": {
        name: "Explicit content filter"
    },
    "verificationLevel": {
        name: "Server verification level"
    },
    "defaultMessageNotifications": {
        name: "Default message notification setting"
    },
    "id": {
        name: "Server ID"
    },
    "maximumBitrate": {
        name: "Maximum voice channel bitrate"
    },
    "maximumMembers": {
        name: "Maximum members"
    },
    "maximumPresences": {
        name: "Maximum user presences"
    },
    "maxStageVideoChannelUsers": {
        name: "Maximum stage video channel users"
    },
    "maxVideoChannelUsers": {
        name: "Maximum video channel users"
    },
    "memberCount": {
        name: "Member count"
    },
    "mfaLevel": {
        name: "Multi-Factor Authentication level"
    },
    "name": {
        name: "Server name"
    },
    "nameAcronym": {
        name: "Server name acronym"
    },
    "nsfwLevel": {
        name: "NSFW level"
    },
    "ownerId": {
        name: "Owner",
        type: "user"
    },
    "partnered": {
        name: "Is server partnered",
        type: "bool"
    },
    "preferredLocale": {
        name: "Preferred location"
    },
    "premiumProgressBarEnabled": {
        name: "Boost progress bar enabled",
        type: "bool"
    },
    "premiumSubscriptionCount": {
        name: "Server boosts"
    },
    "premiumTier": {
        name: "Server boost tier"
    },
    "publicUpdatesChannelId": {
        name: "Public updates channel",
        type: "channel"
    },
    "rulesChannelId": {
        name: "Rules channel",
        type: "channel"
    },
    "systemChannelId": {
        name: "System channel",
        type: "channel"
    },
    "widgetChannelId": {
        name: "Widget channel",
        type: "channel"
    },
    "verified": {
        name: "Is server verified",
        type: "bool"
    },
    "widgetEnabled": {
        name: "Widget images enabled",
        type: "bool"
    },
    "features": {
        name: "Server features",
        type: "json"
    },
    "icon": {
        name: "Server icon",
        type: "image",
        filename: "icon.png"
    }
}

export let channelKeysLookup = {
    name: {
        name: "Name"
    },
    type: {
        name: "Type"
    },
    id: {
        name: "ID"
    },
    parentId: {
        name: "Parent channel",
        type: "channel"
    },
    position: {
        name: "Position"
    },
    rawPosition: {
        name: "Raw position"
    },
    createdAt: {
        name: "Created at",
        type: "date"
    },
    nsfw: {
        name: "Is NSFW",
        type: "bool"
    },
    lastMessageId: {
        name: "Last known message ID"
    },
    topic: {
        name: "Topic"
    },
    rateLimitPerUser: {
        name: "Slowmode"
    },
    bitrate: {
        name: "Bitrate"
    },
    rtcRegion: {
        name: "RTC Region"
    },
    userLimit: {
        name: "User limit"
    }
}

export let memberKeysLookup = {
    id: {
        name: "ID"
    },
    discriminator: {
        name: "Discriminator (tag numbers)"
    },
    tag: {
        name: "Tag"
    },
    nickname: {
        name: "Nickname"
    },
    username: {
        name: "Username"
    },
    createdTimestamp: {
        name: "Created at",
        type: "date"
    },
    bot: {
        name: "Is a bot",
        type: "bool"
    },
    system: {
        name: "Is part of Discord",
        type: "bool"
    },
    communicationDisabledTimestamp: {
        name: "Timed out at",
        type: "date"
    },
    displayHexColor: {
        name: "Member hex color"
    },
    joinedTimestamp: {
        name: "Joined at",
        type: "date"
    },
    pending: {
        name: "Pending (not fully joined)",
        type: "bool"
    },
    premiumSinceTimestamp: {
        name: "Boosting since",
        type: "date"
    },
    avatar: {
        name: "Avatar",
        type: "image",
        filename: "avatar.png"
    },
    banner: {
        name: "Banner",
        type: "image",
        filename: "banner.png"
    },
}

export let inviteKeysLookup = {
    code: {
        name: "Code"
    },
    temporary: {
        name: "Temporary invite",
        type: "bool"
    },
    maxAge: {
        name: "Expires after",
        type: "time",
        unit: "seconds"
    },
    uses: {
        name: "Uses"
    },
    maxUses: {
        name: "Maximum uses"
    },
    inviterId: {
        name: "Inviter",
        type: "user"
    },
    createdAt: {
        name: "Created at",
        type: "date"
    },
    expiresAt: {
        name: "Expires at",
        type: "date"
    },
    url: {
        name: "URL"
    }
}

export let emojiKeysLookup = {
    id: {
        name: "ID"
    },
    name: {
        name: "Name"
    },
    animated: {
        name: "Is animated",
        type: "bool"
    },
    authorId: {
        name: "Created by",
        type: "user"
    },
    createdAt: {
        name: "Created at",
        type: "date"
    },
    identifier: {
        name: "Identifier"
    },
    requiresColons: {
        name: "Requires colons",
        type: "bool"
    },
    url: {
        name: "URL"
    },
    image: {
        name: "Emoji image",
        type: "image",
        filename: "emoji.png"
    }
}

export let roleKeysLookup = {
    id: {
        name: "ID"
    },
    name: {
        name: "Name"
    },
    createdTimestamp: {
        name: "Created at",
        type: "date"
    },
    hoist: {
        name: "Displays members with this role separately",
        type: "bool"
    },
    mentionable: {
        name: "Can be mentioned",
        type: "bool"
    },
    tags: {
        name: "Tags"
    },
    position: {
        name: "Position in category"
    },
    rawPosition: {
        name: "Total position in server"
    },
    hexColor: {
        name: "Hex color"
    },
    unicodeEmoji: {
        name: "Unicode emoji"
    },
    icon: {
        name: "Icon",
        type: "image",
        filename: "icon.png"
    },
    permissions: {
        name: "Permissions"
    }
}
