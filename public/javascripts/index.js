// Startup websocket connection
var socket = io.connect('/');


//my socket id;
var myId = "";
// Initializes position for the user;
var position = {'x':0, 'y':0, 'z':0};
//initializes the cubes direction
var angle = 0;


//holds other objects that we need to draw
var otherCubes = {};

//gl instance
var gl;

var triangleVertexPositionBuffer;

var squareVertexPositionBuffer;

var mvMatrix = mat4.create();

var pMatrix = mat4.create();


//used for getting files from server
var getSourceSync = function(url) {
		var req = new XMLHttpRequest();
		req.open("GET", url, false);
		req.send(null);
		return (req.status == 200) ? req.responseText : null;
};


$(document).ready(function (){
	webGLStart();


    //client is given his id
    socket.on('give_id', function (id) {
        myId = id;
        $(document.body).append(myId);
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle});
    });

    //client is requested for his position
    socket.on('get_position', function () {
        socket.emit('give_position', position);
    });

    //client is told another client's position
    socket.on('update_position', function ( cube ) {
        if (cube.id != myId)
        {
            $(document.body).append('<br>cube ' + cube.id + ' moved to ' + cube.pos.x + "," + cube.pos.y + "," + cube.pos.z );
            otherCubes[cube.id] = cube;
        }
    });

    socket.on('delete_cube', function ( cubeID ) {
        $(document.body).append('<br>deleting cube ' + cubeID );
        delete otherCubes[cubeID];
    });

    socket.on('give_all_positions', function ( allPos ) {
        for (p in allPos) {
            if (p.id != myId)
                otherCubes[p.id] = p;
        }
        for (c in otherCubes) {
            $(document.body).append('<br>cube: ' + c.id);
        }
    });

});



function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	}
	catch (e) {
	}
	
	if(!gl) {
		alert ("Could not initialize WebGL");
	}
}

function getShader(gl, glslcode, type) { 


    var shader;
    if (type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, glslcode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }


    return shader;
}


function initShaders() {
	var fsource = getSourceSync("shaders/default.frag");
	var vsource = getSourceSync("shaders/default.vert");

    var fragmentShader = getShader(gl, fsource, "x-shader/x-fragment");
    var vertexShader = getShader(gl, vsource, "x-shader/x-vertex");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}



function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function initBuffers() {
    triangleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    var vertices = [
         0.0,  1.0,  0.0,
        -1.0, -1.0,  0.0,
         1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    triangleVertexPositionBuffer.itemSize = 3;
    triangleVertexPositionBuffer.numItems = 3;

    squareVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    vertices = [
         1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
         1.0, -1.0,  0.0,
        -1.0, -1.0,  0.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    squareVertexPositionBuffer.itemSize = 3;
    squareVertexPositionBuffer.numItems = 4;
}


function drawScene() {
    //sets up viewport
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    //clears out the previous buffers in video cards memory
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //the section below deals with transformation matricies

    //perspective matrix
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    //I have no idea right now
    mat4.identity(mvMatrix);
    //translation matrix
    mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);


    //the section below will draw the triangle

    //binds triangle's buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexPositionBuffer);
    //enables the buffer to be read from
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triangleVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    //no idea...
    setMatrixUniforms();
    //draws the triangle
    gl.drawArrays(gl.TRIANGLES, 0, triangleVertexPositionBuffer.numItems);


    mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}



function webGLStart() {
	var canvas = document.getElementById("cubemmo-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();

	
	//background color, black
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	//enables 3D stuff
	gl.enable(gl.DEPTH_TEST);
	
	drawScene();
}


	