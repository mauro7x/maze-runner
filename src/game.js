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
  UPDATE_SCORES,
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

function processMap(map) {
  const nRows = map.length;
  const nCols = map[0]?.length ?? 0;

  const getSymbol = (position) => {
    const row = Math.floor(position.y * nRows);
    const col = Math.floor(position.x * nCols);

    return map[row][col];
  };

  const countSymbol = (position, symbol) => {
    const xMax = position.x + Game.xRadius;
    const xMin = position.x - Game.xRadius;
    const yMax = position.y + Game.yRadius;
    const yMin = position.y - Game.yRadius;

    const points = [
      [xMin, yMin],
      [xMin, yMax],
      [xMax, yMin],
      [xMax, yMax],
    ];

    let count = 0;
    points.forEach(([x, y]) => {
      if (getSymbol({ x, y }) === symbol) {
        count += 1;
      }
    });

    return count;
  };

  return {
    raw: map,
    nRows,
    nCols,
    boundaries: {
      wall: Game.parseRanges(map, "-"),
      startingZone: Game.parseRanges(map, "I"),
      winningZone: Game.parseRanges(map, "W"),
    },
    hitsWall: (position) => countSymbol(position, "-") > 0,
    hitsWinningZone: (position) => countSymbol(position, "W") > 0,
    isStartingZone: (position) => getSymbol(position) === "I",
  };
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
    this.map = map;

    // Client
    this.handlers = {
      [JOIN_REQ]: this.handleJoinRequest.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
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
    };
    this.players[username] = player;

    // Response
    const resPayload = {
      username,
      players: this.players,
      map: this.map,
      score: 0,
    };
    console.debug("[GameManager] Join request accepted", resPayload);
    this.client.publish(JOIN_RES, JSON.stringify(resPayload));

    // Broadcast new player
    const broadcastPayload = {
      username,
      player,
      score: 0,
    };
    console.debug("[GameManager] Broadcasting new joined player", resPayload);
    this.client.publish(UPDATE_PLAYER_JOINED, JSON.stringify(broadcastPayload));

    console.log(`[GameManager] Player <${username}> connected`);
  }

  handlePlayerLeft(payload) {
    const { username, score } = payload;

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
  static xRadius = config.radius / config.aspectRatio;
  static yRadius = config.radius;

  constructor() {
    // Internal state
    this.players = {};
    this.username = null;
    this.moving = false;
    this.position = null;
    this.color = null;
    this.map = null;
    this.score = 0;
    // Optimization
    this.lastPublishedPosition = null;

    // MQTT Client
    this.handlers = {
      [JOIN_RES]: this.handleJoinResponse.bind(this),
      [POSITION]: this.handlePosition.bind(this),
      [UPDATE_PLAYER_JOINED]: this.handlePlayerJoined.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
      [UPDATE_SCORES]: this.handleScore.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  // Draw helper functions

  static getRadius() {
    return Game.normalize({ x: Game.radius, y: Game.radius });
  }

  static normalize(position) {
    return {
      x:
        Math.min(Math.max(position.x, 0), selfCanvas.width) /
        (selfCanvas.width + 1),
      y:
        Math.min(Math.max(position.y, 0), selfCanvas.height) /
        (selfCanvas.height + 1),
    };
  }

  static denormalize(normalizedPosition) {
    return {
      x: normalizedPosition.x * selfCanvas.width,
      y: normalizedPosition.y * selfCanvas.height,
    };
  }

  static drawPlayer(context, position, color) {
    const radius = Game.denormalize({ x: Game.xRadius, y: Game.yRadius });

    context.beginPath();
    context.ellipse(
      position.x,
      position.y,
      radius.x,
      radius.y,
      0,
      Math.PI * 2,
      false
    );
    context.fillStyle = color;
    context.fill();
    context.closePath();
  }

  static drawRectangle(context, x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  }

  static drawRange(context, boundaries, boundWidth, boundHeight, color) {
    boundaries.forEach(([i, j, width]) => {
      Game.drawRectangle(
        context,
        j * boundWidth,
        i * boundHeight,
        boundWidth * width,
        boundHeight,
        color
      );
    });
  }

  drawSelf() {
    // Clear canvas
    selfCanvasC.clearRect(0, 0, selfCanvas.width, selfCanvas.height);

    // Acts as an erase() function
    if (!this.position) return;

    // Scale position and draw myself
    const position = Game.denormalize(this.position);
    // TODO: Add some distinctive to know its myself
    Game.drawPlayer(selfCanvasC, position, this.color);
  }

  drawPlayers() {
    // Clear canvas
    playersCanvasC.clearRect(0, 0, playersCanvas.width, playersCanvas.height);

    // Draw each user (but myself)
    Object.keys(this.players).forEach((username) => {
      // Ignore myself
      if (username === this.username) return;

      const player = this.players[username];

      // Ignore players that are not moving
      if (!player.moving) return;

      // Compute position (scaling)
      const position = Game.denormalize(player.position);

      Game.drawPlayer(playersCanvasC, position, player.color);
    });
  }

  drawMap() {
    const { nCols, nRows, boundaries, startingZone, winningZone } = this.map;

    // Clear canvas
    mapCanvasC.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Compute width and height of each bound
    const boundWidth = mapCanvas.width / nCols;
    const boundHeight = mapCanvas.height / nRows;

    // Draw boundaries
    Game.drawRange(
      mapCanvasC,
      this.map.boundaries.wall,
      boundWidth,
      boundHeight,
      config.colors.wall
    );

    // Draw starting zone
    Game.drawRange(
      mapCanvasC,
      this.map.boundaries.startingZone,
      boundWidth,
      boundHeight,
      config.colors.startingZone
    );

    // Draw winning zone
    Game.drawRange(
      mapCanvasC,
      this.map.boundaries.winningZone,
      boundWidth,
      boundHeight,
      config.colors.winningZone
    );
  }

  updateScore() {
    this.score += config.pointWhenSucces;
    this.client.publish(
      UPDATE_SCORES,
      JSON.stringify({ username: this.username, score: this.score })
    );
  }

  checkWinningZone() {
    if (!this.map.hitsWinningZone(this.position)) {
      return;
    }
    this.stopMoving();
    // Update score
    this.updateScore();
  }

  onMouseDown(event) {
    const position = Game.normalize({
      x: event.offsetX,
      y: event.offsetY,
    });

    if (!this.map.isStartingZone(position)) {
      alert("You cannot start outside the starting zone");
      return;
    }

    this.moving = true;
    this.position = position;
    this.drawSelf();
  }

  onMouseUp(event) {
    if (this.moving) {
      this.stopMoving();
    }
  }

  onMouseLeave(event) {
    if (this.moving) {
      this.stopMoving();
    }
  }

  onMouseMove(event) {
    if (!this.moving) return;

    const position = Game.normalize({
      x: event.offsetX,
      y: event.offsetY,
    });

    if (this.map.hitsWall(position)) {
      this.stopMoving();
      return;
    }

    this.position = position;
    this.drawSelf();
  }

  // Misc functions

  static parseRanges(map, target) {
    const ranges = [];

    map.forEach((row, i) => {
      row.forEach((symbol, j) => {
        if (symbol !== target) {
          return;
        }

        // We merge ranges horizontally if possible
        const lastValue = ranges[ranges.length - 1];
        if (
          lastValue &&
          lastValue[0] === i &&
          lastValue[1] + lastValue[2] === j
        ) {
          ranges[ranges.length - 1][2] += 1;
          return;
        }

        // If not, we just add a new boundary
        ranges.push([i, j, 1]);
      });
    });

    return ranges;
  }

  stopMoving() {
    this.moving = false;
    this.position = null;
    this.drawSelf(); // it will erase myself since position = null

    // Publish that we stopped moving
    this.client.publish(
      POSITION,
      JSON.stringify({ username: this.username, position: null, moving: false })
    );
    this.lastPublishedPosition = null;
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
      JSON.stringify({
        username: this.username,
        position: this.position,
        moving: true,
      })
    );
    this.lastPublishedPosition = this.position;
  }

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

    // Draw other players in loop
    setInterval(() => this.drawPlayers(), config.timeMs.drawOthersEvery);

    // Publish position
    setInterval(() => {
      if (this.moving) {
        this.publishPosition();
      }
    }, config.timeMs.publishPositionEvery);

    // Check if we are in the winning zone
    setInterval(() => {
      if (this.moving) {
        this.checkWinningZone();
      }
    }, config.timeMs.checkWinEvery);
  }

  joinGame() {
    const payload = {
      username: "Username",
      score: 0,
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
    const { username, players, map, score } = payload;
    this.username = username;
    this.players = players;
    this.map = processMap(map);
    this.color = players[username].color;
    this.score = score;

    console.debug("[Game] Unsubscribing from JOIN_RES");
    this.client.unsubscribe(JOIN_RES);

    console.debug("[Game] Adding listener for exitGame");
    window.addEventListener("beforeunload", this.exitGame.bind(this));

    console.debug("[Game] Creating needed subscriptions");
    this.client.subscribe([
      POSITION,
      UPDATE_PLAYER_JOINED,
      UPDATE_PLAYER_LEFT,
      UPDATE_SCORES,
    ]);

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
    const { username, player, score } = payload;

    // Ignore if its myself
    if (username === this.username) return;

    // Add new player
    this.players[username] = {
      ...player,
      position: null,
      moving: false,
      score: 0,
    };
  }

  displayScore() {
    const scoresContainer = document.getElementById("scores-container");
    // Clear the previous scores
    scoresContainer.innerHTML = "";

    // Display each player's score
    Object.keys(this.players).forEach((username) => {
      const scoreElement = document.createElement("p");
      scoreElement.textContent = `${username}: Score - ${this.players[username].score}`;
      scoresContainer.appendChild(scoreElement);
    });
  }

  handleScore(payload) {
    const { username, score } = payload;

    if (!(username in this.players)) {
      console.warn(`[Game] Player <${username}> is unknown`);
      return;
    }
    this.displayScore();
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
