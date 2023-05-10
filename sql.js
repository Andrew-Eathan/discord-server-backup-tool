// file from mariluu site by andreweathan (aka mariluu) (me :))
// rewritten on 16/11/2022

// file actions:
// + global.SQL				(object)
// + global.SQL.Client		(sqlite3 Database)
// + global.SQL.IsValid		(bool)
// + global.SQL.GetSiteData	(function (string) -> promise -> err / row)
// + global.SQL.Execute		(function (string, array) -> promise -> err / row)

await import ("dotenv/config");

import chalk from "chalk";
import sqlite3 from "sqlite3";

let SQL = {}
export let OpenDatabases = [];

SQL.OpenFile = filename => {
    return new Promise((resolveTop, rejectTop) => {
        let obj = {
            IsValid: false,
            FileName: filename
        }

        obj.Client = new sqlite3.Database(filename, async err => {
            if (err) {
                console.error(err, import.meta.url);
                rejectTop(err)
                return;
            }

            obj.IsValid = true
            OpenDatabases.push(obj);

            obj.Execute = async (query, params) => {
                if (!obj.IsValid)
                    return console.log("Tried to execute SQL query on an invalid database.\nIgnore this if you're seeing this after forcefully closing the tool!")

                let promise = new Promise((resolve, reject) => {
                    let fn = (err, row) => {
                        if (err) {
                            reject(err)
                            return;
                        }

                        resolve(row)
                    }

                    obj.Client.get(query, params ?? [], fn)
                })

                return promise;
            }

            obj.ExecuteAll = async (query, params) => {
                if (!obj.IsValid)
                    return console.log("Tried to execute SQL query on an invalid database.\nIgnore this if you're seeing this after forcefully closing the tool!")

                let promise = new Promise((resolve, reject) => {
                    let fn = (err, row) => {
                        if (err) {
                            reject(err)
                            return;
                        }

                        resolve(row)
                    }

                    obj.Client.all(query, params ?? [], fn)
                })

                return promise;
            }

            obj.Close = async _ => {
                if (!obj.IsValid)
                    return console.log("Tried to close an invalid database.\nIgnore this if you're seeing this after forcefully closing the tool!")

                return new Promise((resolve, reject) => {
                    obj.Client.close(err => {
                        if (err) reject(err);
                        OpenDatabases.splice(OpenDatabases.indexOf(obj), 1);
                        obj.IsValid = false;
                        resolve();
                    });
                })
            }

            resolveTop(obj)
        })
    })
}

export default SQL;
