const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt'); // Connect to MQTT broker
console.log(client) 

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
            this.position = position
            this.radius = 10
        }

    draw() {
        c.beginPath()
        c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false) // Draw a circle
        c.fillStyle = 'white' // Set the color of the circle
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
            //Suscribe to topic
            CollisionTopic();
            return true;
        }
        
        } 
        //Release suscription
        ReleaseCollisionTopic();
        return false;
    }
    
}


const map = [
    ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
    ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    ['-', ' ', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-', '-'],
    ['-', ' ', '-', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', '-', '-'],
    ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    ['-', '-', '-', ' ', '-', '-', ' ', '-', ' ', ' ', '-', ' ', '-', '-', ' ', '-', '-', '-'],
    ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    ['-', ' ', '-', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-'],
    ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
    ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
]

const boundaries = []
const player = new Player({ position: { x : 40, y: 40 } })  

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


//--------------------------------
// Suscriptions to topic functions
//--------------------------------

//Mouse click topic suscription
function ClickTopic(){
    client.subscribe('mouseclick', function (err) {//
        if (!err) {
            console.log('click')
            client.publish('mouseclick', 'click')
        }
    })
}

//Mouse click topic unsubscribe (release suscription)
function ReleaseTopic(){
    client.unsubscribe('mouseclick', function (err) {
        if (!err) {
            console.log('release')
            client.publish('mouseclick', 'release')
        }
    })
}

//Collision topic suscription 
function CollisionTopic(){
    client.subscribe('collision', function (err) {//
        if (!err) {
            console.log('collision')
            client.publish('collision', 'collision')
        }
    })
}

//Collision topic unsubscribe (no collision)
function ReleaseCollisionTopic(){
    client.unsubscribe('collision', function (err) {
        if (!err) {
            //console.log('no collision')
            client.publish('collision', 'no collision')
        }
    })
}

client.on('connect', function () {
    console.log('Connected to the MQTT broker');
});

// Event handler to receive messages
client.on('message', function (topic, message) {
// message is Buffer
    console.log('Received message on topic:', topic, 'Message:', message.toString());
});





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
        //Suscribe to topic
        ClickTopic();

        // Clear the canvas and redraw the boundaries and player
        c.clearRect(0, 0, canvas.width, canvas.height);
        boundaries.forEach((boundary) => {
            boundary.draw();
        });
        player.draw();

        // Check for collision
        player.CollisionDetection(boundaries);
    } else {
        //Release suscription
        ReleaseTopic();
    }
});


