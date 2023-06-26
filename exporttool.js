const log = console.log
const error = console.error

log("------------------------------------------")
log("|andreweathan's server backup export tool|")
log("------------------------------------------")
log()

import SQL from "./sql.js"
import { OpenDatabases } from "./sql.js"
import { cmdGetString } from "./util.js"
import fs from "fs"
import path from "path"
import JSZip from "jszip"
import { serverinfoDataLookup, channelKeysLookup, memberKeysLookup, inviteKeysLookup, emojiKeysLookup, roleKeysLookup } from "./data.js"
import { Clean4FS } from "./util.js"

await import ("dotenv/config")

process.argv.shift() // removes node from list
process.argv.shift() // removes script path

let folder = process.argv.shift()
if (!folder) {
    log("No folder specified. Please input a folder name.")
    process.exit(-1)
}

if (!fs.existsSync(folder)) {
    log("No folder exists at specified path.")
    process.exit(-2)
}
if (!fs.statSync(folder).isDirectory()) {
    log("Specified path isn't a folder.")
    process.exit(-3)
}

log("Folder: " + folder)
log("Exporting...")

let membersDB = path.resolve(folder, "members.db")
if (fs.existsSync(membersDB)) {
    membersDB = await SQL.OpenFile(membersDB);
    log("Found and loaded members.db!");
} else {
    log("Couldn't find members.db. This is vital in server backup exporting to find out what members the IDs belong to.")

    process.exit(-3)
}

async function GetMemberByID(id) {
    if (membersDB) {
        return await membersDB.Execute("SELECT * FROM members WHERE id = ?", id)
    } else {
        if (bot) {
            return await bot.users.fetch(id);
        }
    }

    return {
        id,
        username: "Unknown User",
        discriminator: "0000",
        tag: "Unknown User",
        invalid: true
    }
}

let serverinfoDB = path.resolve(folder, "serverinfo.db")

async function GetChannelByID(id) {
    if (serverinfoDB) {
        let ch = await serverinfoDB.Execute("SELECT * FROM channels WHERE id = ?", id)
        return ch
    }

    return {
        id,
        name: "Unknown Channel",
        invalid: true
    }
}

let zip = new JSZip();
let chanfolder;

async function ValueToString(key, val, desc, zipfolder, idt, dontSaveImages) {
    let indent = "\t".repeat(idt ?? 0);
    let info = desc[key];
    if (!info) return `Unknown property (${key}): ${val?.toString().substr(0, 300) ?? "None"}\n`

    let text = ""
    switch (info.type) {
        case "bool": {
            text += indent + info.name + ": " + (val ? "Yes" : "No") + "\n"
        } break;
        case "channel": {
            if (!val) {
                text += indent + info.name + ": (None)\n"
                break;
            }

            let chan = await GetChannelByID(val)
            text += indent + info.name + ": [ CHANNEL ] \n" + indent + "{\n";

            for (let prop of Object.keys(chan)) {
                let ret = await ValueToString(prop, chan[prop], channelKeysLookup, zipfolder, (idt ?? 0) + 1)
                text += indent + ret;
            }

            text += indent + "}\n";
        } break;
        case "user": {
            if (!val) {
                text += indent + info.name + ": (No user)\n"
                break;
            }

            let mem = await GetMemberByID(val)
            if (!mem) return indent + info.name + `: (Unknown user, ID ${val})\n`

            text += indent + info.name + ": [ USER ]\n" + indent + "{\n";

            for (let prop of Object.keys(mem)) {
                let ret = await ValueToString(prop, mem[prop], memberKeysLookup, zipfolder, (idt ?? 0) + 1, dontSaveImages)
                text += indent + ret;
                console.log(prop, "poro")
            }

            text += indent + "}\n";
        } break;
        case "image": {
            if ((idt ?? 0) >= 1) break;
            if (dontSaveImages) break;
            if (val) zipfolder.file(info.filename, val)
            console.log("Saved " + info.filename)
        } break;
        case "date" : {
            text += indent + info.name + ": " + (val ? new Date(val).toUTCString() : "Never") + "\n"
        } break;
        default: {
            text += indent + info.name + ": " + (val ?? "(None)") + "\n"
        } break;
    }

    return text;
}

