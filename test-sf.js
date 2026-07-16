const stockfish = require('stockfish');

stockfish().then(engine => {
  engine.onmessage = (msg) => {
    console.log(msg);
    if (msg === 'uciok') {
      engine.postMessage('position startpos moves e2e4');
      engine.postMessage('go depth 10');
    }
  };
  engine.postMessage('uci');
  setTimeout(() => process.exit(0), 3000);
});
