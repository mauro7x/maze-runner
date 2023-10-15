import config from "./config.js";
import { JOIN_RES, JOIN_REQ } from "./topics.js";

// ----------------------------------------------------------------------------
// WINDOW ELEMENTS
// ----------------------------------------------------------------------------

const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");

// ----------------------------------------------------------------------------
// CLASSES DEFINITION
// ----------------------------------------------------------------------------

function onMessage(topic, message) {
  const payload = JSON.parse(message.toString() ?? "");
  if (!(topic in this.handlers)) {
    console.warn("Missing handler for message", {
      topic,
      payload,
    });
  }
  this.handlers[topic](payload);
}

function initClient() {
  const { host, port } = config?.emqx;
  const client = mqtt.connect(
    `ws://${host ?? "localhost"}:${port ?? 8083}/mqtt`
  );

  // Initialize handlers
  client.on("connect", this.onConnect.bind(this));
  client.on("message", onMessage.bind(this));

  return client;
}

class GameManager {
  constructor() {
    // Internal state
    this.players = {};

    // Client
    this.handlers = {
      [JOIN_REQ]: this.handleJoinRequest.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Handlers

  handleJoinRequest(payload) {
    console.debug("[GameManager] Join request received", payload);

    const desiredUsername = payload.username ?? "Player";

    // Avoid repeated usernames
    let username = desiredUsername;
    let number = 1;
    while (username in this.players) {
      number += 1;
      username = `${desiredUsername}_${number}`;
    }

    // Create player
    const player = {
      color: this.getRandomColor(),
      score: 0,
    };
    this.players[username] = player;

    // Response
    const resPayload = {
      username,
      players: this.players,
    };
    console.debug("[GameManager] Join request accepted", resPayload);
    this.client.publish(JOIN_RES, JSON.stringify(resPayload));
  }

  // Callbacks

  onConnect() {
    console.debug("[GameManager] Client connected");
    this.client.subscribe([JOIN_REQ]);
  }
}

class Game {
  constructor() {
    // Internal state
    this.me = {
      username: null,
      x: null,
      y: null,
    };
    this.players = {};

    // MQTT Client
    this.handlers = {
      [JOIN_RES]: this.handleJoinResponse.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  joinGame() {
    const payload = {
      username: "Username",
    };

    console.debug("[Game] Subscribing to JOIN_RES");
    this.client.subscribe([JOIN_RES]);

    console.debug("[Game] Sending join request", payload);
    this.client.publish(JOIN_REQ, JSON.stringify(payload));
  }

  // Handlers

  handleJoinResponse(payload) {
    console.debug("[Game] Join response received", payload);
    const { username, players } = payload;
    this.players = players;
    this.me.username = username;
  }

  // Callbacks

  onConnect() {
    console.debug("[Game] Client connected");
    this.joinGame();
  }
}

// ----------------------------------------------------------------------------
// INSTANCES CREATION
// ----------------------------------------------------------------------------

console.debug("Loaded configuration:", config);

const gameManager = new GameManager();
const game = new Game();