// server info
if (fs.existsSync(serverinfoDB)) {
    log("Found and loaded serverinfo.db, exporting...")
    serverinfoDB = await SQL.OpenFile(serverinfoDB);

    let svfolder = zip.folder("serverinfo")
    let vals = await serverinfoDB.ExecuteAll("SELECT * FROM serverinfo")

    let text = "";
    for (let pairs of vals) {
        text += await ValueToString(pairs.type, pairs.data, serverinfoDataLookup, svfolder, 0);
    }

    svfolder.file("server.txt", text)
    log(`Saved server.txt to zip.`)

    // channels
    log("Exporting server channel info...")
    chanfolder = zip.folder("channels")

    let chanvals = await serverinfoDB.ExecuteAll("SELECT * FROM channels")

    for (let chan of chanvals) {
        let thischan = chanfolder.folder(Clean4FS(chan.rawPosition + " - " + chan.name))
        let ctext = ""

        for (let key in chan) {
            ctext += await ValueToString(key, chan[key], channelKeysLookup, thischan, 0)
        }

        thischan.file("channelinfo.txt", ctext)
    }

    log("Exported channels!")

    let banvals = await serverinfoDB.ExecuteAll("SELECT * FROM bans")
    let bantext = ""

    for (let val of banvals) {
        bantext += `User: ${val.tag ?? "(None)"}\n`
            + `ID: ${val.id ?? "(None)"}\n`
            + `Reason: ${val.reason ?? "(None)"}\n\n`
    }

    svfolder.file("bans.txt", bantext)
    log("Exported bans!")

    let invitesvals = await serverinfoDB.ExecuteAll("SELECT * FROM invites")
    let invitestext = ""

    for (let invite of invitesvals) {
        for (let key in invite) {
            invitestext += await ValueToString(key, invite[key], inviteKeysLookup, null, 0);
        }

        invitestext += "\n";
    }

    svfolder.file("invites.txt", invitestext)
    log("Exported invites!")

    let emojivals = await serverinfoDB.ExecuteAll("SELECT * FROM emojis")
    let emojifld = svfolder.folder("emojis")

    for (let val of emojivals) {
        let emojitext = "";
        let fld = emojifld.folder(Clean4FS(val.identifier));

        for (let prop in val) {
            emojitext += await ValueToString(prop, val[prop], emojiKeysLookup, fld, 0);
        }

        fld.file("info.txt", emojitext);
    }

    log("Exported emojis!")
} else log("No serverinfo.db found in backup. Skipped.");

// members
log("Exporting members...")
let memfolder = zip.folder("members")
let members = await membersDB.ExecuteAll("SELECT * FROM members;")

for (let member of members) {
    let memberfld = memfolder.folder(Clean4FS(member.tag))

    let text = "";
    for (let key in member) {
        text += await ValueToString(key, member[key], memberKeysLookup, memberfld, 0);
    }

    memberfld.file("userinfo.txt", text)
}

let rolesDB = path.resolve(folder, "roles.db")
if (fs.existsSync(rolesDB)) {
    rolesDB = await SQL.OpenFile(rolesDB)

    console.log("Found and loaded roles.db, exporting...")

    let vals = await rolesDB.ExecuteAll("SELECT * FROM roles");
    let roles = zip.folder("roles")

    for (let val of vals) {
        let text = ""
        let fld = roles.folder(Clean4FS(val.name))

        for (let prop in val) {
            text += await ValueToString(prop, val[prop], roleKeysLookup, fld, 0);
        }

        text += "\nMembers with this role:\n"

        let members = await rolesDB.ExecuteAll("SELECT * FROM rolemembers WHERE roleId = ?", [val.id])
        for (let member of members) {
            text += await ValueToString("user", member.userId, { user: { name: "Member", type: "user" } }, null, 0, true)
        }

        fld.file("info.txt", text)
    }
}

let messagesDB = path.resolve(folder, "messages.db")
if (fs.existsSync(messagesDB)) {
    messagesDB = await SQL.OpenFile(messagesDB)

    console.log("Found and loaded messages.db, exporting...")

    let vals = await messagesDB.ExecuteAll("SELECT * FROM messages");
    let roles = zip.folder("messages")

    for (let val of vals) {
        let text = ""
        let fld = roles.folder(Clean4FS(val.name))

        for (let prop in val) {
            text += await ValueToString(prop, val[prop], roleKeysLookup, fld, 0);
        }

        text += "\nMembers with this role:\n"

        let members = await rolesDB.ExecuteAll("SELECT * FROM rolemembers WHERE roleId = ?", [val.id])
        for (let member of members) {
            text += await ValueToString("user", member.userId, { user: { name: "Member", type: "user" } }, null, 0, true)
        }

        fld.file("info.txt", text)
    }



let data = await zip.generateAsync({ type: "uint8array" })
fs.writeFileSync("export_" + folder + ".zip", data)
log(`Finished, saved to export_${folder}.zip.`);
