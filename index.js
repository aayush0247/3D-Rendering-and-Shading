var gl;
var canvas;

var buf;
var indexBuf;
var cubeNormalBuf;

var spBuf;
var spIndexBuf;
var spNormalBuf;

var uLightLocation;
var uAmbientCoeff;
var uDiffusionCoeff;
var uSpecularCoeff;
var uShineCoeff;
var uAmbientLight;
var uDiffusionLight;
var uSpecularLight;

var aPositionLocation;
var aNormalLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uPMatrixLocation;
var uNMatrixLocation;

// set up the parameters for lighting 
var light_ambient = [0.9, 0.9, 0.9, 1]; 
var light_specular = [0.9, 0.9, 0.9, 1]; 
var light_pos = [0.0, 1.5, 0, 1];   // eye space position 

var mat_ambient = [0.1, 0.1, 0.1, 1]; 
var mat_diffuse= [0.9, 0.9, 0.9, 1]; 
var mat_specular = [0.9, 0.9, 0.9, 1]; 
var mat_shine = [40]; 

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var degree11 = 0.0;
var degree10 = 0.0;
var degree21 = 0.0;
var degree20 = 0.0;
var degree31 = 0.0;
var degree30 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

//initialize model, view, projection and normal matrices
var mMatrix = mat4.create(); //model matrix
var vMatrix = mat4.create(); //view matrix
var pMatrix = mat4.create(); //projection matrix
var nMatrix = mat4.create();  //normal matrix

