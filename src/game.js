import config from "./config.js";
import { generateTopicsForRoom } from "./topics.js";

// TODO: Create more maps? Create a loading map mechanism?
import map from "./map.js";

// ----------------------------------------------------------------------------
// INITIAL CONFIGURATION
// ----------------------------------------------------------------------------

console.debug("Configuration:", config);

// Parse URL
const url = new URL(window.location.href);
const room = url.searchParams.get("room");
const owner = url.searchParams.get("owner");

// Update room's name
const roomTextEl = document.getElementById("room-text");
roomTextEl.innerText = `Room: ${room}`;

// Generate topics for room
const {
  JOIN_REQ,
  JOIN_RES,
  KEEPALIVE,
  POSITION,
  UPDATES,
  UPDATE_MAP,
  UPDATE_PLAYER_JOINED,
  UPDATE_PLAYER_LEFT,
  USED_ROOM_REQ,
  USED_ROOM_RES,
} = generateTopicsForRoom(room);

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
const mapCanvas = document.getElementById("map-canvas");
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

function onConnect() {
  // Create web worker using our "keepAlive()" function
  this.keepAliveWorker = createWebWorker(keepAlive);

  // Event listener for our Web Worker
  this.keepAliveWorker.addEventListener("message", (event) => {
    // Ping our mqtt connection to keep it alive
    this.client.publish(KEEPALIVE, "ping");
  });

  // Custom handler
  this.onConnect();
}

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

function onClose() {
  console.log("Client closed");
  this.keepAliveWorker?.terminate();
}

function initClient() {
  const { host, port } = config?.emqx;
  const client = mqtt.connect(
    `ws://${host ?? "localhost"}:${port ?? 8083}/mqtt`,
    {
      keepalive: 0,
    }
  );

  // Initialize handlers
  client.on("connect", onConnect.bind(this));
  client.on("message", onMessage.bind(this));

  // TODO: Handle these events
  client.on("offline", () => console.log("Client went offline"));
  client.on("reconnect", () => console.log("Client reconnected"));
  client.on("disconnect", () => console.log("Client disconnected"));
  client.on("close", onClose.bind(this));
  client.on("error", () => console.error("Client error"));

  return client;
}

// ----------------------------------------------------------------------------
// KEEP ALIVE WEIRD HACKFIX
// https://github.com/mqttjs/MQTT.js/issues/1257#issuecomment-987094416
// ----------------------------------------------------------------------------

// This Web Worker logic will notify our application to ping our MQTT connection to keep it alive.
function keepAlive() {
  setInterval(() => {
    self.postMessage("keep-alive"); // will post to our application, doesn't need to be named 'keep-alive' can be anything
  }, 15000); // every 15 seconds
}

// Creates a web worker via blob (instead of file)
function createWebWorker(func) {
  return new Worker(
    URL.createObjectURL(
      new Blob(["(" + func.toString() + ")()"], { type: "text/javascript" })
    )
  );
}

// ----------------------------------------------------------------------------
// CLASSES DEFINITION
// ----------------------------------------------------------------------------

