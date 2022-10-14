const { createServer } = require('http');
const { readFileSync } = require('fs');
const { WebSocketServer, WebSocket } = require('ws');
const Delta = require('quill-delta');

const server = createServer({
  // cert: readFileSync('/path/to/cert.pem'),
  // key: readFileSync('/path/to/key.pem')
});

var DOCUMENT = {};
var CARETS = {};


const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {

  ws.on('message', function message(data) {
    data = JSON.parse(data);

    
    if(data.action){
      let broadcast_changes = {};

      switch (data.action) {
        case "get_document":
          ws.uid = data.data.uid;
          CARETS[data.data.uid] = {
            uid : data.data.uid,
            name : "",
            range : {}
          };

          broadcast_changes = {
            caret : CARETS[data.data.uid],
            api_call : "add_caret"
          }

          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(broadcast_changes));
          });
          ws.send(JSON.stringify({
            api_call : data.action,
            data : {
              document : DOCUMENT
            }
          }));
          break;

      
        case "update_document":
          const client_delta = data.data;
          console.log(client_delta);
          DOCUMENT = {
            ops : new Delta(DOCUMENT.ops).compose(new Delta(client_delta)).ops
          }

          broadcast_changes = {
            api_call : data.action,
            data : client_delta
          };

          console.log(`[+] Broadcasting updates to ${wss.clients.size - 1} clients.`);

          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(broadcast_changes));
          });

          break;

        case "update_caret":
          const caret_data= data.data;
          CARETS[caret_data.uid] = {
            range : caret_data.range,
            name : caret_data.range,
            uid : caret_data.uid
          };

          broadcast_changes = {
            api_call : "update_caret",
            caret : CARETS[caret_data.uid]
          }

          wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(broadcast_changes));
          });
          break;
      
        default:
          break;
      }
    }
  });

  ws.on('close', () => {
    
    if(ws.uid){

      const broadcast_changes = {
        api_call : "delete_caret",
        caret : CARETS[ws.uid]
      }
      wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(broadcast_changes));
      });
      delete CARETS[ws.uid];
    }
  })

  
});

var p = process.env.PORT || 8080;
server.listen(p);
console.log(`Server listening on port ${p} \n\n================================\n\n`);