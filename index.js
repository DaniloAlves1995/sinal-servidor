
const uuidv4 = require("uuid/v4");


let users = {};

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
};

const sendToAll = (clients, type, { id, name: userName }) => {
  Object.values(clients).forEach(client => {
    if(client.name !== userName) {
      client.send(
        JSON.stringify({
          type,
          user: { id, userName }
        })
      )
    }
  })
};



"use strict";

var http2 = require('http');
var https = require('https');
var fs = require('fs');
var WebSocketServer = require('websocket').server;

// Pathnames of the SSL key and certificate files to use for
// HTTPS connections.

const keyFilePath = "/etc/pki/tls/private/mdn-samples.mozilla.org.key";
const certFilePath = "/etc/pki/tls/certs/mdn-samples.mozilla.org.crt";

// Used for managing the text chat user list.

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// Output logging information to console

function log(text) {
  var time = new Date();

  console.log("[" + time.toLocaleTimeString() + "] " + text);
}

// If you want to implement support for blocking specific origins, this is
// where you do it. Just return false to refuse WebSocket connections given
// the specified origin.
function originIsAllowed(origin) {
  return true;    // We will accept all connections
}

// Scans the list of users and see if the specified name is unique. If it is,
// return true. Otherwise, returns false. We want all users to have unique
// names.
function isUsernameUnique(name) {
  var isUnique = true;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === name) {
      isUnique = false;
      break;
    }
  }
  return isUnique;
}

// Sends a message (which is already stringified JSON) to a single
// user, given their username. We use this for the WebRTC signaling,
// and we could use it for private text messaging.
function sendToOneUser(target, msgString) {
  var isUnique = true;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].username === target) {
      connectionArray[i].sendUTF(msgString);
      break;
    }
  }
}

// Scan the list of connections and return the one for the specified
// clientID. Each login gets an ID that doesn't change during the session,
// so it can be tracked across username changes.
function getConnectionForID(id) {
  var connect = null;
  var i;

  for (i=0; i<connectionArray.length; i++) {
    if (connectionArray[i].clientID === id) {
      connect = connectionArray[i];
      break;
    }
  }

  return connect;
}

// Builds a message object of type "userlist" which contains the names of
// all connected users. Used to ramp up newly logged-in users and,
// inefficiently, to handle name change notifications.
function makeUserListMessage() {
  var userListMsg = {
    type: "userlist",
    users: []
  };
  var i;

  // Add the users to the list

  for (i=0; i<connectionArray.length; i++) {
    userListMsg.users.push(connectionArray[i].username);
  }

  return userListMsg;
}

// Sends a "userlist" message to all chat members. This is a cheesy way
// to ensure that every join/drop is reflected everywhere. It would be more
// efficient to send simple join/drop messages to each user, but this is
// good enough for this simple example.
function sendUserListToAll() {
  var userListMsg = makeUserListMessage();
  var userListMsgStr = JSON.stringify(userListMsg);
  var i;

  for (i=0; i<connectionArray.length; i++) {
    connectionArray[i].sendUTF(userListMsgStr);
  }
}


// Try to load the key and certificate files for SSL so we can
// do HTTPS (required for non-local WebRTC).

var httpsOptions = {
  key: null,
  cert: null
};

try {
  httpsOptions.key = fs.readFileSync(keyFilePath);
  try {
    httpsOptions.cert = fs.readFileSync(certFilePath);
  } catch(err) {
    httpsOptions.key = null;
    httpsOptions.cert = null;
  }
} catch(err) {
  httpsOptions.key = null;
  httpsOptions.cert = null;
}

// If we were able to get the key and certificate files, try to
// start up an HTTPS server.

var webServer = null;

try {
  if (httpsOptions.key && httpsOptions.cert) {
    webServer = https.createServer(httpsOptions, handleWebRequest);
  }
} catch(err) {
  webServer = null;
}

if (!webServer) {
  try {
    webServer = http2.createServer({}, handleWebRequest);
  } catch(err) {
    webServer = null;
    log(`Error attempting to create HTTP(s) server: ${err.toString()}`);
  }
}


// Our HTTPS server does nothing but service WebSocket
// connections, so every request just returns 404. Real Web
// requests are handled by the main server on the box. If you
// want to, you can return real HTML here and serve Web content.

function handleWebRequest(request, response) {
  log ("Received request for " + request.url);
  response.writeHead(404);
  response.end();
}

// Spin up the HTTPS server on the port assigned to this sample.
// This will be turned into a WebSocket port very shortly.

const port = process.env.PORT || 9000

webServer.listen(port, function() {
  log("Server is listening on port "+ port);
});

// Create the WebSocket server by converting the HTTPS server into one.

var wsServer = new WebSocketServer({
  httpServer: webServer,
  autoAcceptConnections: false
});

if (!wsServer) {
  log("ERROR: Unable to create WbeSocket server!");
}

// Set up a "connect" message handler on our WebSocket server. This is
// called whenever a user connects to the server's port using the
// WebSocket protocol.



wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    log("Connection from " + request.origin + " rejected.");
    return;
  }

  // Accept the request and get a connection.

  var connection = request.accept("json", request.origin);

  const ws = connection;

  // Add the new connection to our list of connections.

  log("Connection accepted from " + connection.remoteAddress + ".");
  connectionArray.push(connection);

  connection.clientID = nextID;
  nextID++;

  // Send the new client its token; it send back a "username" message to
  // tell us what username they want to use.

  var msg = {
    type: "id",
    id: connection.clientID
  };
  connection.sendUTF(JSON.stringify(msg));

  //send immediatly a feedback to the incoming connection
  ws.send(
    JSON.stringify({
      type: "connect",
      message: "Well hello there, I am a WebSocket server"
    })
  );

  // Set up a handler for the "message" event received over WebSocket. This
  // is a message sent by a client, and may be text to share with other
  // users, a private message (text or signaling) for one user, or a command
  // to the server.

  connection.on('message', function(message) {
    msg = JSON.parse(message.utf8Data);
    
      let data;
      let flag = false;
      //accepting only JSON messages
      console.log("menssagem: "+message.utf8Data);
      try {
        data = JSON.parse(message.utf8Data);
      } catch (e) {
        console.log("Invalid JSON");
        data = {};
      }
      const { type, name, offer, answer, candidate } = data;
      console.log("type: "+type);
      switch (type) {
        //when a user tries to login
        case "login":
          //Check if username is available
          if (users[name]) {
            sendTo(ws, {
              type: "login",
              success: false,
              message: "Username is unavailable"
            });
          } else {
            const id = uuidv4();
            const loggedIn = Object.values(
              users
            ).map(({ id, name: userName }) => ({ id, userName }));
            // const loggedIn = Object.keys(users).map(user => ({ userName: user }));
            users[name] = ws;
            ws.name = name;
            ws.id = id;
            console.log("Login aqui!!");
            sendTo(ws, {
              type: "login",
              success: true,
              users: loggedIn
            });
            sendToAll(users, "updateUsers", ws);
          }
          break;
        case "offer":
          //if UserBexists then send him offer details
          const offerRecipient = users[name];

          if (!!offerRecipient) {
            //setting that sender connected with cecipient
            ws.otherName = name;
            sendTo(offerRecipient, {
              type: "offer",
              offer,
              name: ws.name
            });
          }
          break;
        case "answer":
          //for ex. UserB answers UserA
          const answerRecipient = users[name];

          if (!!answerRecipient) {
            ws.otherName = name;
            sendTo(answerRecipient, {
              type: "answer",
              answer
            });
          }
          break;
        case "candidate":
          const candidateRecipient = users[name];

          if (!!candidateRecipient) {
            sendTo(candidateRecipient, {
              type: "candidate",
              candidate
            });
          }
          break;
        case "leave":
          recipient = users[name];

          //notify the other user so he can disconnect his peer connection
          if (!!recipient) {
            recipient.otherName = null;
            sendTo(recipient, {
              type: "leave"
            });
          }
          break;
        default:
          flag = true;
          /*sendTo(ws, {
            type: "error",
            message: "Command not found: " + type
          });*/
          break;
      }
   
      if (message.type === 'utf8' && flag) {
        log("Received Message: " + message.utf8Data);

        // Process incoming data.

        var sendToClients = true;
        msg = JSON.parse(message.utf8Data);
        var connect = getConnectionForID(msg.id);

        // Take a look at the incoming object and act on it based
        // on its type. Unknown message types are passed through,
        // since they may be used to implement client-side features.
        // Messages with a "target" property are sent only to a user
        // by that name.

        switch(msg.type) {
          // Public, textual message
          case "message":
            msg.name = connect.username;
            msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
            break;

          // Public, textual message
          case "message2":
            msg.name = connect.username;
            msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
            break;

          // Username change
          case "username":
            var nameChanged = false;
            var origName = msg.name;

            // Ensure the name is unique by appending a number to it
            // if it's not; keep trying that until it works.
            while (!isUsernameUnique(msg.name)) {
              msg.name = origName + appendToMakeUnique;
              appendToMakeUnique++;
              nameChanged = true;
            }

            // If the name had to be changed, we send a "rejectusername"
            // message back to the user so they know their name has been
            // altered by the server.
            if (nameChanged) {
              var changeMsg = {
                id: msg.id,
                type: "rejectusername",
                name: msg.name
              };
              connect.sendUTF(JSON.stringify(changeMsg));
            }

            // Set this connection's final username and send out the
            // updated user list to all users. Yeah, we're sending a full
            // list instead of just updating. It's horribly inefficient
            // but this is a demo. Don't do this in a real app.
            connect.username = msg.name;
            sendUserListToAll();
            sendToClients = false;  // We already sent the proper responses
            break;
        }

        // Convert the revised message back to JSON and send it out
        // to the specified client or all clients, as appropriate. We
        // pass through any messages not specifically handled
        // in the select block above. This allows the clients to
        // exchange signaling and other control objects unimpeded.

        if (sendToClients) {
          var msgString = JSON.stringify(msg);
          var i;

          // If the message specifies a target username, only send the
          // message to them. Otherwise, send it to every user.
          if (msg.target && msg.target !== undefined && msg.target.length !== 0) {
            sendToOneUser(msg.target, msgString);
          } else {
            for (i=0; i<connectionArray.length; i++) {
              connectionArray[i].sendUTF(msgString);
            }
          }
        }
      }
    
  });

  // Handle the WebSocket "close" event; this means a user has logged off
  // or has been disconnected.
  connection.on('close', function(reason, description) {

    if (ws.name) {
      delete users[ws.name];
      if (ws.otherName) {
        console.log("Disconnecting from ", ws.otherName);
        const recipient = users[ws.otherName];
        if (!!recipient) {
          recipient.otherName = null;
        }
      }
      sendToAll(users, "removeUser", ws);
    }

    // First, remove the connection from the list of connections.
    connectionArray = connectionArray.filter(function(el, idx, ar) {
      return el.connected;
    });

    // Now send the updated user list. Again, please don't do this in a
    // real application. Your users won't like you very much.
    sendUserListToAll();

    // Build and output log output for close information.

    var logMessage = "Connection closed: " + connection.remoteAddress + " (" +
                     reason;
    if (description !== null && description.length !== 0) {
      logMessage += ": " + description;
    }
    logMessage += ")";
    log(logMessage);
  });
});

