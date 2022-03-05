#!/usr/bin/env node
const express = require('express')
const app = express()
const http = require('http').Server(app)


const { program } = require('commander')
const bodyParser = require('body-parser')
const colors = require('colors')
const io = require('./comm/websocket').connect(http, {path: '/socket.io'})
const mqtt = require('./comm/hive-mqtt').connect(io, "freegroup/brainbox")
const raspi = require("./comm/raspi").connect(io)
//const camera = require("./comm/camera").connect(io)
const ip_camera = require("./comm/ip-camera").connect(io)
const pca9685 = require("./comm/pca9685").connect(io)



program
  .option('--arduino <boolean>','Allow the server to communicate to an Arduino which is connected via USB', false)
  .option('--storage <string>', 'The storage backend to use. Possible values are ["single-user", "shared-hosted"]', "single-user")
  .option('--folder <string>',  'The storage folder to use if the type of storage supports it', process.env.HOME + "/.brainbox/" )
  .option('--port <number>',    'The port number for the server to use', 7400)

program.parse(process.argv)


console.log("+==========================================================================+")
console.log('| '+'    Welcome to brainbox - the beginning of something awesome'.red+'             |');
console.log("|==========================================================================|")

// application specific configuration settings
//
console.log("Init storage")
console.log("Program storage = (single-user)");
console.log(program.storage);

console.log("Je change vers un store qui fonctionne");

program.storage = "shared-public";
//program.storage = "multiple-user";
const storage = require("./storage/"+program.storage)

console.log("Set Body parser")
// Tell the bodyparser middleware to accept more data
//
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))


// Determine the IP-Address to use for the http server
//
console.log("Determine the IP-Address")
const address = require("./util/network")


// check if we want to connect to an Arduino which is connected via USB
//
if(program.arduino){
  console.log("Dans Arduino")
  // Check how many Arduinos are connected to serial port and
  // ask to user which one to use.
  //
  const arduino = require("./comm/arduino")
  arduino.init(io, runServer)
}
else {
  console.log("Dans runServer")
  runServer()
}


// =======================================================================
//
// The main HTTP Server and socket.io run loop. Serves the HTML files
// and the socket.io access point to change/read the GPIO pins if the server
// is running on an Raspberry Pi
//
// =======================================================================
async function  runServer() {
  // prepare for "certbot" HTTPS setup and letsencrypt
  app.use('/.well-known/acme-challenge', express.static(__dirname +'/../ssl/'));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.get('/', (req, res) => res.redirect('/home/'));

  await storage.init(app, program)

  http.listen(program.port, function () {
    console.log('| System is up and running. Copy the URL below and open this               |');
    console.log('| in your browser: http://' + address + ':' + program.port + '/               ');
    console.log('|                  http://localhost:' + program.port + '/                    ');
    console.log("============================================================================")
  });
}
