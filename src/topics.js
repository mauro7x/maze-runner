const topics = {
  // Join game messages
  JOIN_REQ: "join/req",
  JOIN_RES: "join/res",

  // Game normal messages
  POSITION: "position",

  // Updates for the room
  UPDATES: "update/#",
  UPDATE_PLAYER_JOINED: "update/player_joined",
  UPDATE_PLAYER_LEFT: "update/player_left",
  UPDATE_MAP: "update/map",

  // Control plane
  KEEPALIVE: "keepalive",
  USED_ROOM_REQ: "used/req",
  USED_ROOM_RES: "used/res",
};

export const generateTopicsForRoom = (room) => {
  const topicsForRoom = {};

  for (const key in topics) {
    topicsForRoom[key] = `room_${room}/${topics[key]}`;
  }

  return topicsForRoom;
};
