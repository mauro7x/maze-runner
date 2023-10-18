document.addEventListener("DOMContentLoaded", function () {
  const usernameInput = document.querySelector(".username-input");
  const joinRoomInput = document.getElementById("join-room-input");
  const joinRoomButton = document.getElementById("join-room-button");
  const createRoomButton = document.getElementById("create-room-button");

  function isEmpty(input) {
    return input.value.trim() === "";
  }

  function updateButtonsState() {
    joinRoomButton.disabled = isEmpty(usernameInput) || isEmpty(joinRoomInput);
    createRoomButton.disabled = isEmpty(usernameInput);
  }

  function getRandomRoomName() {
    return Math.random().toString(36).substring(2, 8);
  }

  // Update buttons state when writing
  usernameInput.addEventListener("input", updateButtonsState);
  joinRoomInput.addEventListener("input", updateButtonsState);

  // Join room handler
  joinRoomButton.addEventListener("click", function () {
    if (isEmpty(usernameInput)) {
      alert("You need to write your username first.");
      return;
    }

    if (isEmpty(joinRoomInput)) {
      alert("You need to write the room you want to join.");
      return;
    }

    const roomName = encodeURIComponent(joinRoomInput.value);

    const url = `game.html?room=${roomName}`;
    window.location.replace(url);
  });

  // Create room handler
  createRoomButton.addEventListener("click", async function () {
    if (isEmpty(usernameInput)) {
      alert("You need to write your username first.");
      return;
    }

    const roomName = getRandomRoomName();

    // TODO: Validate room name

    const url = `game.html?room=${roomName}&owner=yes`;
    window.location.replace(url);
  });

  updateButtonsState();
});
