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

SQL.OpenFile = filename => {
    return new Promise((resolveTop, rejectTop) => {
        let obj = {
            IsValid: false
        }

        obj.Client = new sqlite3.Database(filename, async err => {
            if (err) {
                console.error(err, import.meta.url);
                rejectTop(err)
                return;
            }

            obj.IsValid = true

            obj.Execute = async (query, params) => {
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

            resolveTop(obj)
        })
    })
}

export default SQL;
