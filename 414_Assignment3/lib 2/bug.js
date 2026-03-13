var gl;
var program;

var positionBuffer;
var colorBuffer;

var rotationMatrix = mat4();
var dragging = false;
var lastX, lastY;


function buildSphere() {
    var points = [];
    var colors = [];
    var drawList = [];  

    var latBands  = 36;
    var longBands = 36;
    var radius    = 0.7;

    var surfaceColor = vec4(0.1, 0.4, 0.8, 1.0);  // blue

    for (var lat = 0; lat < latBands; lat++) {
        var start = points.length;

        var theta1 = (lat / latBands) * Math.PI;
        var theta2 = ((lat + 1) / latBands) * Math.PI;

        for (var lon = 0; lon <= longBands; lon++) {
            var phi = (lon / longBands) * 2 * Math.PI;

            var x1 = radius * Math.sin(theta1) * Math.cos(phi);
            var y1 = radius * Math.cos(theta1);
            var z1 = radius * Math.sin(theta1) * Math.sin(phi);

            var x2 = radius * Math.sin(theta2) * Math.cos(phi);
            var y2 = radius * Math.cos(theta2);
            var z2 = radius * Math.sin(theta2) * Math.sin(phi);

            points.push(vec4(x1, y1, z1, 1.0));
            colors.push(surfaceColor);

            points.push(vec4(x2, y2, z2, 1.0));
            colors.push(surfaceColor);
        }

        drawList.push({ start: start, count: points.length - start });
    }

    return { points: points, colors: colors, drawList: drawList };
}



function buildDots() {
    var points = [];
    var colors = [];
    var drawList = [];

    var numRings     = 18;   // rings from top to bottom
    var dotsPerRing  = 18;   // dots per ring
    var dotSegments  = 8;    // triangle fan segments per dot
    var dotSize      = 0.04; // radius of each dot in local tangent space
    var sphereR      = 0.705; // just above sphere surface
    var dotColor     = vec4(1.0, 1.0, 1.0, 1.0); // white

    for (var ring = 0; ring < numRings; ring++) {

        var theta = ((ring + 1) / (numRings + 1)) * Math.PI;
        var sinT  = Math.sin(theta);
        var cosT  = Math.cos(theta);

        for (var d = 0; d < dotsPerRing; d++) {
            var phi = (d / dotsPerRing) * 2 * Math.PI;

            var cx = sphereR * sinT * Math.cos(phi);
            var cy = sphereR * cosT;
            var cz = sphereR * sinT * Math.sin(phi);

       
            var t1x = -Math.sin(phi);
            var t1y = 0.0;
            var t1z =  Math.cos(phi);

            var t2x = Math.cos(theta) * Math.cos(phi);
            var t2y = -Math.sin(theta);
            var t2z = Math.cos(theta) * Math.sin(phi);

            var start = points.length;

       
            points.push(vec4(cx, cy, cz, 1.0));
            colors.push(dotColor);

            for (var s = 0; s <= dotSegments; s++) {
                var a   = (s / dotSegments) * 2 * Math.PI;
                var cos = Math.cos(a) * dotSize;
                var sin = Math.sin(a) * dotSize;

                var px = cx + cos * t1x + sin * t2x;
                var py = cy + cos * t1y + sin * t2y;
                var pz = cz + cos * t1z + sin * t2z;

                points.push(vec4(px, py, pz, 1.0));
                colors.push(dotColor);
            }

            drawList.push({ start: start, count: points.length - start });
        }
    }

    return { points: points, colors: colors, drawList: drawList };
}


function init() {
    var canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL not available"); return; }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Mouse drag rotation
    canvas.addEventListener("mousedown", function(ev) {
        dragging = true;
        lastX = ev.clientX;
        lastY = ev.clientY;
        ev.preventDefault();
    });
    window.addEventListener("mouseup",   function()   { dragging = false; });
    window.addEventListener("mousemove", function(ev) {
        if (!dragging) return;
        var dx = ev.clientX - lastX;
        var dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        rotationMatrix = mult(rotationMatrix, rotateY(dx * 0.5));
        rotationMatrix = mult(rotationMatrix, rotateX(dy * 0.5));
    });

    positionBuffer = gl.createBuffer();
    colorBuffer    = gl.createBuffer();

    render();
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Build geometry fresh each frame so rotation matrix is always applied
    var sphere = buildSphere();
    var dots   = buildDots();

    // Merge everything into one flat array
    var allPoints = sphere.points.concat(dots.points);
    var allColors = sphere.colors.concat(dots.colors);
    var dotOffset = sphere.points.length;

    // Upload positions
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(allPoints), gl.DYNAMIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Upload colors
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(allColors), gl.DYNAMIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Set rotation uniform
    var uMatrix = gl.getUniformLocation(program, "uMatrix");
    gl.uniformMatrix4fv(uMatrix, false, flatten(rotationMatrix));

    // Draw sphere bands
    for (var i = 0; i < sphere.drawList.length; i++) {
        var s = sphere.drawList[i];
        gl.drawArrays(gl.TRIANGLE_STRIP, s.start, s.count);
    }

    // Draw dots
    for (var i = 0; i < dots.drawList.length; i++) {
        var d = dots.drawList[i];
        gl.drawArrays(gl.TRIANGLE_FAN, dotOffset + d.start, d.count);
    }

    requestAnimationFrame(render);
}