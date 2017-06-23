'use strict';

const Alexa = require('alexa-sdk');
const https = require('https');

const APP_ID = 'amzn1.ask.skill.37c38d6c-cbbb-41de-9ec3-9c09c6cf78a1';
const SCRIPT_URL = 'https://raw.githubusercontent.com/craigsdennis/ventriloquist/master/docs/main.ssml';

function getScript(callback) {
    // TODO: Cache this per session...only 24k though
    var request = https.get(SCRIPT_URL, (res) => {
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
            let lineIndex = this.attributes.lineIndex;
            if (lineIndex === undefined) {
                lineIndex = -1;
            }
            lineIndex++;
            this.attributes.lineIndex = lineIndex;
            const whatevs = this.event.request.intent.slots.Whatever.value;
            const line = lines[lineIndex].replace('${whatevs}', whatevs);

            // Create speech output
            this.emit(lineIndex < lines.length ? ':ask' :':tell', line);
        });

    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask', 'I am reading a script from ' + SCRIPT_URL);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Peace!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'See you later aligator!');
    },
};

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
