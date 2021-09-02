#!/usr/bin/env node
var db = require('./db-helper');
const os = require('os');
const inquirer = require('inquirer');
const clipboardy = require('clipboardy');
const argv = require('yargs')
    .scriptName("token-helper")
    .alias('h', 'help')
    .help('h')
    .option("s", {
        alias: "save",
        describe: "Saves a new Github API Token.",
        nargs: 1,
    })
    .option("l", {
        alias: "list",
        describe: "List all Github API Tokens",
    })
    .option("d", {
        alias: "delete",
        describe: "Delete a Github API Token.",
    })
    .option("e", {
        alias: "environment",
        describe: "The height of the area.",
        nargs: 1,
    })
    .usage('Usage: $0 [options]')
    .example('$0 -s abc123', 'Save a new Github API Token')
    .argv;
//todo: USE FS to create a direction in the home director to put the db in. ex; ~/data/tokens.db
const DB_PATH = os.homedir() + '/tokens.db';
const dbSchema = `CREATE TABLE IF NOT EXISTS tokens (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    token text NOT NULL,
    environment text NOT NULL,
    created_at Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

async function main() {
    await db.open(DB_PATH);
    let r = await db.run(dbSchema);

    if (argv.s) {
        await saveToken(argv.s, argv.e);
    } else if (argv.l) {
        await listTokens(argv.e);
    } else if (argv.d) {
        await deleteToken(argv.e);
    }
}

async function saveToken(token, env) {
    env = env || "NONE";
    console.log(`Saving Token ${token} for ${env}`);
    let sql = `INSERT INTO tokens(token, environment) VALUES ('${token}', '${env}')`;
    let r = await db.run(sql);
    if (r) {
        console.log("Done.");
    }
    await db.close();
}

async function getTokens(env) {
    return new Promise(async function (resolve, reject) {
        let sql = "SELECT * FROM tokens";
        if (!!env) {
            console.log(`Fetching Tokens for ${env}`);
            sql += ` WHERE environment='${env}'`;
        } else {
            console.log('Fetching All Tokens');
        }
        r = await db.all(sql, []);
        resolve(r);
    });
}

async function listTokens(env) {
    r = await getTokens(env);
    console.table(r);
    if (r.length < 1) {
        return;
    }
    var questions = [
        {
            name: "selection",
            type: "number",
            message: "Enter an id to copy to clipboard:",
            default: function () {
                return -1;
            }
        }
    ];
    inquirer.prompt(questions).then(answers => {
        if (!!answers.selection && answers.selection != -1) {
            let results = isValidIdSelection(answers.selection, r);
            if (results.valid) {
                clipboardy.writeSync(r[results.index].token);
                console.log(`Successfully copied token with id ${answers.selection} to clipboad!`);
            } else {
                console.log("Invalid Selection. Failed to copy token value to clipboard");
            }
        }
        console.log("Done");
        db.close();
    })
        .catch(error => {
            if (error.isTtyError) {
                // Prompt couldn't be rendered in the current environment
            } else {
                // Something else when wrong
            }
        });
}

async function deleteToken(env) {
    r = await getTokens(env);
    console.table(r);
    if (r.length < 1) {
        return;
    }
    let questions = [
        {
            name: "selection",
            type: "number",
            message: "Enter an id to delete:",
            default: function () {
                return -1;
            }
        }
    ];
    inquirer.prompt(questions).then(answers => {
        deleteLogic(answers, r);
    })
        .catch(error => {
            if (error.isTtyError) {
                // Prompt couldn't be rendered in the current environment
            } else {
                // Something else when wrong
            }
        });
}

async function deleteLogic(answers, r) {
    if (!!answers.selection && answers.selection != -1) {
        let results = isValidIdSelection(answers.selection, r);
        if (results.valid) {
            let sql = `DELETE FROM tokens WHERE id= ${answers.selection}`;
            r = await db.run(sql);
            if (r) {
                console.log(`Successfully deleted token with id ${answers.selection}!`);
            }
        } else {
            console.log("Invalid Selection. Failed to delete token");
        }
    }
    console.log("Done");
    await db.close();

}

function isValidIdSelection(id, results) {
    let returnValue = {
        valid: false,
        index: -1
    };
    for (let i = 0; i < results.length; i++) {
        if (results[i].id === id) {
            returnValue.valid = true;
            returnValue.index = i;
            break;
        }
    }
    return returnValue;
}

main();