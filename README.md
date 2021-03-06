# Discord Server Backup Tool
### by andreweathan
  
I made a front-end discord server backup tool years ago, but recently Discord changed CORS stuff and discord.js no longer works in the browser, so i've decided to rewrite it as a CLI tool!  
This tool lets you backup any server data such as members, roles, overview, avatar, banner, and channel messages.  
It has custom options you can tweak, mostly related to what you want to save.  
  
### Setup:
To use this tool you need to install some NPM libraries.  
Run this command to install them! (assuming you have npm)  
`npm i discord.js@12.5.3`  
`npm i node-fetch@2.6.1`  
`npm i readline-sync`  
`npm i jszip`  
  
### Usage:
Run the script with `node server.js` and then type a Discord token, it's necessary to access the server information.  
The code is always available to look at if you don't trust typing your token!  
Afterwards, just select the server and channels, select the options you want (they have defaults so you can skip them by pressing enter) and then wait until it completes.  

# NOTE
The risks/consequences of using this tool (given that it probably goes against Discord TOS) are on you though, so use with caution!  
Use a high message request interval, and don't waste your time (and Discord's API resources) trying to backup huge servers.  
This is only intended to be used to backup your average discord server with your friends :D
  
Also, for obvious reasons, this tool doesn't backup any media sent in servers.
If you really want that, you can write a script to filter through backup messages for links and download the files.