//specify camera/eye coordinate system parameters
var z = 4.0;
var eyePos = [0.0, 0.0, 0.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

//Flat Shading
//vertex shader code
const perFaceVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;

out vec3 posInEyeSpace;

void main() {
  posInEyeSpace = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}`;

//fragment shader code
const perFaceFragShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
in vec3 posInEyeSpace;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix; 

uniform vec4 lightPos; 
uniform vec4 ambientCoeff;
uniform vec4 diffuseCoeff;
uniform vec4 specularCoeff;
uniform float matShininess; 
uniform vec4 lightAmbient; 
uniform vec4 lightDiffuse; 
uniform vec4 lightSpecular;

out vec4 fragColor;

void main() {
  vec3 lightPosInEyeSpace = vec3(lightPos);
  vec3 normalInEyeSpace = normalize(cross(dFdx(posInEyeSpace), dFdy(posInEyeSpace)));
  vec3 lightVector = normalize(vec3(lightPosInEyeSpace - posInEyeSpace)); 
  vec3 reflectionVector = normalize(reflect(-lightVector, normalInEyeSpace)); 
  vec3 viewVector = normalize(-posInEyeSpace);

  vec4 ambient = ambientCoeff * lightAmbient; 

  float ndotl = max(dot(normalInEyeSpace, lightVector), 0.0); 
  vec4 diffuse = diffuseCoeff * lightDiffuse * ndotl;

  float rdotv = max(dot(reflectionVector, viewVector), 0.0);
  vec4 specular;  
  if (ndotl > 0.0) 
    specular = specularCoeff * lightSpecular * pow(rdotv, matShininess); 
  else
    specular = vec4(0, 0, 0, 1); 
  fragColor = ambient + diffuse + specular;
}`;

//Gouraud Shading
//vertex shader code
const perVerVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;  

uniform vec4 lightPos; 
uniform vec4 ambientCoeff;
uniform vec4 diffuseCoeff;
uniform vec4 specularCoeff;
uniform float matShininess; 
uniform vec4 lightAmbient; 
uniform vec4 lightDiffuse; 
uniform vec4 lightSpecular;

out vec4 vertexColor; 

void main() {
  vec3 lightPosInEyeSpace = vec3(lightPos);
  vec3 normal = normalize(vec3(uNMatrix * vec4(aNormal, 0.0)));
  vec3 posInEyeSpace = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
  vec3 lightVector = normalize(lightPosInEyeSpace - posInEyeSpace); 
  vec3 reflectionVector = normalize(vec3(reflect(-lightVector, normal)));
  vec3 viewVector = normalize(-posInEyeSpace);

  vec4 ambient = ambientCoeff * lightAmbient;

  float ndotl = max(dot(normal, lightVector), 0.0); 
  vec4 diffuse = diffuseCoeff * lightDiffuse * ndotl;

  float rdotv = max(dot(reflectionVector, viewVector), 0.0);
  vec4 specular;  
  if (ndotl > 0.0) 
    specular = specularCoeff * lightSpecular * pow(rdotv, matShininess); 
  else
    specular = vec4(0, 0, 0, 1);
  vertexColor = ambient + diffuse + specular;
  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}`;

//fragment shader code
const perVerFragShaderCode = `#version 300 es
precision mediump float;

in vec4 vertexColor;

out vec4 fragColor;

void main() {
  fragColor = vertexColor;
}`;

//Phong Shading
//vertex shader code
const perFragVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix; 

out vec3 posInEyeSpace;
out vec3 normal;

void main() {
  normal = normalize(vec3(uNMatrix * vec4(aNormal, 0.0)));
  posInEyeSpace = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
  gl_Position = uPMatrix * uVMatrix * uMMatrix * vec4(aPosition, 1.0);
  gl_PointSize = 10.0;
}`;

// Fragment shader code
const perFragFragShaderCode = `#version 300 es
precision mediump float;

in vec3 posInEyeSpace;
in vec3 normal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 

uniform vec4 lightPos; 
uniform vec4 ambientCoeff;
uniform vec4 diffuseCoeff;
uniform vec4 specularCoeff;
uniform float matShininess; 
uniform vec4 lightAmbient; 
uniform vec4 lightDiffuse; 
uniform vec4 lightSpecular;

out vec4 fragColor;

void main() {
  vec3 lightPosInEyeSpace = vec3(lightPos);
  vec3 lightVector = normalize(vec3(lightPosInEyeSpace - posInEyeSpace)); 
  vec3 reflectionVector = normalize(vec3(reflect(-lightVector, normal))); 
  vec3 viewVector = normalize(-vec3(posInEyeSpace));

  vec4 ambient = ambientCoeff * lightAmbient; 

  float ndotl = max(dot(normal, lightVector), 0.0); 
  vec4 diffuse = diffuseCoeff * lightDiffuse * ndotl;

  float rdotv = max(dot(reflectionVector, viewVector), 0.0);
  vec4 specular;  
  if (ndotl > 0.0) 
    specular = specularCoeff * lightSpecular * pow(rdotv, matShininess); 
  else
    specular = vec4(0, 0, 0, 1); 
  fragColor = ambient + diffuse + specular;
}`;

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  //Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  //Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders(vertexShaderCode, fragShaderCode) {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  //attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  //check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); //the graphics webgl2 context
    gl.viewportWidth = canvas.width; //the width of the canvas
    gl.viewportHeight = canvas.height; //the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function initSphere(nslices, nstacks, radius) {
  var theta1, theta2;

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(-radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(-1.0);
    spNormals.push(0);
  }

  for (j = 1; j < nstacks - 1; j++) {
    theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
    for (i = 0; i < nslices; i++) {
      theta2 = (i * 2 * Math.PI) / nslices;
      spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
      spVerts.push(radius * Math.sin(theta1));
      spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));

      spNormals.push(Math.cos(theta1) * Math.cos(theta2));
      spNormals.push(Math.sin(theta1));
      spNormals.push(Math.cos(theta1) * Math.sin(theta2));
    }
  }

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(1.0);
    spNormals.push(0);
  }

  // setup the connectivity and indices
  for (j = 0; j < nstacks - 1; j++)
    for (i = 0; i <= nslices; i++) {
      var mi = i % nslices;
      var mi2 = (i + 1) % nslices;
      var idx = (j + 1) * nslices + mi;
      var idx2 = j * nslices + mi;
      var idx3 = j * nslices + mi2;
      var idx4 = (j + 1) * nslices + mi;
      var idx5 = j * nslices + mi2;
      var idx6 = (j + 1) * nslices + mi2;

      spIndicies.push(idx);
      spIndicies.push(idx2);
      spIndicies.push(idx3);
      spIndicies.push(idx4);
      spIndicies.push(idx5);
      spIndicies.push(idx6);
    }
}

function initSphereBuffer() {
  var nslices = 30; // use even number
  var nstacks = nslices / 2 + 1;
  var radius = 0.5;
  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = nslices * nstacks;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = nslices * nstacks;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
}


// //Sphere generation function with normals
// function initSphere(nslices, nstacks, radius) {
//   for (var i = 0; i <= nslices; i++) {
//     var angle = (i * Math.PI) / nslices;
//     var comp1 = Math.sin(angle);
//     var comp2 = Math.cos(angle);

//     for (var j = 0; j <= nstacks; j++) {
//       var phi = (j * 2 * Math.PI) / nstacks;
//       var comp3 = Math.sin(phi);
//       var comp4 = Math.cos(phi);

