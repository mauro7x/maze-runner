export default {
  emqx: {
    host: "localhost",
    port: 8083,
  },
  timeMs: {
    publishPositionEvery: 50,
    drawOthersEvery: 50,
    checkWinEvery: 50,
  },
  radius: 0.02,
  aspectRatio: 4 / 3,
  colors: {
    wall: "rgb(255, 0, 255)",
    startingZone: "rgb(0, 0, 255)",
    winningZone: "rgb(0, 255, 0)",
  },

  pointWhenSucces: 50,
};
