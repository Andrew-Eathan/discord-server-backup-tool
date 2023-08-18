# discord-server-backup-tool

self-explanatory, this tool saves almost all useful information of a server using the discord.js library :D

## setup
- clone this repo
- install node.js if you haven't already
- run `npm i` in the repo folder to install all of the packages
- create a new file called ".env" and write "TOKEN=youraccounttokenhere" in it, can be either a bot or a user token (read at the end)
- run `node backuptool.js` and go through all the options, then sit back and wait for it to finish :)

## what this tool does:
- saves **all** relevant server settings and properties that are listed in the discord API, including server icons and banners, bans list, and invites list
- saves all relevant role information, including which members have which roles and role icons (if set)
- saves all relevant server emoji information, including the emojis themselves
- saves a list of the settings and properties of each channel in the guild, like position, name, and others
- saves a list of guild members and all of their properties, also including their avatars and banners. the tool also saves a list of users that are no longer in the server, as long as they've sent a message at some point
- progressively saves every message each channel in the guild that you choose to backup, including the message embeds (optional) and the message attachment details (not the attachments themselves)
- supports saving messages from the threads of a channel
- also supports resuming the backup if anything happens, like a fatal script error or internet loss :)
- has an interactive-ish experience at the start that includes selecting the guild to backup, the channels, and changing some settings for the backup, like image qualities and message fetch interval
- saves all of this in several SQLite databases, which means it can be easily filtered through or processed by any sqlite-capable software/program

## what this tool can't do (yet)
- doesn't save more than 100 active and 100 archived threads per channel, because it's a niche necessity that i don't really want to work on
- doesn't save per-channel permissions, again, a niche necessity
- doesn't save the guild's audit logs yet


# Backup structure:
For the most part, table column names are the same as the properties of the discord.js API objects.  
A full backup has 5 SQL databases:  

### backupinfo.db
This contains info relevant to the state of the backup process itself, such as backup settings, a list of guild channels, a list of channels whose messages have been fully backed up, and a list of steps that have been completed in the backup. Without this file, you can't resume an unfinished backup.  
It has 3 tables:  
#### `backupinfo (key text, value text)`
#### `finishedchannels (id text)`
#### `channels (id text)`

### serverinfo.db
This contains server information such as server settings, bans list, invites list, emojis list, and a list of channels and categories.  
It has 6 tables:  
#### `serverinfo (type text, data text)`
#### `bans (id text, tag text, reason text)`
#### `invites (code text, temporary integer, maxAge integer, uses integer, maxUses integer, inviterId text, createdTimestamp integer, expiresAt integer, url text)`
#### `emojis (id text, name text, animated integer, authorId text, createdTimestamp integer, identifier text, requiresColons integer, url text, image blob)`
#### `channels (name text, type text, id text, parentId text, position integer, rawPosition integer, createdTimestamp integer, nsfw integer, lastMessageId text, topic text, rateLimitPerUser integer, bitrate integer, rtcRegion text, userLimit integer)`
#### `categories (name text, type text, id text, position integer, rawPosition integer, createdTimestamp integer)`

### roles.db
Self-explanatory, contains all server roles  
#### `roles (id text, name text, createdTimestamp integer, hoist integer, mentionable integer, tags string, position integer, rawPosition integer, hexColor text, unicodeEmoji text, icon text, permissions text)`
#### `rolemembers (userId text, roleId text)`

### members.db
Contains a list of members, and optionally their profile pictures and banners too.  
#### `members (id text, username text, discriminator text, tag text, nickname text, createdTimestamp integer, bot integer, system integer, communicationDisabledTimestamp integer, displayHexColor text, joinedTimestamp integer, pending integer, premiumSinceTimestamp integer, avatar blob, banner blob)`
#### `nonmembers (id text, username text, discriminator text, tag text, nickname text, createdTimestamp integer, deleted integer, bot integer, system integer, communicationDisabledTimestamp integer, displayHexColor text, joinedTimestamp integer, pending integer, premiumSinceTimestamp integer, avatar blob, banner blob)`

### messages.db
The heart of the backup tool, contains a list of messages from the channels selected for backup, along with lists of the message attachments and embeds.  
#### `messages (id text, authorId text, channelId text, applicationId text, type text, content text, createdTimestamp integer, editedTimestamp integer, hasThread integer, threadId text, embedCount integer, pinned integer, system integer, tts integer, activity text, attachmentCount integer, referenceChannelId text, referenceGuildId text, referenceMessageId text`
#### `attachments (messageId text, attachmentId, contentType text, description text, duration real, ephemeral integer, width integer, height integer, id text, name text, size integer, spoiler integer)`
#### `embeds (id text, author text, color integer, description text, fields text, footer text, hexColor text, image text, length integer, provider text, thumbnail text, timestamp text, title text, url text, video text)`  



  
this tool supports using either bots for the backup, or user accounts!  
i know the whole "selfbots bad!!!!!1" drill already, but keep in mind i'm making this tool not only for myself, but also for those who want to save their beloved servers in case Big Discord®™®™™ has anything to say about them, so use whatever you feel like using, in the end no one truly cares what you use  
also, this tool doesn't steal your token or anything, you can go look in the code to reassure yourself