class GameManager {
  constructor() {
    // Internal state
    this.players = {};

    // Map
    this.initMap(map);

    // Client
    this.handlers = {
      [JOIN_REQ]: this.handleJoinRequest.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  initMap(map) {
    const nRows = map.length;
    const nCols = map[0]?.length ?? 0;

    let foundInitial = false; // Flag for "I"
    let foundWinning = false; // Flag for "W"

    let startingZone = null;
    let winningZone = null;

    //process map
    map.forEach((row, i) => {
      if (foundInitial && foundWinning) return;
      row.forEach((symbol, j) => {
        if (!foundInitial && symbol === "I") {
          startingZone = {
            x: [j / nCols, (j + 2) / nCols],
            y: [i / nRows, (i + 1) / nRows],
          };
          foundInitial = true;
        }

        if (!foundWinning && symbol === "W") {
          winningZone = {
            x: [j / nCols, (j + 2) / nCols],
            y: [i / nRows, (i + 1) / nRows],
          };
          foundWinning = true;
        }
      });
    });

    // Fix the initial position in the middle of the starting zone
    const initialPosition = {
      x: (startingZone.x[0] + startingZone.x[1]) / 2,
      y: (startingZone.y[0] + startingZone.y[1]) / 2,
    };

    // Construct map object
    this.map = {
      data: map,
      initialPosition,
      winningZone,
      startingZone,
      nRows,
      nCols,
    };
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
      map: this.map,
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

    console.log(`[GameManager] Player <${username}> connected`);
  }

  handlePlayerLeft(payload) {
    const { username } = payload;

    if (!(username in this.players)) {
      console.warn(`[GameManager] Player <${username}> is unknown`);
      return;
    }

    console.log(`[GameManager] Player <${username}> disconnected`);

    // Delete player that left
    delete this.players[username];
  }

  // Callbacks

  onConnect() {
    console.debug("[GameManager] Client connected");
    const topicsToSubscribe = Object.keys(this.handlers);
    this.client.subscribe(topicsToSubscribe);
  }
}

class Game {
  static radius = 5;

  constructor() {
    // Internal state
    this.players = {};
    this.username = null;
    this.moving = false;
    this.position = null;
    this.color = null;
    this.map = null;
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
        player.position ?? this.map.initialPosition
      );

      Game.drawPlayer(playersCanvasC, position, player.color);
    });
  }

  drawMap() {
    const { data, nCols, nRows } = this.map;
    // Clear canvas
    mapCanvasC.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    const boundWidth = mapCanvas.width / nCols;
    const boundHeight = mapCanvas.height / nRows;

    data.forEach((row, i) => {
      row.forEach((symbol, j) => {
        switch (symbol) {
          case "-":
            mapCanvasC.fillStyle = "rgb(255, 0, 255)";
            mapCanvasC.fillRect(
              j * boundWidth,
              i * boundHeight,
              boundWidth,
              boundHeight
            );
            break;
          case "W":
            mapCanvasC.fillStyle = "rgb(0, 255, 0)";
            mapCanvasC.fillRect(
              j * boundWidth,
              i * boundHeight,
              boundWidth,
              boundHeight
            );
            break;

          case "I":
            mapCanvasC.fillStyle = "rgb(0, 0, 255)";
            mapCanvasC.fillRect(
              j * boundWidth,
              i * boundHeight,
              boundWidth,
              boundHeight
            );
            break;
        }
      });
    });
  }

  resetPosition() {
    this.moving = false;
    this.position = this.map.initialPosition;
    this.publishPosition();
    this.drawSelf();
  }

  onMouseDown(event) {
    const position = {
      x: event.offsetX,
      y: event.offsetY,
    };

    this.position = Game.toScaledPosition(position);

    // Check if starting in starting zone
    if (
      this.map.startingZone.x[0] <= this.position.x &&
      this.position.x <= this.map.startingZone.x[1] &&
      this.map.startingZone.y[0] <= this.position.y &&
      this.position.y <= this.map.startingZone.y[1]
    ) {
      this.moving = true;
      this.drawSelf();
    } else {
      alert("You can't start outside the starting (blue) zone");
      return;
    }
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

    // Draw map
    this.drawMap();

    // Re-draw map when resizing window
    window.addEventListener(
      "resize",
      function (event) {
        this.drawMap();
      }.bind(this)
    );

    // Set initial position and draw myself
    this.resetPosition();

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

  exitGame(event) {
    event.preventDefault(); // Avoid browser from closing

    const payload = { username: this.username };
    this.client.publish(UPDATE_PLAYER_LEFT, JSON.stringify(payload));
    this.client.end();

    // Continue closing the browser window
    return null;
  }

  // Handlers
  handleJoinResponse(payload) {
    console.debug("[Game] Join response received", payload);
    const { username, players, map } = payload;
    this.username = username;
    this.players = players;
    this.map = map;
    this.color = players[username].color;

    console.debug("[Game] Unsubscribing from JOIN_RES");
    this.client.unsubscribe(JOIN_RES);

    console.debug("[Game] Adding listener for exitGame");
    window.addEventListener("beforeunload", this.exitGame.bind(this));

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
    this.players[username] = { ...player, position: this.map.initialPosition };
  }

  handlePlayerLeft(payload) {
    const { username } = payload;

    if (!(username in this.players)) {
      console.warn(`[Game] Player <${username}> is unknown`);
      return;
    }

    // Ignore if its myself
    if (username === this.username) return;

    console.log(`[Game] Player <${username}> disconnected`);

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

if (owner === "yes") {
  const gameManager = new GameManager();
}

const game = new Game();
