var gl;
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

function getShader(gl, id) { 

}



function webGLStart() {
	var canvas = document.getElementById("cubemmo-canvas");
	initGL(canvas);

	
	//background color, black
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	//enables 3D stuff
	gl.enable(gl.DEPTH_TEST);
	
	drawScene();
}
	