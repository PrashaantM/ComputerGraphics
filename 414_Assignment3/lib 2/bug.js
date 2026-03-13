var gl;
var program;
 
var maxBugs = 25;
var bugs = [];
 
var positionBuffer;
var colorBuffer;
 
var DISK_RADIUS = 0.8;
 
var rotationMatrix = mat4(); // Current rotation state
var dragging = false;
var lastX, lastY;
 
 
function createBug() {
    // Start on circumference of main disk
    var angle = Math.random() * 2 * Math.PI;

    var bug = {
        x: DISK_RADIUS * Math.cos(angle),
        y: DISK_RADIUS * Math.sin(angle),

        radius: 0.02,
        growth: Math.random() * 0.003 + 0.001,

        color: vec4(Math.random(), Math.random(), Math.random(), 1.0)
    };
    bugs.push(bug);
}
 
 
function updateBugs() {
    if (bugs.length < maxBugs && Math.random() < 0.05) {
        createBug();
    }

    for (var i = 0; i < bugs.length; i++) {
        bugs[i].radius += bugs[i].growth;

        if (bugs[i].radius > 0.18) {
            bugs[i].radius = 0.18;
        }
    }
}
 
 
//added for 3D sphere instead

function buildSphere(radius, latBands, longBands) {
    var strips = []; // array of { points, colors } per latitude band
 
    for (var lat = 0; lat < latBands; lat++) {
        var points = [];
        var colors = [];
 
        for (var lon = 0; lon <= longBands; lon++) {
            var phi = lon * 2 * Math.PI / longBands;
            var cosPhi = Math.cos(phi);
            var sinPhi = Math.sin(phi);
 
            // Top vertex of this quad (row lat)
            var theta1 = lat * Math.PI / latBands;
            var x1 = radius * Math.cos(phi) * Math.sin(theta1);
            var y1 = radius * Math.cos(theta1);
            var z1 = radius * Math.sin(phi) * Math.sin(theta1);
 
            // Bottom vertex of this quad (row lat+1)
            var theta2 = (lat + 1) * Math.PI / latBands;
            var x2 = radius * Math.cos(phi) * Math.sin(theta2);
            var y2 = radius * Math.cos(theta2);
            var z2 = radius * Math.sin(phi) * Math.sin(theta2);
 

            points.push(vec4(x1, y1, z1, 1.0));
            colors.push(vec4(0.0, 0.8, 0.2, 1.0));
 
            points.push(vec4(x2, y2, z2, 1.0));
            colors.push(vec4(0.0, 0.6, 0.9, 1.0)); // slightly different shade for depth
        }
 
        strips.push({ p: points, c: colors });
    }
 
    return strips; // array of per-band strips
}
 
 
function init() {
    var canvas = document.getElementById("gl-canvas");
 
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL not available");
        return;
    }
 
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
 
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
 
    // Mouse controls for rotation
    canvas.onmousedown = function(ev) {
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            lastX = x; lastY = y;
            dragging = true;
        }
    };
 
    canvas.onmouseup = function(ev) { dragging = false; };
 
    canvas.onmousemove = function(ev) {
        if (dragging) {
            var x = ev.clientX, y = ev.clientY;
            var factor = 100 / canvas.height;
            var dx = factor * (x - lastX);
            var dy = factor * (y - lastY);
 
            rotationMatrix = mult(rotateX(dy), rotationMatrix);
            rotationMatrix = mult(rotateY(dx), rotationMatrix);
 
            lastX = x; lastY = y;
        }
    };
 
    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();
 
    render();
}
 
 
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
 
    // Set rotation uniform
    var uMatrixLoc = gl.getUniformLocation(program, "uMatrix");
    gl.uniformMatrix4fv(uMatrixLoc, false, flatten(rotationMatrix));
 
    var vPosition = gl.getAttribLocation(program, "vPosition");
    var vColor = gl.getAttribLocation(program, "vColor");
 
    // Build sphere as per-band strips
    var strips = buildSphere(0.5, 30, 30);
 
    for (var i = 0; i < strips.length; i++) {
        var strip = strips[i];
 
        // Upload positions
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(strip.p), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vPosition);
 
        // Upload colors
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(strip.c), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vColor);
 
        // Draw this band as a complete TRIANGLE_STRIP
        // Each band has (longBands + 1) * 2 vertices
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, strip.p.length);
    }
 
    requestAnimationFrame(render);
}