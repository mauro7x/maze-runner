const topics = {
  // Join game messages
  JOIN_REQ: "join/req",
  JOIN_RES: "join/res",

  // Game normal messages
  POSITION: "position",
  SCORE: "score",

  // Updates for the room
  UPDATE_PLAYER_JOINED: "update/player_joined",
  UPDATE_PLAYER_LEFT: "update/player_left",
  UPDATE_MAP: "update/map",

  // Control plane
  KEEPALIVE: "keepalive",
};

export const generateTopicsForRoom = (room) => {
  const topicsForRoom = {};

  for (const key in topics) {
    topicsForRoom[key] = `room_${room}/${topics[key]}`;
  }

  return topicsForRoom;
};
