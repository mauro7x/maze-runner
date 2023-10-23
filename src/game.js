import config from "./config.js";
import { generateTopicsForRoom } from "./topics.js";
import rawMaps from "./maps.js";

// ----------------------------------------------------------------------------
// INITIAL CONFIGURATION
// ----------------------------------------------------------------------------

console.debug("Configuration:", config);

// Parse URL
const url = new URL(window.location.href);
const usernameParam = url.searchParams.get("username");
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
  UPDATE_MAP,
  UPDATE_PLAYER_JOINED,
  UPDATE_PLAYER_LEFT,
  USED_ROOM_REQ,
  USED_ROOM_RES,
  SCORE,
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

// Map navigation buttons
function showMapNavigationButtons(gameManager) {
  const mapNavigationContainer = document.getElementById("map-navigation");
  const nextMapButton = document.getElementById("next-map-button");
  const previousMapButton = document.getElementById("previous-map-button");

  mapNavigationContainer.style.display = "flex";

  nextMapButton.addEventListener("click", () => {
    gameManager.nextMap();
  });

  previousMapButton.addEventListener("click", () => {
    gameManager.previousMap();
  });
}

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
  client.on("close", onClose.bind(this));

  // TODO: Handle these events
  client.on("offline", () => console.log("Client went offline"));
  client.on("reconnect", () => console.log("Client reconnected"));
  client.on("disconnect", () => console.log("Client disconnected"));
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

class Maps {
  constructor() {
    this.initMaps();
  }

  initMaps() {
    const parsedMaps = [];

    rawMaps.forEach(({ data, radius }) => {
      parsedMaps.push({
        data,
        radius,
        nRows: data.length,
        nCols: data[0]?.length ?? 0,
      });
    });

    this.maps = parsedMaps;
  }

  length() {
    return this.maps.length;
  }

  get(index) {
    if (index < 0 || index >= this.maps.length) {
      console.error(`[Maps] Index out of range: ${index}`);
      return {};
    }

    return this.maps[index];
  }
}

class GameManager {
  constructor(maps) {
    // Internal state
    this.players = {};
    this.nMaps = maps.length();
    this.currentMapIndex = 0;

    // Client
    this.handlers = {
      [JOIN_REQ]: this.handleJoinRequest.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
      [SCORE]: this.handleScore.bind(this),
    };
    this.client = initClient.bind(this)();
  }

  getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
  }

  nextMap() {
    this.currentMapIndex = (this.currentMapIndex + 1) % this.nMaps;
    this.broadcastMap();
  }

  previousMap() {
    this.currentMapIndex = (this.currentMapIndex - 1 + this.nMaps) % this.nMaps;
    this.broadcastMap();
  }

  broadcastMap() {
    console.log("[GameManager] Broadcasting new map", this.currentMapIndex);
    this.client.publish(
      UPDATE_MAP,
      JSON.stringify({ currentMapIndex: this.currentMapIndex })
    );
  }

  // Handlers

  handleScore(payload) {
    const { username, score } = payload;

    if (!(username in this.players)) {
      console.warn(`[GameManager] Player <${username}> is unknown`);
      return;
    }

    this.players[username].score = score;
    console.log(`[GameManager] Player <${username}> score updated to ${score}`);
  }

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

    // Save it
    this.players[username] = player;

    // Response
    const resPayload = {
      username,
      players: this.players,
      currentMapIndex: this.currentMapIndex,
    };

    this.client.publish(JOIN_RES, JSON.stringify(resPayload));
    console.debug("[GameManager] Join request accepted", resPayload);

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
  constructor(maps) {
    // Internal state
    this.players = {};
    this.maps = maps;
    this.map = null;
    this.username = null;
    this.moving = false;
    this.position = null;
    this.color = null;
    this.score = 0;

    // Optimization
    this.lastPublishedPosition = null;

    // MQTT Client
    this.handlers = {
      [JOIN_RES]: this.handleJoinResponse.bind(this),
      [POSITION]: this.handlePosition.bind(this),
      [SCORE]: this.handleScore.bind(this),
      [UPDATE_PLAYER_JOINED]: this.handlePlayerJoined.bind(this),
      [UPDATE_PLAYER_LEFT]: this.handlePlayerLeft.bind(this),
      [UPDATE_MAP]: this.handleNewMap.bind(this),
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

  static drawPlayer(context, position, color, radius) {
    const scaledRadius = Game.denormalize({
      x: radius.x,
      y: radius.y,
    });

    context.beginPath();
    context.ellipse(
      position.x,
      position.y,
      scaledRadius.x,
      scaledRadius.y,
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
    Game.drawPlayer(selfCanvasC, position, this.color, this.map.radius);
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

      Game.drawPlayer(playersCanvasC, position, player.color, this.map.radius);
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

  displayScores() {
    // Create a sorted scores array
    const scores = Object.entries(this.players).map(([username, player]) => ({
      username,
      score: player.score ?? 0,
    }));
    scores.sort((a, b) => b.score - a.score);

    // Get the HTML element and clear previous values
    const scoreboardListEl = document.getElementById("scoreboard-list");
    scoreboardListEl.innerHTML = "";

    // Display each player's score
    scores.forEach(({ username, score }) => {
      const scoreListEl = document.createElement("li");
      scoreListEl.textContent = `${username}: ${score}`;
      scoreboardListEl.appendChild(scoreListEl);
    });
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

  static processMap(map) {
    const radius = {
      x: map.radius / config.aspectRatio,
      y: map.radius,
    };

    const getSymbol = (position) => {
      const x = Math.max(position.x, 0);
      const y = Math.max(position.y, 0);
      const row = Math.min(Math.floor(y * map.nRows), map.nRows - 1);
      const col = Math.min(Math.floor(x * map.nCols), map.nCols - 1);

      return map.data[row][col];
    };

    const countSymbol = (position, symbol) => {
      const xMax = position.x + radius.x;
      const xMin = position.x - radius.x;
      const yMax = position.y + radius.y;
      const yMin = position.y - radius.y;

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
      ...map,
      radius,
      boundaries: {
        wall: Game.parseRanges(map.data, "-"),
        startingZone: Game.parseRanges(map.data, "I"),
        winningZone: Game.parseRanges(map.data, "W"),
      },
      hitsWall: (position) => countSymbol(position, "-") > 0,
      hitsWinningZone: (position) => countSymbol(position, "W") > 0,
      isStartingZone: (position) => getSymbol(position) === "I",
    };
  }

  shouldIgnoreMessage(username) {
    if (!(username in this.players)) {
      console.warn(`[Game] Player <${username}> is unknown`);
      return true;
    }

    // Ignore if its myself
    if (username === this.username) {
      return true;
    }

    return false;
  }

  updateScore() {
    this.players[this.username].score += config.pointWhenSucces;

    // Broadcast our new score
    this.client.publish(
      SCORE,
      JSON.stringify({
        username: this.username,
        score: this.players[this.username].score,
      })
    );

    // Display
    this.displayScores();
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

  updateMap(mapIndex) {
    const currentMap = this.maps.get(mapIndex);
    this.map = Game.processMap(currentMap);

    // Update HTML
    const mapTextEl = document.getElementById("map-text");
    mapTextEl.innerText = `Map: ${mapIndex + 1}`;

    // Draw
    this.drawMap();
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

    // Display scores
    this.displayScores();

    // Draw other players in loop
    setInterval(() => this.drawPlayers(), config.timeMs.drawOthersEvery);

    // Publish position in loop
    setInterval(() => {
      if (this.moving) {
        this.publishPosition();
      }
    }, config.timeMs.publishPositionEvery);
  }

  joinGame() {
    const payload = {
      username: usernameParam,
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

  // Mouse handlers

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

    if (this.map.hitsWinningZone(position)) {
      this.stopMoving();
      this.updateScore();
      return;
    }

    this.position = position;
    this.drawSelf();
  }

  // Handlers

  handleJoinResponse(payload) {
    console.debug("[Game] Join response received", payload);
    const { username, players, currentMapIndex } = payload;
    this.username = username;
    this.players = players;
    this.color = players[username].color;
    this.score = 0;
    this.updateMap(currentMapIndex);

    console.debug("[Game] Unsubscribing from JOIN_RES");
    this.client.unsubscribe(JOIN_RES);

    console.debug("[Game] Adding listener for exitGame");
    window.addEventListener("beforeunload", this.exitGame.bind(this));

    console.debug("[Game] Creating needed subscriptions");
    this.client.subscribe([
      POSITION,
      SCORE,
      UPDATE_MAP,
      UPDATE_PLAYER_JOINED,
      UPDATE_PLAYER_LEFT,
    ]);

    console.debug("[Game] Initializing game");
    this.initGame();
  }

  handlePosition(payload) {
    const { username, position, moving } = payload;
    if (!(username in this.players) || username === this.username) {
      if (username !== this.username) {
        console.log("I don't know the user", username);
      }
      return;
    }

    this.players[username].position = position;
    this.players[username].moving = moving;
  }

  handleScore(payload) {
    const { username, score } = payload;
    if (this.shouldIgnoreMessage(username)) return;

    this.players[username].score = score;
    this.displayScores();

    console.log(`[Game] Player <${username}> score updated to ${score}`);
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

    this.displayScores();

    console.log(`[Game] Player <${username}> connected!`);
  }

  handlePlayerLeft(payload) {
    const { username } = payload;
    if (this.shouldIgnoreMessage(username)) return;

    // Delete player that left
    delete this.players[username];

    // Re-display scores
    this.displayScores();

    console.log(`[Game] Player <${username}> disconnected`);
  }

  handleNewMap(payload) {
    const { currentMapIndex } = payload;
    console.log("[Game] New map received", currentMapIndex);
    this.updateMap(currentMapIndex);
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

const maps = new Maps();

if (owner === "yes") {
  const gameManager = new GameManager(maps);
  showMapNavigationButtons(gameManager);
}

const game = new Game(maps);
