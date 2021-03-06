import * as util from '../component/util.js';
import * as settings from '../component/settings.js';

let UIButtonPomodoro = document.getElementById('UIButtonPomodoro');
let UIButtonShortBreak = document.getElementById('UIButtonShortBreak');
let UIButtonLongBreak = document.getElementById('UIButtonLongBreak');
let UIButtonSettings = document.getElementById('UIButtonSettings');

let canvas, stage;
let dragging = false;
let lastX;
let marker;
let background;
let _settings;

async function onTickInterval() {
    browser.runtime.sendMessage({ id: 'GET_POMODORO' });
}

async function stopTimer() {
    console.error("Unable to send message with id STOP_TIMER");
}

async function startTimer(duration, task) {
    browser.runtime.sendMessage({ id: 'START_TIMER', duration: duration, task: task });
    onTickInterval();
}

async function onPomodoro() {
    startTimer(_settings.duration.work, 'WORK');
}

async function onShortBreak() {
    startTimer(_settings.duration.shortBreak, 'SHORT_BREAK');
}

async function onLongBreak() {
    startTimer(_settings.duration.longBreak, 'LONG_BREAK');
}

async function openOptionsPage() {
    browser.runtime.openOptionsPage();
}

async function init() {
    _settings = await settings.get();
    initCanvas();
    initEventListeners();
    onTickInterval();
    let timeout = setInterval(onTickInterval, 1000);
}

async function getValue() {
    return Math.abs(marker.x / 15);;
}

async function setValue(a, animationDuration) {
    if (a > 60)
        a = 60;

    if (a < 0)
        a = 0;

    createjs.Tween.get(marker).to({ x: -(a * 15) }, animationDuration, createjs.Ease.circInOut);
}

async function onMouseDown(e) {
    var evt = e || event;
    dragging = true;
    lastX = evt.clientX;
    e.preventDefault();
}

async function onMouseMove(e) {
    var evt = e || event;
    if (dragging) {
        var delta = evt.clientX - lastX;
        lastX = evt.clientX;

        let step = Math.round(delta / 1) * 1;
        let current = Math.round(await getValue() + (step * -1));
        if (current === 0 || current === 60 || current === getValue) {
            return;
        }

        setValue(current, 100);
    }
    e.preventDefault();
}

async function onMouseUp() {
    if (dragging) {
        let value = await getValue();
        if (value === 0)
            stopTimer();
        else
            startTimer(value * 60 * 1000, '');
    }
    dragging = false;
}

let onWheelTimeout;
async function onWheel(e) {
    if (Math.abs(e.deltaY) < 50) {
        return;
    }

    clearTimeout(onWheelTimeout);
    let step = 5;

    if (e.deltaY > 0)
        step = step * -1;

    //await setValue(Math.round(await getValue() + step / 1) * 1, 0);
    onWheelTimeout = setTimeout(async function () {
        let value = await getValue();
        let target = Math.round((value + step) / 5) * 5;
        if (target === 0) {
            stopTimer();
            setValue(0);
        }
        else
            startTimer(target * 60 * 1000, '');
    }, 50)
}

async function initEventListeners() {
    browser.runtime.onMessage.addListener(handleMessage);
    UIButtonPomodoro.addEventListener('click', onPomodoro);
    UIButtonShortBreak.addEventListener('click', onShortBreak);
    UIButtonLongBreak.addEventListener('click', onLongBreak);
    UIButtonSettings.addEventListener('click', openOptionsPage);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel);
}

async function initCanvas() {
    canvas = document.getElementById('canvas');
    stage = new createjs.Stage(canvas);

    background = new createjs.Shape();
    background.graphics.beginLinearGradientFill(['#f50001', '#e50200'], [0, 1], 0, 0, 0, canvas.height).drawRect(0, 0, canvas.width, canvas.height);
    stage.addChild(background);

    var devider = new createjs.Shape();
    devider.graphics.beginFill('black').drawRect(0, canvas.height / 2 - 3, canvas.width, 6);
    devider.alpha = 0.7;
    stage.addChild(devider);

    var indicator = new createjs.Shape();
    indicator.graphics.beginFill('white');
    indicator.graphics.moveTo(140, 190);
    indicator.graphics.lineTo(160, 190);
    indicator.graphics.lineTo(150, 190 - 17.3);
    stage.addChild(indicator);

    marker = new createjs.Container();
    var ticks = new createjs.Shape();
    ticks.graphics.beginFill('white');

    let x = 150;
    let y = canvas.height / 2 - 25;

    for (var i = 0; i < 61; i++) {
        if (i % 5) {
            ticks.graphics.drawRect(x - 1, y - 5, 2, 10);
        } else {
            var label = new createjs.Text(i, '20px system-ui', 'white');
            label.x = x;
            label.y = y - 20;
            label.textBaseline = 'alphabetic';
            label.textAlign = 'center';
            marker.addChild(label);

            ticks.graphics.drawRect(x - 2, y - 10, 4, 15);
        }
        x += 15;
    }

    marker.addChild(ticks);
    stage.addChild(marker);

    var gradient = new createjs.Shape();
    gradient.graphics.beginLinearGradientFill(['#660000', '#ff666600', '#ff666600', '#660000'], [0, 0.4, 0.6, 1], 0, 300, canvas.width, canvas.height).drawRect(0, 0, canvas.width, canvas.height);
    gradient.alpha = 0.1;
    stage.addChild(gradient);

    createjs.Ticker.addEventListener('tick', stage);
    createjs.Touch.enable(stage);
}

async function handleMessage(message) {
    switch (message.id) {
        case 'POMODORO':
            if (!dragging && !util.isEmptyObject(message.pomodoro)) {
                setValue((message.pomodoro.timeLeft / 1000) / 60, 400);
                let colors = ['#f50001', '#e50200'];
                let className = "body-green";

                if (message.pomodoro.task.indexOf('BREAK') > -1) {
                    colors = ['#00c429', '#00b52d'];
                    document.body.classList.add(className);
                } else{
                    document.body.classList.remove(className);
                }
                //document.body.style.backgroundColor = colors[1];
                
                background.graphics.clear().beginLinearGradientFill(colors, [0, 1], 0, 0, 0, canvas.height).drawRect(0, 0, canvas.width, canvas.height).endFill();
            }
            break;
        default:
            throw new Error(`Message id '${message.id}' is not implementd.`)
    }
}

init();