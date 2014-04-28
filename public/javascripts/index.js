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
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle});
        socket.emit('get_all_positions');
    });

    //client is requested for his position
    socket.on('get_position', function () {
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );
    });

    //client is told another client's position
    socket.on('update_position', function ( cube ) {
        if (cube.id != myId)
        {
            otherCubes[cube.id] = cube;
        }
    });

    socket.on('delete_cube', function ( cubeID ) {
        delete otherCubes[cubeID];
    });

    socket.on('give_all_positions', function ( allPos ) {
        for (p in allPos) {
            if (allPos[p].id != myId)
            {
                otherCubes[p.id] = allPos[p];
            }
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
    mat4.translate(mvMatrix, [position.x, position.y, position.z]);

    //the section below draws the squares
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    


    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
    

    for(c in otherCubes) {
        //turns matrix back into identity matrix
        mat4.identity(mvMatrix);
        //translation matrix
        mat4.translate(mvMatrix, [otherCubes[c].pos.x, otherCubes[c].pos.y, otherCubes[c].pos.z]);


        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
    }
}

function render() {
    request
}



function webGLStart() {
	var canvas = document.getElementById("cubemmo-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();

    //arow key controls
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

	
	//background color, black
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	//enables 3D stuff
	gl.enable(gl.DEPTH_TEST);
	
	setInterval(drawScene,33);
}

function handleKeyUp(event) {
    if(event.keyCode == 37){}
}

function handleKeyDown(event) {
    //left
    if(event.keyCode == 37) {
        position.x = position.x-1;
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );
    }
    //up
    if(event.keyCode == 38) {
        position.z = position.z+1;
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );
    }
    //right
    if(event.keyCode == 39) {
        position.x = position.x+1;
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );
    }
    //down
    if(event.keyCode == 40) {
        position.z = position.z-1;
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );
    }
       
}

	