import { WebSocketServer, WebSocket } from 'ws';

const users = new Map([]);

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function (ws) {
  ws.on('error', console.error);

  ws.on('message', function message(message, isBinary) {
    try {
      const payload = JSON.parse(message);

      if (!payload?.action) return;

      switch (payload.action) {
        case 'new-user':
          if (!payload.data) return;

          ws.id = payload.data.id;

          users.set(payload.data.id, payload.data);

          wss.clients.forEach(function (client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message, { binary: isBinary });
            }
          });
          break;
        case 'update-user-position': {
          if (!payload.data) return;

          users.set(payload.data.id, payload.data);

          wss.clients.forEach(function (client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const message = {
                action: 'sync-users',
                data: [...users.values()],
              };
              const buffer = Buffer.from(JSON.stringify(message));
              client.send(buffer);
            }
          });
          break;
        }
        case 'chat': {
          wss.clients.forEach(function (client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message, { binary: isBinary });
            }
          });

          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.log(error);
    }
  });

  ws.on('close', function (data) {
    wss.clients.forEach(function (client) {
      if (client.readyState === WebSocket.OPEN) {
        users.forEach((user) => {
          if (user['id'] === client.id) return;

          user && users.delete(user['id']);
        });
      }
    });
  });

  const message = { action: 'sync-users', data: [...users.values()] };
  const buffer = Buffer.from(JSON.stringify(message));
  ws.send(buffer);
});
