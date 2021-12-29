# @kmoon2437/midiplayer
midi/yjk file player

## Usage
```js
const fs = require('fs');
const { MidiPlayer,YJKPlayer } = require('@kmoon2437/midiplayer');

let midi = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

// insert buffer
let player = new MidiPlayer(midi);

player.on('midievent',(event,portnum,message) => {
    event; // information of event
    portnum; // port number. I put it in advance to support the port prefix meta event
    message; // midi message. if it is null, this event is meta event
});

player.play();
player.pause();

player.tempo; // similar to HTMLMediaElement.playbackRate
player.durationTick; // same as MidiFile.header.durationTick
player.durationMs; // same as MidiFile.header.durationMs
player.currentTick;
player.currentMs;

let buf2 = fs.readFileSync('....'); // another midi file
player.load(buf2); // loading another midi file

player.play();

let yjk = fs.readFileSync('...'); // your yjk file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

// The usage is similar to MidiPlayer.
let player2 = new YJKPlayer(yjk,2); // 2 = port count

player2.portCount; // port count
player2.on('midievent',(event,portnum,message) => {
    event; // information of event
    portnum; // port number
    message; // midi message. if it is null, this event is meta event
});
player2.play();
```

## About yjk file
[link](https://github.com/kmoon2437/midifile)