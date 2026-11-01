const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function loadEvents() {
    const source = fs.readFileSync(path.join(root, 'src/app/src/utils/Events.js'), 'utf8')
        .replace(/^import .*;$/m, '')
        .replace('export default class Events', 'class Events');
    const context = vm.createContext({
        window: {getComputedStyle: el => ({webkitTransform: el.style.webkitTransform})},
        WebKitCSSMatrix: class {
            constructor(transform) {
                const values = transform.match(/translate3d\(([^p]+)px,([^p]+)px/);
                this.m41 = Number(values[1]);
                this.m42 = Number(values[2]);
            }
        }
    });
    vm.runInContext(source + '\nthis.Events = Events;', context);
    return context.Events;
}

test('block stays centered on the pointer with a header, scrolling and repeated moves', () => {
    const Events = loadEvents();
    const block = {
        style: {webkitTransform: 'translate3d(371px,500px,0)'},
        getBoundingClientRect() {
            const values = this.style.webkitTransform.match(/translate3d\(([^p]+)px,([^p]+)px/);
            return {left: Number(values[1]) - 35, top: Number(values[2]) + 49 - 70,
                width: 76, height: 78.1};
        }
    };
    Events.dragcanvas = block;
    for (const [clientX, clientY] of [[600, 625], [800, 700], [250, 550]]) {
        Events.centerDraggedBlock({clientX, clientY});
        const rect = block.getBoundingClientRect();
        assert.ok(Math.abs(rect.left + rect.width / 2 - clientX) < 0.001);
        assert.ok(Math.abs(rect.top + rect.height / 2 - clientY) < 0.001);
    }
});

test('touch drag uses viewport coordinates even when page coordinates differ', () => {
    const Events = loadEvents();
    const block = {
        style: {webkitTransform: 'translate3d(0px,0px,0)'},
        getBoundingClientRect: () => ({left: 0, top: 49, width: 100, height: 80})
    };
    Events.dragcanvas = block;
    Events.centerDraggedBlock({touches: [{clientX: 200, clientY: 300, pageY: 700}]});
    assert.equal(block.left, 150);
    assert.equal(block.top, 211);
});

function loadAudio(muted) {
    const ended = [];
    const window = {__scratchJrMuted: muted, Audio: class {
        constructor(src) { this.src = src; this.playCount = 0; }
        play() { this.playCount++; return Promise.resolve(); }
    }};
    const context = vm.createContext({window, navigator: {mediaDevices: {}}, console: {log() {}},
        iOS: {soundDone: name => ended.push(name)}});
    vm.runInContext(fs.readFileSync(path.join(root, 'src/electronClient.js'), 'utf8'), context);
    return {audio: window.tablet, ended};
}

test('mute applies immediately to loaded UI sounds, project sounds and recorded previews', () => {
    const {audio} = loadAudio(false);
    audio.loadSoundFromDataURI('tap.wav', 'data:audio/wav;base64,ui');
    audio.loadSoundFromDataURI('pop.mp3', 'data:audio/mp3;base64,project');
    const preview = {muted: false};
    audio.audioCaptureElement = {audioPlaybackElement: preview};
    audio.setMuted(true);
    assert.equal(audio.currentAudio['tap.wav'].muted, true);
    assert.equal(audio.currentAudio['pop.mp3'].muted, true);
    assert.equal(preview.muted, true);
    audio.setMuted(false);
    assert.equal(audio.currentAudio['tap.wav'].muted, false);
    assert.equal(preview.muted, false);
    assert.equal(audio.currentAudio['pop.mp3'].volume, 0.8);
});

test('restored mute preference applies to new sounds without stalling sound blocks', () => {
    const {audio, ended} = loadAudio(true);
    audio.loadSoundFromDataURI('pop.mp3', 'data:audio/mp3;base64,project');
    const sound = audio.currentAudio['pop.mp3'];
    assert.equal(sound.muted, true);
    audio.io_playsound('pop.mp3');
    assert.equal(sound.playCount, 1);
    sound.onended();
    assert.deepEqual(ended, ['pop.mp3']);
});
