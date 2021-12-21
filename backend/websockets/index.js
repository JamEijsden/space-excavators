import { ChatMessage } from "./classes/chat-message";
import { User } from "./classes/user";
const { Server } = require("socket.io");

const crypto = require('crypto');
const {
  Worker, isMainThread, parentPort, workerData
} = require('worker_threads');


export default async (expressServer) => {
 
  const chatHistory = [];
  const rooms = new Map(); // <Host User UUID, { users,}
  const socketToRoom = new Map();
  const socketToUser = new Map();

  const io = new Server(expressServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: [],
      credentials: true
    }
  });

  setInterval(() => updateRooms(io, rooms), 100);

  io.on('connection', (socket) => {
    emitUpdatedRoomList(socket, rooms);

    socket.on('disconnect', () => {
      if(socketToRoom.has(socket.id) && socketToUser.has(socket.id)) {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        const userId = socketToUser.get(socket.id);
        const user = room.users.get(userId);
        leaveRoom(socket, rooms, room, user);
        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);
        emitUpdatedRoomList(io, rooms); 
      }
     
    });

    socket.on('leave', () => {3
      if(socketToRoom.has(socket.id) && socketToUser.has(socket.id)) {
        const roomId = socketToRoom.get(socket.id);
        const room = rooms.get(roomId);
        const userId = socketToUser.get(socket.id);
        const user = room.users.get(userId);
        leaveRoom(socket, rooms, room, user);
        socketToRoom.delete(socket.id);
        socketToUser.delete(socket.id);
        emitUpdatedRoomList(io, rooms); 
      }
    });

    socket.on('chat', (json) => {
      console.log(json, socketToRoom.get(socket.id));
      const chatMessage = new ChatMessage(json);
      socket.to(socketToRoom.get(socket.id)).emit("chat", chatMessage);
    });

    socket.on('join', (data, callback) => {
      const user = addUserState(data.user);
      const roomId = data.id;
      if(roomId === user.uuid) {
        callback(null);
      }

      const room = rooms.get(roomId);
      room.users.set(user.uuid, user);
      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);
      socketToUser.set(socket.id, user.uuid);
      console.log(user.username, 'join room', '\'' + room.name + '\'');
      callback({users: getOtherUsers(room, user.uuid)});
      emitUpdatedRoomList(io, rooms);
      emitToRoom(roomId, socket).emit('game/player/update', {join: true, user: user});
      // socket.emit('chat/history', chatHistory);
    });

    socket.on('host', (data, callback) => {
      const user = addUserState(data.user);
      const roomName = data.name;
      const users = new Map();
      users.set(user.uuid, user);
      rooms.set(user.uuid, { 
        uuid: user.uuid, 
        name: roomName, 
        active: true, 
        host: user, 
        users: users,
        enemies: new Map()
      });
      socketToRoom.set(socket.id, user.uuid);
      socketToUser.set(socket.id, user.uuid);
      socket.join(user.uuid);
      callback(true)
      console.log(user.username, 'created room', '\'' + roomName + '\'');
      emitUpdatedRoomList(io, rooms);
    });
    
    socket.on('player/update', (data, callback) => {
      const room = rooms.get(socketToRoom.get(socket.id));
      room.users.get(socketToUser.get(socket.id)).state = data;
    });

  });

    return io;
  };

  function emitUpdatedRoomList(socket, rooms) {
    const r = [];
    rooms.forEach((v, k) => r.push({ name: v.name, host: v.host, playerNumber: v.users.size}))
    socket.emit('rooms', r);;
  }

  function emitToRoom(roomId, socket) {
    return socket.to(roomId);
  }

  function getOtherUsers(room, userId) {
    const users = [];
    room.users.forEach((v,k) => users.push(v));
    return users.filter(u => u.uuid != userId);
  }

  function addUserState(user) {
    user.state = {
      health: 100,
      score: 0,
      shooting: false,
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      }
    };
    return user;
  }

  function updateRooms(io, rooms) {
    rooms.forEach((v, k) => {
      if(v.active) {
        sendRoomStateUpdate(io, v);
      }
    });
  }

  function leaveRoom(socket, rooms, room, user) {
    console.log(user.username, 'left room',  '\'' + room.name +  '\'');
    room.users.delete(user.uuid);
    if(room.users.size == 0) {
      room.active = false;
      rooms.delete(room.uuid);
    }
    emitToRoom(room.uuid, socket).emit('game/player/update', {join: false, user: user});
    emitUpdatedRoomList(socket, rooms);
  }

  function sendRoomStateUpdate(io, room) {
    io.emit('game/update', {players: Array.from(room.users.values())});
  }

  function spawnEnemy(socket, room) {
    const enemy = {
      uuid: crypto.randomUUID(),
      health: 1,
      position: {
        x: getRandomInt(50),
        y: getRandomInt(50),
        z: 0,
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0,
      }
    };
    socket.in(room.uuid).emit('enemy/spawn', enemy);
    roomSocket.emit('enemy/dead', uuid);
  }

  const playerDmg = 1;
  function enemyHit(socket, room, uuid) {
    if(room.enemies.get(uuid).health >= 0) {
      return;
    } else {
      room.enemies.get(uuid).health -= playerDmg;
      if(room.enemies.get(uuid).health >= 0) {
        room.enemies.delete(uuid);
        socket.in(room.uuid).emit('enemy/dead', uuid);
      }
    }

    function getRandomInt(max) {
      return Math.floor(70 + Math.random() * max);
    }

      // Client
  function sendClientTime() {

  }

  function onTimeServerEvent({server, client}) {
    const latency; // = (client os current epoch ms - old client) / 2
    const clientClock = server + latency;
  }
  // delta_latency = 0;
  // clientClick += (delta*1000) - delta_latency
  // delta_lentacy -= delta_latency;
  // decimal_collector += (delta*1000) - int(delta*1000) 
  // decimal_collector >= 1  add +1 to clock and -1 to collector
  // TODO: continue here https://youtu.be/TwVT3Qx9xEM?t=589


  function determineLatency() {

  }

  // Server  arg clietnTimeMs epoch ms
  function fetchServerTime(socket, clientTimeMs, user) {
    const uuid = user.uuid;
    socket.send('time/server', {
      server: 1234, // server epoch ms
      client: clientTimeMs, // client epoch ms
    });
  
  }
}