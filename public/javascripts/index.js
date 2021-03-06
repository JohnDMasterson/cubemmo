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

//buffers for vertices
var cubeVertexBuffer;
var cubeIndexBuffer;
var cubeColorBuffer;

//matrices used for transformations
var mvMatrix = mat4.create();
var pMatrix = mat4.create();


//matrix for knowing if key is pressed or not
var isPressed = {};


















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
        var strin = ""
        for (p in allPos) {
            if (allPos[p].id != myId)
            {
                
                otherCubes[p] = allPos[p];
            }
        }
    });

});






//initializes webgl, sets up key handlers, and starts the program
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
    

    mainLoop();
}



//tries to start webgl. If it can't, it alerts the user
function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
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
        alert("Could not initialize shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexAttribute);
    
    shaderProgram.colorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.colorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}



//main loop for the program
//calls the key handler, then draws
function mainLoop() {
    keyHandler();
    drawScene();
    requestAnimFrame(mainLoop);
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
	
	

    //index buffer
    //tells the shaer the order of what to draw
	
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
	
	

    //color buffer
	//tells shader what color each vertex is

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

    //perspective matrix
    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
    

    //the section below draws the squares

    //binds the vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexAttribute, cubeVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    //binds the colors
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeColorBuffer);
    gl.vertexAttribPointer(shaderProgram.colorAttribute, cubeColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    //binds indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
 

    for(c in otherCubes) {
        //Turns mvMatrix into identity
        mat4.identity(mvMatrix);

        //first, we rotate the world to how your cube see's it
        mat4.rotate(mvMatrix, degToRad(-angle), [0,1,0]);

        //then we translate the world's origin to where your cube is
        mat4.translate(mvMatrix, [-position.x, -position.y, -position.z]);

        //next, we translate the other cubes to the origin
        mat4.translate(mvMatrix, [otherCubes[c].pos.x, otherCubes[c].pos.y, otherCubes[c].pos.z]);

        //finally, we rotate the other cube
        mat4.rotate(mvMatrix, degToRad(otherCubes[c].ang), [0,1,0]);

        //passes matrices into shader program
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

        //draws elements
        //this uses the index buffer to choose the order of drawing
        //it takes three indices at a time
        gl.drawElements(gl.TRIANGLES, cubeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    }
}





//converts degrees to radians
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}




//used for getting files from server
var getSourceSync = function(url) {
        var req = new XMLHttpRequest();
        req.open("GET", url, false);
        req.send(null);
        return (req.status == 200) ? req.responseText : null;
};






function handleKeyUp(event) {
    isPressed[event.keyCode] = false;
}

function handleKeyDown(event) {
    isPressed[event.keyCode] = true;
}


function keyHandler() {

    //these control movement
    //a 65
    if(isPressed[65] == true) {
        moveRight(-.15);
    }
    //w 87
    if(isPressed[87] == true) {
        moveForward(.15);
    }
    //d 68
    if(isPressed[68] == true) {
        moveRight(.15);
    }
    //s 83
    if(isPressed[83] == true) {
        moveForward(-.15);
    }


    //these control turning
    //q 81
    if(isPressed[81] == true) {
        turnRight(1);
    }
    //e 69
    if(isPressed[69] == true) {
        turnRight(-1);
    }
}

function moveForward(distance) {
    var xtemp = distance*Math.sin(degToRad(angle));
    var ztemp = distance*Math.cos(degToRad(angle));
    position.x = position.x - xtemp;
    position.z = position.z - ztemp;


    socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} ); 
}

function moveRight(distance) {
    var xtemp = distance*Math.sin(degToRad(angle-90));
    var ztemp = distance*Math.cos(degToRad(angle-90));
    position.x = position.x - xtemp;
    position.z = position.z - ztemp;


    socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} ); 
}

function turnRight(distance) {
        angle = (angle + distance)%360;    
        socket.emit('give_position', {'id':myId, 'pos':position, 'ang':angle} );   
}







function resizeCanvas() {
	var canvas = document.getElementById("cubemmo-canvas");
   // only change the size of the canvas if the size it's being displayed
   // has changed.
  
   if (gl.viewportWidth != canvas.clientWidth ||
       gl.viewportHeight != canvas.clientHeight) {
     // Change the size of the canvas to match the size it's being displayed
     gl.viewportWidth = canvas.width = canvas.clientWidth;
     gl.viewportHeight = canvas.height = canvas.clientHeight;
   }
}

	