# zxe-midi-player
Read/play standard Midi files.

## Usage
```js
const fs = require('fs');
const { MidiFile,MidiPlayer } = require('zxe-midi-player');

let buf = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or nodejs Buffer

let file = new MidiFile(buf); // MidiFile instance
file.header.format; // 0,1 or 2
file.header.ticks_per_beat; // SMTPE is not supported
file.header.tracks_count; // n
file.header.duration_tick; // duration in tick
file.header.duration_ms; // duration in ms

file.tracks; // array
file.tempo_events; // "set tempo" events

let player; // variable for MidiPlayer instance

// insert MidiFile instance
player = new MidiPlayer(file);

// or insert buffer directly
player = new MidiPlayer(buf);

player.on('midievent',(event,message) => {
    event; // information of event
    message; // midi message. if it is null, this event is meta event
});

player.play();
player.pause();

player.tempo; // similar as HTMLMediaElement.playbackRate
player.duration_tick; // same as file.header.duration_tick
player.duration_ms; // same as file.header.duration_ms
player.current_tick;
player.current_ms;

let buf2 = fs.readFileSync('....'); // another midi file
player.load(buf2); // loading another midi file

player.play();
```

## Others
This library is using [midifile](https://github.com/nfroidure/midifile) to parse midi files.