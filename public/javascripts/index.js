// Startup websocket connection
var socket = io.connect('/');


//my socket id;
var myId = "";
// Initializes position for the user;
var position = {'x':0, 'y':0, 'z':-10};
//initializes the cubes direction
var angle = 0;


//holds other objects that we need to draw
var otherCubes = {};

//gl instance
var gl;

//buffers for vertices
var cubeVertexBuffer;
var cubeIndexBuffer;
var cubeColorBuffer;

//matrices used for transformations
var mvMatrix = mat4.create();
var pMatrix = mat4.create();




//this is called when the document loads
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

	//other client disconnected
    socket.on('delete_cube', function ( cubeID ) {
        delete otherCubes[cubeID];
    });

	//server gives client all positions
    socket.on('give_all_positions', function ( allPos ) {
        for (p in allPos) {
            if (allPos[p].id != myId)
            {
                otherCubes[p.id] = allPos[p];
            }
        }
    });

});




//used for getting files from server
var getSourceSync = function(url) {
		var req = new XMLHttpRequest();
		req.open("GET", url, false);
		req.send(null);
		return (req.status == 200) ? req.responseText : null;
};

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

    shaderProgram.vertexAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexAttribute);
	
    shaderProgram.colorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.colorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}



function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function initBuffers() {
	//three buffers created
	//first buffer holds all the vertices
	//second buffer holds the indices in the order we want to call them
	//third buffer holds colors for vertices 

    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    var vertices = [
         1.0,  1.0,   1.0,
        -1.0,  1.0,   1.0,
         1.0, -1.0,   1.0,
        -1.0, -1.0,   1.0,
         1.0,  1.0,  -1.0,
        -1.0,  1.0,  -1.0,
         1.0, -1.0,  -1.0,
        -1.0, -1.0,  -1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexBuffer.itemSize = 3;
    cubeVertexBuffer.numItems = 8;
	
	
	
	cubeIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer); 
	var indices = [
		//front faces
		0,	1,	2,
		1,	3,	2,
		
		//back faces
		4,	6,	7,
		4,	7,	5,
		
		//top faces
		4,	5,	0,
		5,	1,	0,
		
		//right faces
		4,	0,	2,
		6,	4,	2,
		
		//bottom faces
		2,	3,	6,
		3,	7,	6,
		
		//left faces
		1,	5,	3,
		5,	7,	3
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	cubeIndexBuffer.numItems = 36;
	
	
	
	cubeColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
	var colors = [
		1.0,	0.0,	0.0,	1.0,
		0.0,	1.0,	0.0,	1.0,
		0.0,	0.0,	1.0,	1.0,
		1.0,	0.0,	0.0,	1.0,
		0.0,	1.0,	0.0,	1.0,
		0.0,	0.0,	1.0,	1.0,
		1.0,	0.0,	0.0,	1.0,
		0.0,	1.0,	0.0,	1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	cubeColorBuffer.itemSize = 4;
	cubeColorBuffer.numItems = 8;
	
}


function drawScene() {
    //sets up viewport
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    //clears out the previous buffers in video cards memory
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //the section below deals with transformation matrices

    //perspective matrix
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    //I have no idea right now
    mat4.identity(mvMatrix);
    //translation matrix
    mat4.translate(mvMatrix, [position.x, position.y, position.z]);

    //the section below draws the squares
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexAttribute, cubeVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.vertexAttribPointer(shaderProgram.colorAttribute, cubeColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, cubeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    

    for(c in otherCubes) {
        //turns matrix back into identity matrix
        mat4.identity(mvMatrix);
        //translation matrix
        mat4.translate(mvMatrix, [otherCubes[c].pos.x, otherCubes[c].pos.y, otherCubes[c].pos.z]);

        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, cubeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
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

	