//       var xcood = comp4 * comp1;
//       var ycoord = comp2;
//       var zcoord = comp3 * comp1;

//       spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
//       spNormals.push(xcood, ycoord, zcoord);
//     }
//   }

//   // now compute the indices here
//   for (var i = 0; i < nslices; i++) {
//     for (var j = 0; j < nstacks; j++) {
//       var id1 = i * (nstacks + 1) + j;
//       var id2 = id1 + nstacks + 1;

//       spIndicies.push(id1, id2, id1 + 1);
//       spIndicies.push(id2, id2 + 1, id1 + 1);
//     }
//   }
// }

// function initSphereBuffer() {
//   var nslices = 30;
//   var nstacks = 30;
//   var radius = 0.5;

//   initSphere(nslices, nstacks, radius);

//   // buffer for vertices
//   spBuf = gl.createBuffer();
//   gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
//   spBuf.itemSize = 3;
//   spBuf.numItems = spVerts.length / 3;

//   // buffer for indices
//   spIndexBuf = gl.createBuffer();
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
//   gl.bufferData(
//     gl.ELEMENT_ARRAY_BUFFER,
//     new Uint32Array(spIndicies),
//     gl.STATIC_DRAW
//   );
//   spIndexBuf.itemsize = 1;
//   spIndexBuf.numItems = spIndicies.length;

//   // buffer for normals
//   spNormalBuf = gl.createBuffer();
//   gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
//   spNormalBuf.itemSize = 3;
//   spNormalBuf.numItems = spNormals.length / 3;
// }

function drawSphere(color) {  
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  
  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform4f(uLightLocation, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2],1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]); 

	gl.uniform4f(uAmbientLight, light_ambient[0], light_ambient[1], light_ambient[2], 1.0); 
	gl.uniform4fv(uDiffusionLight, color); 
	gl.uniform4f(uSpecularLight, light_specular[0], light_specular[1], light_specular[2],1.0);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);	

  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
  // gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
  //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
}

//Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;


  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

	gl.uniform4f(uLightLocation, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]); 
	gl.uniform4f(uAmbientLight, light_ambient[0], light_ambient[1], light_ambient[2], 1.0); 
	gl.uniform4fv(uDiffusionLight, color); 
	gl.uniform4f(uSpecularLight, light_specular[0], light_specular[1], light_specular[2], 1.0);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
  //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
}

