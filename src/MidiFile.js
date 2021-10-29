const fs = require('fs');
const MidiFileData = require('midifile');
const MidiTrack = require('./MidiTrack');
const Consts = require('./Consts');

const DURATION_TAIL_MS = 3000;

module.exports = class MidiFile{
    // unsafe를 true로 설정하면 파일의 duration은 (마지막 midi이벤트 타이밍)+3초 가 됨
    // unsafe를 false로 설정하면 파일의 duration은 (meta이벤트를 포함한 마지막 이벤트 시간)이 됨
    constructor(data,unsafe = true){
        this.d = new MidiFileData(data);
        
        this.header = {
            format:this.d.header.getFormat(),
            ticks_per_beat:null,
            tick_resolution:this.d.header.getTickResolution(),
            tracks_count:this.d.header.getTracksCount(),
        };
        
        if(this.d.header.getTimeDivision() == MidiFileData.Header.TICKS_PER_BEAT){
            this.header.ticks_per_beat = this.d.header.getTicksPerBeat();
        }
        
        this.tracks = [];
        let endtimes = [];
        let endtimes_ms = [];
        let events = this.d.getEvents();
        this.tempo_events = new MidiTrack();
        for(let i = 0;i < this.header.tracks_count;i++){
            let playtick = 0;
            let playms = 0;
            let last_midi_event = 0;
            let last_midi_event_ms = 0;
            let track = new MidiTrack(i);
            events.forEach((event) => {
                playtick += event.delta;
                if(event.track != i) return;
                if(event.type == Consts.events.types.META){
                    // 어차피 event.data에 다 있음
                    delete event.param1;
                    delete event.param2;
                    delete event.param3;
                    delete event.param4;
                }else if(event.type == Consts.events.types.MIDI){
                    let p = [];
                    p.push(event.param1 || 0);
                    p.push(event.param2 || 0);
                    event.params = p;
                    delete event.param1;
                    delete event.param2;
                }else if(event.type == Consts.events.types.SYSEX || event.type == Consts.events.types.DIVSYSEX){
                    // 일관성
                    event.type = Consts.events.types.SYSEX;
                }
                track.add_event(playtick,event);
                if(event.type != Consts.events.types.META){
                    last_midi_event = playtick;
                    last_midi_event_ms = event.playTime;
                }
                if(event.type == Consts.events.types.META && event.subtype == Consts.events.subtypes.meta.SET_TEMPO){
                    this.tempo_events.add_event(playtick,event);
                    
                    // 모든 midi 이벤트가 끝나고도 tempo 이벤트가 남아있는 경우
                    // duration_ms와 duration_tick에 차이가 생기는 것을 방지
                    last_midi_event = playtick;
                    last_midi_event_ms = event.playTime;
                }
            });
            this.tracks.push(track);
            endtimes.push(unsafe ? last_midi_event : playtick);
            endtimes_ms.push(unsafe ? last_midi_event_ms : playms);
        }
        
        this.header.duration_tick = Math.max(...endtimes);
        this.header.duration_ms = Math.round(Math.max(...endtimes_ms));
        
        // duration_tick에도 정확히 3초를 추가
        if(unsafe){
            this.header.duration_ms += 3000;
            let tevents = this.tempo_events.get_events();
            tevents = tevents[Math.max(...Object.keys(tevents))];
            let last_tempo = tevents[tevents.length-1] ? tevents[tevents.length-1].tempo : 500000;
            this.header.duration_tick += Math.round(DURATION_TAIL_MS*1000/last_tempo*this.header.ticks_per_beat);
        }
    }
}