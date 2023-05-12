# discord-server-backup-tool

self-explanatory, this tool saves almost all useful information of a server using the discord.js library :D

## setup
- clone this repo
- install node.js if you haven't already
- run `npm i` in the repo folder to install all of the packages
- create a new file called ".env" and write "TOKEN=youraccounttokenhere" in it, can be either a bot or a user token (read at the end)
- run `node index.js` and go through all the options, then sit back and wait for it to finish :)

## what this tool does:
- saves **all** relevant server settings and properties that are listed in the discord API, including server icons and banners, bans list, and invites list
- saves all relevant role information, including which members have which roles and role icons (if set)
- saves all relevant server emoji information, including the emojis themselves
- saves a list of the settings and properties of each channel in the guild, like position, name, and others
- saves a list of guild members and all of their properties, also including their avatars and banners
- progressively saves every message each channel in the guild that you choose to backup, including the message embeds (optional) and the message attachment details (not the attachments themselves)
- supports saving messages from the threads of a channel
- also supports resuming the backup if anything happens, like a fatal script error or internet loss :)
- has an interactive-ish experience at the start that includes selecting the guild to backup, the channels, and changing some settings for the backup, like image qualities and message fetch interval
- saves all of this in several SQLite databases, which means it can be easily filtered through or processed by any sqlite-capable software/program

## what this tool can't do (yet)
- doesn't save more than 100 active and 100 archived threads per channel, because it's a niche necessity that i don't really want to work on
- doesn't save per-channel permissions, again, a niche necessity
- doesn't save the guild's audit logs yet
  
SQL database information coming soon, for now you can look in backup.js to see what the table schemas are :)
  
this tool supports using either bots for the backup, or user accounts!  
i know the whole "selfbots bad!!!!!1" drill already, but keep in mind i'm making this tool not only for myself, but also for those who want to save their beloved servers in case Big Discord®™®™™ has anything to say about them, so use whatever you feel like using, in the end no one truly cares what you use  
also, this tool doesn't steal your token or anything, you can go look in the code to reassure yourself
