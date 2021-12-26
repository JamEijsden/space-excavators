import { ChatMessage } from "./classes/chat-message";
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

  setInterval(() => spawnEnemy(io, rooms), 3000);

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
        enemies: new Map(),
        hitEnemies: [],
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
      room.users.get(socketToUser.get(socket.id)).state = data.state;
      data.hitEnemies.forEach(uuid => enemyHit(socket, room, uuid));
    });

    socket.on('time/server', (clientTimeMs, callback) => {
      console.log(clientTimeMs);
      callback({
        server: Math.floor(new Date().getTime()), // server epoch ms
        client: clientTimeMs, // client epoch ms
      });
    });

    socket.on('time/latency', (clientTimeMs, callback) => {
      callback(clientTimeMs);
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
    const state = {
      players: Array.from(room.users.values()),
      enemies: Array.from(room.enemies.values()),
      hitEnemies: room.hitEnemies
    }
    io.emit('game/update', state);

    if(state.hitEnemies.lenght > 0 ) {
      console.log(state.hitEnemies);
    }
    room.hitEnemies.splice(0, room.hitEnemies.length);
  }

  function spawnEnemy(socket, rooms) {
    const enemy = {
      uuid: crypto.randomUUID(),
      state: {
        health: 1,
        position: {
          x: getRandomInt(150),
          y: getRandomInt(100),
          z: 0,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        }
      }
    };
    Array.from(rooms.values()).forEach(r => {
      r.enemies.set(enemy.uuid, enemy);
    });
    // socket.in(room.uuid).emit('enemy/spawn', enemy);
    // roomSocket.emit('enemy/dead', uuid);
  }

const playerDmg = 1;
function enemyHit(socket, room, uuid) {
  const e = room.enemies.get(uuid);
  if(!e) {
    return;
  }
  console.log(e);
  if(e.state.health <= 0) {
    return;
  } else {
    e.state.health -= playerDmg;
    if(e.state.health <= 0) {
      room.hitEnemies.push(uuid);
      room.enemies.delete(uuid);
      // socket.in(room.uuid).emit('enemy/dead', uuid);
    }
  }
}

function getRandomInt(max) {
  return Math.floor(-max + Math.random() * 2 * max);
}