//////////////////////////////////////////////////////////////////////
// Main drawing routine
function drawScene() {
  //Per Face Shading
  gl.viewport(0, 0, 500, 500);
  gl.scissor(0, 0, 500, 500);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(217/255, 217/255, 246/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  // initialize shader program
  shaderProgram = initShaders(perFaceVertexShaderCode, perFaceFragShaderCode);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  //sphere
  light_pos[0]=x;
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  eyePos[2] = z;
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree10), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree11), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(15), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.8, 0.0]);
  mMatrix = mat4.scale(mMatrix, [0.8, 0.8, 0.8]);
  drawSphere([59/255, 144/255, 201/255, 1]);

  //cube
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree10), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree11), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);


  // mMatrix = mat4.translate(mMatrix, [0.0, -0.2, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(15), [1, 0, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.2, 0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 1.2, 0.8]);
  drawCube([176/255, 175/255, 121/255, 1]);

  //Per Vertex Shading
  gl.viewport(500, 0, 500, 500);
  gl.scissor(500, 0, 500, 500);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(238/255, 217/255, 217/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  // initialize shader program
  shaderProgram = initShaders(perVerVertexShaderCode, perVerFragShaderCode);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  //sphere top
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree21), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.05, 1.07, 0]);
  mMatrix = mat4.scale(mMatrix, [0.35, 0.35, 0.35]);
  drawSphere([1, 1, 1, 1]);
  
  //sphere middle
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree21), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.4, 0.5, 0]);
  mMatrix = mat4.scale(mMatrix, [0.65, 0.65, 0.65]);
  drawSphere([1, 1, 1, 1]);

  //sphere bottom
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree21), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [1.2, 1.2, 1.2]);
  drawSphere([1, 1, 1, 1]);

  //square top
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(0+degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(0+degree21), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.08, 0.73, -0.1]);
  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(30), [0, 0, 1]);
  mMatrix = mat4.translate(mMatrix, [-0.08, -0.73, 0.1]);
  mMatrix = mat4.translate(mMatrix, [0.08, 0.73, -0.1]);
  mMatrix = mat4.scale(mMatrix, [0.42, 0.42, 0.42]);
  drawCube([49/255, 132/255, 0, 1]);

  //square middle
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(0+degree20), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(0+degree21), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(-10), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.73, -0.05, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(-35), [0, 0, 1]);
  mMatrix = mat4.translate(mMatrix, [0.73, 0.05, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.73, -0.05, 0]);
  mMatrix = mat4.scale(mMatrix, [0.63, 0.63, 0.63]);
  drawCube([49/255, 132/255, 0, 1]);

  //Per Fragment Shading
  gl.viewport(1000, 0, 500, 500);
  gl.scissor(1000, 0, 500, 500);
  gl.enable(gl.SCISSOR_TEST);
  gl.clearColor(221/255, 242/255, 215/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.SCISSOR_TEST);
  gl.enable(gl.DEPTH_TEST);
  //initialize shader program
  shaderProgram = initShaders(perFragVertexShaderCode, perFragFragShaderCode);

  //get locations of attributes and uniforms declared in the shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambientCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uAmbientLight = gl.getUniformLocation(shaderProgram, "lightAmbient");	
  uDiffusionLight = gl.getUniformLocation(shaderProgram, "lightDiffuse");
  uSpecularLight = gl.getUniformLocation(shaderProgram, "lightSpecular");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  //sphere 1
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.05, 0.97, 0]);
  mMatrix = mat4.scale(mMatrix, [0.65, 0.65, 0.65]);
  drawSphere([146/255, 146/255, 181/255,1]);
  
  //sphere 2
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.8, 0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  drawSphere([199/255, 3/255, 215/255,1]);

  //sphere 3
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.translate(mMatrix, [0.8, 0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  drawSphere([156/255, 117/255, 29/255,1]);

  //sphere 4
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.8, -0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  drawSphere([94/255, 92/255, 189/255,1]);

  //sphere 5
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.8, -0.3, 0]);
  mMatrix = mat4.scale(mMatrix, [0.5, 0.5, 0.5]);
  drawSphere([60/255, 125/255, 145/255,1]);

  //sphere 6
  //set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up the perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  //transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.97, 0]);
  mMatrix = mat4.scale(mMatrix, [0.65, 0.65, 0.65]);
  drawSphere([88/255, 219/255, 45/255,1]);

  //square 1
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, 0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [2.3, 0.1, 0.42]);
  drawCube([151/255, 53/255, 8/255, 1]);

  //square 2
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [-0.8, 0.0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.1, 1.5]);
  drawCube([160/255, 157/255, 0, 1]);

  //square 3
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.8, 0.0, 0]);
  mMatrix = mat4.scale(mMatrix, [0.7, 0.1, 1.5]);
  drawCube([75/255, 156/255, 122/255, 1]);

  //square 4
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

  //set up the model matrix
  mat4.identity(mMatrix);
  // transformations applied here on model matrix
  mMatrix = mat4.rotate(mMatrix, degToRad(degree30), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degree31), [1, 0, 0]);

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  mMatrix = mat4.rotate(mMatrix, degToRad(25), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(5), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix, [0.0, -0.6, 0]);
  mMatrix = mat4.scale(mMatrix, [2.3, 0.1, 0.42]);
  drawCube([151/255, 53/255, 8/255, 1]);
}

function changeCameraPos(event){
  z = event.target.value;
  drawScene();
}

function changeLightPos(event){
  x = event.target.value;
  drawScene();
}

function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= 500 &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
  else if (
    event.layerX <= 1000 &&
    event.layerX >= 500 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
  else if(
    event.layerX <= 1500 &&
    event.layerX >= 1000 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= 500 &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree10 = degree10 + diffX1 / 2;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree11 = degree11 - diffY2 / 5;

    drawScene();
  }
  else if (
    event.layerX <= 1000 &&
    event.layerX >= 500 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree20 = degree20 + diffX1 / 2;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree21 = degree21 - diffY2 / 5;

    drawScene();
  }
  else if(
    event.layerX <= 1500 &&
    event.layerX >= 1000 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree30 = degree30 + diffX1 / 2;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree31 = degree31 - diffY2 / 5;

    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

//This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("Shadings");
  document.addEventListener("mousedown", onMouseDown, false);
  document.getElementById("lightSlider").oninput=changeLightPos;
  document.getElementById("cameraSlider").oninput=changeCameraPos;

  //initialize WebGL
  initGL(canvas);

  //initialize the buffers
  initCubeBuffer();
  initSphereBuffer();
  gl.enable(gl.DEPTH_TEST);

  //rendering figures
  drawScene();
}