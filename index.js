
const app = require('express')();
const server = require('http').createServer(app);
const cors = require('cors');


const io =  require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Running');
});

function findNowRoom (client) {
  const clientRooms = Array.from(client.rooms);
  return clientRooms.find((item) => {
    return item !== client.id;
  });
}

io.on('connection', (client) => {
  console.log(`socket 用戶連接 ${client.id}`);

  client.on('joinRoom', (room) => {
    console.log(room);

    const nowRoom = findNowRoom(client);
    if (nowRoom) {
      client.leave(nowRoom);
    }
    client.join(room);
    client.to(room).emit('roomBroadcast', '已有新人加入聊天室！')
  });

  client.on('peerConnectSignaling', (message) => {
    console.log('接收資料：', message);

    const nowRoom = findNowRoom(client);
    client.to(nowRoom).emit('peerConnectSignaling', message);
  });

  client.on('disconnect', () => {
    console.log(`socket 用戶離開 ${client.id}`);
  });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
