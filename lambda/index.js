'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');

const APP_ID = 'amzn1.ask.skill.b3a058bd-4db2-4da6-9189-139ca25688e7';
const SCRIPT_URL = 'https://raw.githubusercontent.com/craigsdennis/ventriloquist/master/docs/main.ssml';


function getScript(callback) {
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
}

const handlers = {
    'LaunchRequest': function () {
        this.emit('GetDummyLine');
    },
    'GetNewDummyLineIntent': function () {
        this.emit('GetDummyLine');
    },
    'GetDummyLine': function () {
        getScript((err, data) => {
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
