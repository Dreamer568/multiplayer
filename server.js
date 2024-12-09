const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static("public"));

const snakes = {};
const food = { x: Math.floor(Math.random() * 60), y: Math.floor(Math.random() * 40) };

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  // Initialize snake for this player
  snakes[socket.id] = {
    body: [{ x: 30, y: 20 }],
    direction: { x: 0, y: 0 },
  };

  // Handle joystick movement
  socket.on("joystickMove", (data) => {
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y);
    if (magnitude > 10) {
      snakes[socket.id].direction = {
        x: Math.round(data.x / 50),
        y: Math.round(data.y / 50),
      };
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    delete snakes[socket.id];
  });
});

// Wrap snake position when it moves beyond canvas boundaries
function wrapPosition(position, max) {
  if (position < 0) {
    return max - 1;
  } else if (position >= max) {
    return 0;
  }
  return position;
}

// Game loop
function gameLoop() {
  for (let id in snakes) {
    const snake = snakes[id];
    const head = snake.body[0];

    // Move snake
    const newHead = {
      x: wrapPosition(head.x + snake.direction.x, 60), // Wrap horizontally
      y: wrapPosition(head.y + snake.direction.y, 40), // Wrap vertically
    };

    // Check collision with food
    if (newHead.x === food.x && newHead.y === food.y) {
      food.x = Math.floor(Math.random() * 60);
      food.y = Math.floor(Math.random() * 40);
    } else {
      snake.body.pop(); // Remove last segment if not eating
    }

    snake.body.unshift(newHead); // Add new head position
  }

  // Broadcast game state
  io.emit("gameState", { snakes, food });
}

setInterval(gameLoop, 100);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
