let canvas = document.getElementById("glCanvas");
let gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
}





let vertexShaderSource = `
attribute vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

let fragmentShaderSource = `
precision mediump float;
uniform vec4 uColor;
void main() {
    gl_FragColor = uColor;
}
`;

function compileShader(source, type) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

let vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
let fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

let program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

let positionLoc = gl.getAttribLocation(program, "aPosition");
let colorLoc = gl.getUniformLocation(program, "uColor");

let buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);





class Bacteria {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.angle = 0;
        this.alive = true;
        this.spawnTime = performance.now();
        this.reachedThreshold = false;
    }
}

let bacteriaList = [];

let TOTAL_BACTERIA = 10;
let spawnedCount = 0;

let player_points = 0;
let game_points = 0;

let thresholdCount = 0;
let gameOver = false;





function spawnBacteria() {
    if (gameOver) return;
    if (spawnedCount >= TOTAL_BACTERIA) return;

    let x = Math.random() * 1.6 - 0.8;
    let y = Math.random() * 1.6 - 0.8;
    let r = 0.08;

    bacteriaList.push(new Bacteria(x, y, r));
    spawnedCount++;
}

setInterval(spawnBacteria, 1500);





function drawCircle(cx, cy, r, angle) {

    let segments = 60;
    let vertices = [];

    vertices.push(cx, cy);

    for (let i = 0; i <= segments; i++) {
        let theta = (i / segments) * angle * Math.PI / 180;

        vertices.push(
            cx + r * Math.cos(theta),
            cy + r * Math.sin(theta)
        );
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
}





canvas.addEventListener("click", function(event) {

    if (gameOver) return;

    let rect = canvas.getBoundingClientRect();

    let mx = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
    let my = ((canvas.height - (event.clientY - rect.top)) / canvas.height) * 2 - 1;

    checkHit(mx, my);
});

function checkHit(mx, my) {

    for (let b of bacteriaList) {

        if (!b.alive) continue;

        let dx = mx - b.x;
        let dy = my - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= b.radius) {
            killBacteria(b);
        }
    }
}

function killBacteria(b) {

    b.alive = false;
    player_points++;

    // game gains based on delay
    let responseTime = performance.now() - b.spawnTime;
    game_points += Math.floor(responseTime / 1000);

    updateUI();
}




function updateUI() {

    document.getElementById('game_points').innerHTML =
        'Game gains: ' + game_points;

    document.getElementById('player_points').innerHTML =
        'Player gains: ' + player_points;
}




let lastTime = performance.now();

function render() {

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let currentTime = performance.now();
    let delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    for (let b of bacteriaList) {

        if (!b.alive) continue;

        // grow arc
        b.angle += 30 * delta;

        if (b.angle >= 30 && !b.reachedThreshold) {
            b.reachedThreshold = true;
            thresholdCount++;
            game_points += 5;
            updateUI();
        }

        gl.uniform4f(colorLoc, 0.2, 0.8, 0.2, 1);
        drawCircle(b.x, b.y, b.radius, b.angle);
    }

    // LOSE CONDITION
    if (thresholdCount >= 2 && !gameOver) {
        gameOver = true;
        document.getElementById('win_lose').innerHTML = "You lose!";
    }

    // WIN CONDITION
    let allDead =
        spawnedCount === TOTAL_BACTERIA &&
        bacteriaList.every(b => !b.alive);

    if (allDead && thresholdCount < 2 && !gameOver) {
        gameOver = true;
        document.getElementById('win_lose').innerHTML = "You win!";
    }

    requestAnimationFrame(render);
}

render();
