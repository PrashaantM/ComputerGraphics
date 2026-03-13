var gl;
var program;

var maxBugs = 25;
var bugs = [];

var positionBuffer;
var colorBuffer;


var DISK_RADIUS = 0.8;





function createBug() {

    // Start on circumference of main disk
    var angle = Math.random() * 2 * Math.PI;

    var bug = {
        x: DISK_RADIUS * Math.cos(angle),
        y: DISK_RADIUS * Math.sin(angle),

        radius: 0.02,
        growth: Math.random() * 0.003 + 0.001,

        color: vec4(
            Math.random(),
            Math.random(),
            Math.random(),
            1.0
        )
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





function buildGeometry() {

    var points = [];
    var colors = [];

    var numSegments = 60;

    // -------- 1. MAIN WHITE DISK --------
    for (var i = 0; i < numSegments; i++) {

        var angle = 2 * Math.PI * i / numSegments;

        var x = DISK_RADIUS * Math.cos(angle);
        var y = DISK_RADIUS * Math.sin(angle);

        points.push(vec2(x, y));
        colors.push(vec4(1, 1, 1, 1));   // WHITE
    }

    // -------- 2. BACTERIA --------
    for (var b = 0; b < bugs.length; b++) {

        var bug = bugs[b];

        for (var i = 0; i < numSegments; i++) {

            var angle = 2 * Math.PI * i / numSegments;

            var x = bug.x + bug.radius * Math.cos(angle);
            var y = bug.y + bug.radius * Math.sin(angle);

            points.push(vec2(x, y));
            colors.push(bug.color);
        }
    }

    return {
        p: points,
        c: colors
    };
}






function init() {

    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        alert("WebGL not available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0); // dark grey background

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    positionBuffer = gl.createBuffer();
    colorBuffer = gl.createBuffer();

    render();
}






function render() {

    gl.clear(gl.COLOR_BUFFER_BIT);

    updateBugs();

    var geo = buildGeometry();

    // bug positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo.p), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // bug colors
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo.c), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var numSegments = 60;

    // making the disk
    gl.drawArrays(gl.TRIANGLE_FAN, 0, numSegments);

    // spawning the bugs
    for (var i = 0; i < bugs.length; i++) {

        gl.drawArrays(
            gl.TRIANGLE_FAN,
            numSegments + i * numSegments,
            numSegments
        );
    }

    requestAnimationFrame(render);
}
