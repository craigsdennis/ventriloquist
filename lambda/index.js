'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');

const APP_ID = 'amzn1.ask.skill.b3a058bd-4db2-4da6-9189-139ca25688e7';
const SCRIPT_URL = 'https://raw.githubusercontent.com/craigsdennis/ventriloquist/master/docs/main.ssml';

/**
 * List API end-point.
 */
// read::alexa:household:list
const API_URL = 'api.amazonalexa.com';
const API_PORT = '443';


/**
 * List API to retrieve the List of Lists : Lists Metadata.
 */
const getListsMetadata = function(session, callback) {
    if(!session.user.permissions) {
        console.log("permissions are not defined");
        callback(null);
        return;
    }
    const consent_token = session.user.permissions.consentToken;
    console.log("Starting the get list metadata call.");
    const options = {
        host: API_URL,
        port: API_PORT,
        path: '/v2/householdlists/',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + consent_token,
            'Content-Type': 'application/json'
        }
    };

    https.request(options, (res) => {
        console.log('STATUS: ', res.statusCode);
        console.log('HEADERS: ', JSON.stringify(res.headers));

        if(res.statusCode === 403) {
            console.log("permissions are not granted");
            callback(null);
            return;
        }

        var body = [];
        res.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            callback(body);
        });

        res.on('error', (e) => {
            console.log(`Problem with request: ${e.message}`);
        });
    }).end();
};

const getToDoList = function(session, callback) {
    if(!session.user.permissions) {
        console.log("permissions are not defined");
        callback(null);
        return;
    }
    const consent_token = session.user.permissions.consentToken;
    console.log("Starting get todo list call.");

    getListsMetadata(session, function(returnValue) {
        if(!returnValue) {
            console.log("permissions are not defined");
            callback(null);
            return;
        }
        const obj = JSON.parse(returnValue);
        let todo_path = '';
        for (let i = 0; i < obj.lists.length; i++) {
            if (obj.lists[i].name === 'Alexa to-do list') {
                for (let j = 0; j < obj.lists[i].statusMap.length; j++) {
                    if (obj.lists[i].statusMap[j].status === 'active') {
                        todo_path = obj.lists[i].statusMap[j].href;
                        break;
                    }
                }
                break;
            }
        }

        const options = {
            host: API_URL,
            port: API_PORT,
            path: todo_path,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + consent_token,
                'Content-Type': 'application/json'
            }
        };

        https.request(options, (res) => {
            console.log('STATUS: ', res.statusCode);
            console.log('HEADERS: ', JSON.stringify(res.headers));
            if(res.statusCode === 403) {
                console.log("permissions are not granted");
                callback(null);
                return;
            }
            const body = [];
            res.on('data', function(chunk) {
                body.push(chunk);
            }).on('end', function() {
                const bodyBuffer = Buffer.concat(body).toString();
                callback(JSON.parse(bodyBuffer));
            });
            res.on('error', (e) => {
                console.log(`Problem with request: ${e.message}`);
            });
        }).end();
    });
};

function getScript(session, callback) {
    getToDoList(session, (todos) => {
        console.log("Todos are " + todos);
        const request = https.get(SCRIPT_URL, (res) => {
            let data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                callback(null, data);
            });
        });
        request.on('error', function (e) {
            callback(e, null);
        });
        request.end();
    });

}

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetDummyLine');
    },
    'Unhandled': function() {
        this.emit(':tellWithPermissionCard',
            'In order to use this app you need to grant permissions to your todo list',
            ['read::alexa:household:list']
        );
    },
    'GetNewDummyLineIntent': function () {
        this.emit('GetDummyLine');
    },
    'GetDummyLine': function () {
        console.log('User info is ', this.event.session.user);
        const permissions = this.event.session.user.permissions;

        if (permissions === undefined ||
                permissions.consentToken === undefined) {
            this.emit(':tellWithPermissionCard',
                'In order to use this app you need to grant permissions to your todo list',
                ['read::alexa:household:list']
            );
        }
        getScript(this.event.session, (err, data) => {
            if (err) {
                this.emit(':tell', 'Something went really wrong: ' + err.message);
                throw err;
            }
            // Make an array based on newlines
            let lines = data.split(/\r?\n/);
            lines = lines.filter(line => line.length > 0);
            // Using the session get the previous line number
            let lineIndex = this.attributes.lineIndex;
            if (lineIndex === undefined) {
                lineIndex = -1;
            }
            lineIndex++;

            let line = lines[lineIndex];
            if (this.event.request.intent) {
                const whatevs = this.event.request.intent.slots.Whatever.value;
                line = line.replace('${whatevs}', whatevs);
            }

            // Store the line in the session in the session
            this.attributes.lineIndex = lineIndex;
            // Create speech output and keep going until the last line
            // Alexa just ignores whatever we say and says the next line, ask keeps it open
            // tell closes it.
            const isFinal = (lineIndex === lines.length - 1);
            if (isFinal) {
                this.attributes.lineIndex = -1;
            }
            this.emit(isFinal ? ':tell' : ':ask', line);
        });

    },
    'AMAZON.HelpIntent': function () {
        // TODO: Accept a URL to a plain text file
        this.emit(':askWithCard', 'I am reading a script from ' + SCRIPT_URL);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Peace!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'See you later, and don\'t call me dummy!');
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
