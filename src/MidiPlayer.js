const EventEmitter = require('events');
const Consts = require('./Consts');
const MidiFile = require('./MidiFile');

const INTERVAL_MS = 1;

module.exports = class MidiPlayer extends EventEmitter{
    constructor(data){
        super();
        if(data) this.load(data);
    }
    
    load(data){
        if(this.playing) this.pause();
        if(data instanceof MidiFile){
            this.d = data;
        }else{
            this.d = new MidiFile(data);
        }
        this.playms = 0;
        this.lastplayms = 0;
        this.playtick = 0;
        this.tempo = 1; // 배속 설정
        this.reset_notes(true);

        // reset sysex가 없는 midi파일의 경우 gs reset을 기본으로 적용하도록 설정
        this.trigger_midi_event({
            type:Consts.events.subtypes.SYSEX,
            data:[0x41,0x10,0x42,0x12,0x40,0x00,0x7f,0x00,0x41,0xf7]
        });
    }

    trigger_midi_event(event){
        // 두번째 인자로 들어가는 배열은 Synth에 보내는 midi message(없을 경우 null로 설정)
        if(event.type == Consts.events.types.SYSEX){
            // Sysex
            this.emit('midievent',event,[event.type,...event.data]);
        }else if(event.type == Consts.events.types.MIDI){
            // 일반적인 Midi 이벤트
            this.emit('midievent',event,[(event.subtype << 4) + event.channel,...event.params]);
        }else if(event.type == Consts.events.types.META){
            // Synth에 보낼 필요가 없는 Meta 이벤트
            this.emit('midievent',event,null);
        }
    }

    reset_notes(reset_everything = false){
        for(var i = 0;i < 16;i++){
            // 모든 노트 끄기
            this.trigger_midi_event({
                type:Consts.events.types.MIDI,
                subtype:Consts.events.subtypes.midi.CONTROL_CHANGE,
                channel:i,
                params:[Consts.events.subtypes.midi.cc.ALL_SOUND_OFF,0]
            });

            // 피치벤드 초기화
            this.trigger_midi_event({
                type:Consts.events.types.MIDI,
                subtype:Consts.events.subtypes.midi.PITCH_BEND,
                channel:i,
                params:[0,64]
            });

            // sustain(피아노의 오른쪽 페달과 같은 기능) 끄기
            this.trigger_midi_event({
                type:Consts.events.types.MIDI,
                subtype:Consts.events.subtypes.midi.CONTROL_CHANGE,
                channel:i,
                params:[Consts.events.subtypes.midi.cc.SUSTAIN_ONOFF,0]
            });
            if(reset_everything){
                // 모든 controller 초기화
                this.trigger_midi_event({
                    type:Consts.events.types.MIDI,
                    subtype:Consts.events.subtypes.midi.CONTROL_CHANGE,
                    channel:i,
                    params:[Consts.events.subtypes.midi.cc.RESET_ALL_CONTROLLERS,0]
                });

                // 모든 patch를 0번(acoustic grand piano)로 초기화
                this.trigger_midi_event({
                    type:Consts.events.types.MIDI,
                    subtype:Consts.events.subtypes.midi.PROGRAM_CHANGE,
                    channel:i,
                    params:[0,0]
                });
            }
        }
    }
    
    get current_tick(){
        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if(!this.d.ticks_per_beat){
            return Math.round(this.playms / (this.d.header.tick_resolution / 1000));
        }
        
        let events = this.d.tempo_events.get_events();
        for(let i in events){ // i는 해당 이벤트가 발생해야 하는 틱
            for(let j in events[i]){
                if(events[i][j].playTime < this.playms){
                    // 알 수 없는 이유로 인해
                    // i가 문자열이 되면서
                    // 잘 되던 게 갑자기 ㅈㄴ
                    // 두두두두둗두두둑 하고
                    // 그냥 끝나버리는 버그 수정
                    // ㅆ발 이거때메 ㅈㄴ놀랐음
                    i = parseInt(i,10);
                    j = parseInt(j,10);
                    return Math.round(((this.playms - events[i][j].playTime) / (events[i][j].tempo / 1000) * this.d.header.ticks_per_beat) + i);
                }
            }
        }
    }

    set current_tick(val){
        this.reset_notes();
        // 저 위에 그 get current_tick의 역연산
        this.playtick = val;
        
        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if(!this.d.ticks_per_beat){
            this.playms = Math.round(val * (this.d.header.tick_resolution / 1000));
            return;
        }
        
        let events = this.d.tempo_events.get_events();
        for(let i in events){ // i는 해당 이벤트가 발생해야 하는 틱
            for(let j in events[i]){
                if(i < this.current_tick){
                    // 혹시 모르니 여기도...
                    i = parseInt(i,10);
                    j = parseInt(j,10);
                    this.playms = Math.round(((val - i) / this.d.header.ticks_per_beat * (events[i][j].tempo / 1000)) + events[i][j].playTime);
                }
            }
        }
    }
    
    get current_ms(){ return this.playms; }
    set current_ms(val){
        this.reset_notes();
        this.playms = Math.round(val);
        this.playtick = this.current_tick;
    }
    
    get duration_tick(){ return this.d.header.duration_tick; }
    
    get duration_ms(){ return this.d.header.duration_ms; }
    
    get ended(){
        return this.current_tick >= this.duration_tick && this.current_ms >= this.duration_ms;
    }
    
    play(){
        if(this.playing) return;
        this.lastplayms = Date.now();
        this.playing = true;
        this.interval = setInterval(this.play_loop.bind(this),INTERVAL_MS);
    }
    
    pause(){
        if(!this.playing) return;
        this.reset_notes();
        this.playing = false;
        clearInterval(this.interval);
    }
    
    play_loop(){
        if(this.in_loop) return;
        this.in_loop = true;
        // 밀리초 계산
        let now = Date.now();
        let elapsed_ms = (now - this.lastplayms)*this.tempo;
        this.lastplayms = now;
        this.playms += elapsed_ms;
        
        // 실제 이벤트 수행
        let current_tick = this.current_tick;
        let t = current_tick - this.playtick;
        for(let i = 0;i < t;i++){
            this.d.tracks.forEach(track => {
                let events = track.get_events();
                if(events[this.playtick]){
                    events[this.playtick].forEach(this.trigger_midi_event.bind(this));
                }
            });
            this.playtick++;
        }

        if(this.ended){
            this.pause();
        }
        this.in_loop = false;
    }
}