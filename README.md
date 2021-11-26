# zxe-midi-player
midi file player

## Usage
```js
const fs = require('fs');
const { MidiPlayer,ZKPlayer } = require('zxe-midi-player');

let midi = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

// insert buffer
let player = new MidiPlayer(midi);

player.on('midievent',(event,message) => {
    event; // information of event
    message; // midi message. if it is null, this event is meta event
});

player.play();
player.pause();

player.tempo; // similar to HTMLMediaElement.playbackRate
player.duration_tick; // same as MidiFile.header.duration_tick
player.duration_ms; // same as MidiFile.header.duration_ms
player.current_tick;
player.current_ms;

let buf2 = fs.readFileSync('....'); // another midi file
player.load(buf2); // loading another midi file

player.play();

let zk = fs.readFileSync('...'); // your zk file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

// insert buffer
// The usage is the same as MidiPlayer.
let player2 = new ZKPlayer(zk);
```

## About ZK file
[link](https://github.com/kmoon2437/zxe-midi-file)