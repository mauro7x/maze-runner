import config from "./config.js";
import {
  JOIN_RES,
  JOIN_REQ,
  POSITION,
  UPDATE_PLAYER_JOINED,
  UPDATE_PLAYER_LEFT,
} from "./topics.js";

// ----------------------------------------------------------------------------
// WINDOW ELEMENTS
// ----------------------------------------------------------------------------

// Self canvas (z = 2)
const selfCanvas = document.getElementById("self-canvas");
const selfCanvasC = selfCanvas.getContext("2d");

// Players canvas (z = 1)
const playersCanvas = document.getElementById("players-canvas");
const playersCanvasC = playersCanvas.getContext("2d");

// Map canvas (z = 0)
const mapCanvas = document.getElementById("self-canvas");
const mapCanvasC = mapCanvas.getContext("2d");

function updateCanvasSize() {
  const w = selfCanvas.clientWidth;
  const h = selfCanvas.clientHeight;

  [selfCanvas, playersCanvas, mapCanvas].forEach((canvas) => {
    canvas.width = w;
    canvas.height = h;
  });
}

window.addEventListener("load", updateCanvasSize);
window.addEventListener("resize", updateCanvasSize);

// ----------------------------------------------------------------------------
// AUX FUNCTIONS
// ----------------------------------------------------------------------------

function onMessage(topic, message) {
  const payload = JSON.parse(message.toString() ?? "");
  if (!(topic in this.handlers)) {
    console.warn("Missing handler for message", {
      topic,
      payload,
    });
  }

  // Execute handler
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

// ----------------------------------------------------------------------------
// CLASSES DEFINITION
// ----------------------------------------------------------------------------

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

    // Broadcast new player
    const broadcastPayload = {
      username,
      player,
    };
    console.debug("[GameManager] Broadcasting new joined player", resPayload);
    this.client.publish(UPDATE_PLAYER_JOINED, JSON.stringify(broadcastPayload));
  }

  // Callbacks

  onConnect() {
    console.debug("[GameManager] Client connected");
    this.client.subscribe([JOIN_REQ]);
  }
}

class Game {
  static initialPosition = {
    x: 0,
    y: 0,
  };
  static radius = 5;

  constructor() {
    // Internal state
    this.players = {};
    this.username = null;
    this.moving = false;
    this.position = Game.initialPosition;

    this.color = null;

    // Optimization
    this.lastPublishedPosition = null;

    // MQTT Client
    this.handlers = {
      [JOIN_RES]: this.handleJoinResponse.bind(this),
      [POSITION]: this.handlePosition.bind(this),
      [UPDATE_PLAYER_JOINED]: this.handlePlayerJoined.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  static toScaledPosition(position) {
    return {
      x: Math.min(Math.max(position.x / selfCanvas.width, 0), selfCanvas.width),
      y: Math.min(
        Math.max(position.y / selfCanvas.height, 0),
        selfCanvas.height
      ),
    };
  }

  static fromScaledPosition(scaledPosition) {
    return {
      x: scaledPosition.x * selfCanvas.width,
      y: scaledPosition.y * selfCanvas.height,
    };
  }

  static drawPlayer(context, position, color) {
    context.beginPath();
    context.arc(position.x, position.y, Game.radius, 0, Math.PI * 2, false);
    context.fillStyle = color;
    context.fill();
    context.closePath();
  }

  drawSelf() {
    // Clear canvas
    selfCanvasC.clearRect(0, 0, selfCanvas.width, selfCanvas.height);

    // Scale position
    const position = Game.fromScaledPosition(this.position);

    // Draw my player
    // TODO: Add some distinctive to know its myself
    Game.drawPlayer(selfCanvasC, position, this.color);
  }

  drawPlayers() {
    // Clear canvas
    playersCanvasC.clearRect(0, 0, playersCanvas.width, playersCanvas.height);

    // Draw each user (but myself)
    Object.keys(this.players).forEach((username) => {
      if (username === this.username) return;
      const player = this.players[username];
      const position = Game.fromScaledPosition(
        player.position ?? Game.initialPosition
      );

      Game.drawPlayer(playersCanvasC, position, player.color);
    });
  }

  drawMap() {
    // Clear canvas
    mapCanvasC.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // TODO: Draw map
  }

  resetPosition() {
    this.moving = false;
    this.position = Game.initialPosition;
    this.publishPosition();
    this.drawSelf();
  }

  onMouseDown(event) {
    const position = {
      x: event.offsetX,
      y: event.offsetY,
    };
    // TODO: Check if starting in allowed area

    this.moving = true;
    this.position = Game.toScaledPosition(position);
  }

  onMouseUp(event) {
    if (this.moving) {
      this.resetPosition();
    }
  }

  onMouseLeave(event) {
    if (this.moving) {
      this.resetPosition();
    }
  }

  onMouseMove(event) {
    if (!this.moving) return;

    this.position = Game.toScaledPosition({
      x: event.offsetX,
      y: event.offsetY,
    });
    this.drawSelf();
  }

  publishPosition() {
    // Avoid publishing the same position multiple times
    if (
      this.lastPublishedPosition &&
      this.lastPublishedPosition.x === this.position.x &&
      this.lastPublishedPosition.y === this.position.y
    ) {
      return;
    }

    // Publish new position
    this.client.publish(
      POSITION,
      JSON.stringify({ username: this.username, position: this.position })
    );
    this.lastPublishedPosition = this.position;
  }

  // Misc functions

  initGame() {
    selfCanvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    selfCanvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    selfCanvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));
    selfCanvas.addEventListener("mousemove", this.onMouseMove.bind(this));

    // Draw myself
    this.drawSelf();

    // Draw other players in loop
    setInterval(() => this.drawPlayers(), config.timeMs.drawOthersEvery);

    // Publish position
    setInterval(() => {
      if (this.moving) {
        this.publishPosition();
      }
    }, config.timeMs.publishPositionEvery);
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
    this.username = username;
    this.players = players;
    this.color = players[username].color;

    console.debug("[Game] Unsubscribing from JOIN_RES");
    this.client.unsubscribe(JOIN_RES);

    console.debug("[Game] Creating needed subscriptions");
    this.client.subscribe([POSITION, UPDATE_PLAYER_JOINED, UPDATE_PLAYER_LEFT]);

    console.debug("[Game] Initializing game");
    this.initGame();
  }

  handlePosition(payload) {
    const { username, position } = payload;
    if (!(username in this.players) || username === this.username) {
      if (username !== this.username) {
        console.log("I don't know the user", username);
      }
      return;
    }

    this.players[username].position = position;
  }

  handlePlayerJoined(payload) {
    const { username, player } = payload;

    // Ignore if its myself
    if (username === this.username) return;

    // Add new player
    this.players[username] = { ...player, position: Game.initialPosition };
  }

  handlePlayerLeft(payload) {
    const { username } = payload;

    // Ignore if its myself
    if (username === this.username) return;

    // Delete player that left
    delete this.players[username];
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

console.debug("Configuration:", config);

const params = window.location.search;
console.debug("Window params:", params);

if (params === "?manager=yes") {
  const gameManager = new GameManager();
}

const game = new Game();
