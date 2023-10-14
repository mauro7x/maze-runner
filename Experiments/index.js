//-----------------------------
// Client
//-----------------------------

const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt'); // Connect to MQTT broker
console.log(client) 
client.on('connect', function () {
    console.log('Connected to the MQTT broker');
});
// Event handler to receive messages
client.on('message', function (topic, message) {
    // message is Buffer
        console.log('Received message on topic:', topic, 'Message:', message.toString());
    });
    
//-----------------------------
// Map and player functions
//-----------------------------
const canvas = document.querySelector('canvas') // Get the canvas element
c = canvas.getContext('2d') // Get the context of the canvas element

canvas.width = innerWidth // Set the width of the canvas to the width of the window
canvas.height = innerHeight // Set the height of the canvas to the height of the window

class Boundary { // Create a class for the boundaries
    static width = 40
    static height = 40 
    constructor({ position }) {  
        this.position = position
        this.width = 40
        this.height = 40
    }

    draw() {
        c.fillStyle = 'rgb(255, 0, 255)'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
    }
}

class Player { // Create a class for the player
    constructor({ position}) {
        this.id = this.generateUniquePlayerId(); // Generate a unique ID for the player
        this.color = this.getRandomColor(); // Generate a random color for the player
        this.position = position
        this.radius = 10
        this.score = 0 // Set the initial score to 0
             
        // Publish the position of the player every 100ms
        this.positionPublishInterval = setInterval(() => {
        this.publishPosition();
        }, 100);

        //Suscribe to other players positions
        this.subscribeToOtherPlayersPositions();

        //Suscribe to other players scores
        this.subscribeToOtherPlayersScores();
    }

    draw() {
        c.beginPath()
        c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false) // Draw a circle
        c.fillStyle = this.color // Set the color of the circle
        c.fill() // Fill the circle with the color
        c.closePath() 
    }

    CollisionDetection(boundaries) {
        for (const boundary of boundaries){
            if (
                this.position.x + this.radius > boundary.position.x &&
                this.position.x - this.radius < boundary.position.x + boundary.width &&
                this.position.y + this.radius > boundary.position.y &&
                this.position.y - this.radius < boundary.position.y + boundary.height
        ){
            return true;
        }
        
        } 

        return false;
    }

    // Generate an unique player id
    generateUniquePlayerId() {
        // Puedes utilizar una combinación de un prefijo y un número aleatorio
        return 'player_' + Math.floor(Math.random() * 1000000);
    }

    //Generate a random color
    getRandomColor() {
        const r = Math.floor(Math.random() * 256); 
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256); 
        return `rgb(${r}, ${g}, ${b})`; 
    }

    // Publish the position of the player
    publishPosition() {
        client.publish('player_positions/' + this.id, JSON.stringify(this.position));
        //console.log('published position', this.position);
    }

    // Suscribe to the positions of other players
    subscribeToOtherPlayersPositions() {
        client.subscribe('player_positions/+');
        console.log('subscribed to player positions');
    }

    //Suscribe to the scores of other players
    subscribeToOtherPlayersScores() {
        client.subscribe('player_scores/+');
        console.log('subscribed to player scores');
    }

    //Reset the player to the initial position
    resetToInitialPosition() {
        this.position.x = initialPlayerPosition.x;
        this.position.y = initialPlayerPosition.y;
    }

    //Check if the player has reached the win position
    checkWinPosition() {
        const rowIndex = Math.floor(this.position.y / Boundary.height);
        const colIndex = Math.floor(this.position.x / Boundary.width);
    
        // Check if the indices are within the bounds of the map
        if (rowIndex >= 0 && rowIndex < map.length && colIndex >= 0 && colIndex < map[0].length) {
            // Check if the element at the indices is 'W'
            if (map[rowIndex][colIndex] == 'W') {
                return true;
            }
        }
    
        return false; // Default to false if the indices are out of bounds or not 'W'
    }

    //Update the score
    updateScore() {
        this.score += 1;
        const scoreElement = document.getElementById('score');
        scoreElement.textContent = 'Score: ' + this.score; // Update the displayed score
        client.publish('player_scores/' + this.id, JSON.stringify(this.score)); // Publish the score
    }

    
}

const map = [
    [' ',' ',' ',' ',' ',' ',' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ',' ',' ',' ',' ',' ',' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ',' ',' ',' ',' ',' ',' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ',' ',' ',' ',' ',' ',' ', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'W', 'W', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', '-', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', '-', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', '-', '-', ' ', '-', '-', ' ', '-', ' ', ' ', '-', ' ', '-', '-', ' ', '-', '-', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', '-', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    [' ',' ',' ',' ',' ',' ',' ','-', ' ', ' ', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
]

const boundaries = []

// Set an initial position for the player at the bottom left corner of the map
const initialPlayerPosition = {
    x: Boundary.width,
    y: canvas.height - Boundary.height
}
const player = new Player({ position: initialPlayerPosition });

// Create the boundaries based on the map
map.forEach((row, i)=>{ //i represents the index of the row
    row.forEach((symbol, j) => {
        switch(symbol) {
            case '-':
                boundaries.push(
                    new Boundary({ 
                        position: { 
                            x: Boundary.width * j,
                            y: Boundary.height * i 
                        }
                    })
                )
                break
        }
    })
})


//-----------------------------
// Actions
//-----------------------------


// Add an event listener to track mouse movement when the mouse is down
let isMouseDown = false;


canvas.addEventListener("mousedown", () => {
    isMouseDown = true;
});

canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
});


canvas.addEventListener("mousemove", (event) => {
    // Move the player only when the mouse button is down
    if (isMouseDown) {
        player.position.x = event.clientX;
        player.position.y = event.clientY;
        
        //Check if the player has won
        if (player.checkWinPosition()) {
            player.updateScore();
        }

        // Clear the canvas and redraw the boundaries and player
        c.clearRect(0, 0, canvas.width, canvas.height);
        boundaries.forEach((boundary) => {
            boundary.draw();
        });

        player.draw();

        // Check for collision
        player.CollisionDetection(boundaries);
        //When a collition is detected, the player is moved to the initial position
        if (player.CollisionDetection(boundaries)) {
            player.resetToInitialPosition();
            console.log('collision detected');
        }
        
    }
});



