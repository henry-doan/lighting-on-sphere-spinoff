/*********************************************
* A pool ball
* For the light matching exercise
* 
* Click and drag the white circle to
* move the light.
**********************************************/

var BACKGROUND = color(0, 0, 0);
var RED = color(255, 40, 40);
var BLUE = color(64, 95, 237);
var GREEN = color(0, 200, 0);
var WHITE = color(255, 255, 255);
var LIGHT = color(255, 255, 240);
var ORANGE = color(255, 165, 0);
var TENNIS = color(120, 180, 10);

var CONTROL_POINT_SIZE = 15;

var selected = false;
var lightIntensity = 30;
var ambientIntensity = 0.03;
var light;

// Data from exercise
var testIntensity = parseFloat(Program.settings().intensity);
var testDiffuse = parseFloat(Program.settings().diffuse);
var testSpecular = parseFloat(Program.settings().specular);
var testIntensityProduct = testIntensity * testDiffuse;

/*********************************************
 *      Linear algebra
 *  Assume everything has 3 dimensions
**********************************************/
{
var dotProduct = function(v1, v2){
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

var vectorLength = function(v) {
    return sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
};

var normalise = function(v) {
    var d = vectorLength(v);
    return { x: v.x / d, y: v.y / d, z: v.z / d };
};

var subtract = function(v1, v2){
    return {
        x: v1.x - v2.x,
        y: v1.y - v2.y,
        z: v1.z - v2.z
    };
};

var printVector = function(v) {
    println(v.x + " " + v.y + " " + v.z);
};
}
/*****************************************************
 *      Slider object
******************************************************/
{
var Slider = function(x, y, width, minValue, maxValue, nowValue, name, decimal) {
    this.x = x;
    this.x2 = x + width;
    this.y = y;
    this.width = width;
    this.h = 12;
    
    this.ballR = 8;
    this.ballD = this.ballR * 2;
    
    this.min = minValue;
    this.max = maxValue;
    this.val = nowValue || minValue;
    
    this.bx = map(this.val, this.min, this.max, this.x, this.x2);

    this.name = name;
    this.held = false;
    this.decimal = decimal;
};

Slider.prototype.draw = function() {
    noStroke();
    fill(180);
    rect(this.x - 8, this.y - this.h / 2, this.width + 16, this.h, 8);

    strokeWeight(1);
    stroke(0, 0, 0, 120);
    fill(180, 180, 250);
    ellipse(this.bx, this.y, this.ballD, this.ballD);
    noStroke();
    fill(255, 255, 255, 150);
    ellipse(this.bx - this.ballR * 0.3, this.y - this.ballR * 0.3, 5, 5);
};

Slider.prototype.mouseover = function() {
    return mouseX >= this.x - 8 && mouseX <= this.x2 + 8 &&
           mouseY >= this.y - this.h / 2 && mouseY <= this.y + this.h / 2;
};
    
Slider.prototype.selected = function() {
    this.held = dist(mouseX, mouseY, this.bx, this.y) < this.ballR;
    if (!this.held && this.mouseover()) {
        this.setBallPosition();
    }
};
    
Slider.prototype.drag = function() {
    if (this.held) {
        this.setBallPosition();
        return true;
    }
};

Slider.prototype.setBallPosition = function() {
    this.bx = constrain(mouseX, this.x, this.x2);
    this.setValue();
};

Slider.prototype.setValue = function() {
    this.val = map(this.bx, this.x, this.x2, this.min, this.max);
    if (!this.decimal) {
        this.val = round(this.val);
    }
};

// This is used if you want to update the value in a way other
// than using the slider (but want the slider to update).
Slider.prototype.update = function(d) {
    this.val = constrain(this.val + d, this.min, this.max);
    this.bx = (this.val - this.min) / this.scale + this.x;
};
}
/*********************************************
 * DraggablePoint
 * A freely draggable point with a position and colour.
**********************************************/
{
var DraggablePoint = function(x, y, color, name) {
    this.x = x;
    this.y = y;
    this.color = color || ORANGE;
    this.animation = 0;
    this.name = name;
};

DraggablePoint.prototype.draw = function() {
    if (selected === this || this.mouseOver()) {
        if (this.animation < 5) {
            this.animation++;
        }
    } else {
        this.animation = 0;
    }

    strokeWeight(1);
    stroke(BACKGROUND);
    fill(this.color);
    
    var r = CONTROL_POINT_SIZE + this.animation;
    ellipse(this.x, this.y, r, r);
    
    if (this.name) {
        textAlign(CENTER, BASELINE);
        text(this.name, this.x, this.y - r / 2 - 5);
    }
};

DraggablePoint.prototype.mouseOver = function() {
    return dist(mouseX, mouseY, this.x, this.y) <= CONTROL_POINT_SIZE / 2;
};

DraggablePoint.prototype.move = function() {
    this.x += mouseX - pmouseX;
    this.y += mouseY - pmouseY;
};
}
/*********************************************
 *      Sphere object
**********************************************/
var getZ = function(x, y, r) {
    var x2 = x * x;
    var y2 = y * y;
    var r2 = r * r;
    var z2 = r2 - x2 - y2;
    
    if (z2 >= 0) {
        return sqrt(z2); 
    }
    
    return -1;
};

var cr = 30;
var cx = -42;
var cy = -15;
var cz = getZ(cx, cy, cr * 2);
var cr2 = cr * cr;

var Sphere = function(x, y, z, r, col, shine, diffuse, specular) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.v = {x: this.x, y: this.y, z: this.z};
    this.r = r;
    this.d = r * 2;
    this.r2 = this.r * this.r;
    this.rm = this.r - 1;
    this.rm2 = this.rm * this.rm;
    
    this.color = col || GREEN;
    
    this.shininess = shine;
    this.diffuseFactor = diffuse;
    this.specularFactor = specular;
    this.vectors = [];
    
    this.px = -this.r;
    this.setVectors();
};

Sphere.prototype.setVectors = function() {
    // Camera is slightly higher than dead on
    var eye = { x: width / 2, y: height / 2 - 80, z: 500 };
    
    var x = this.px;
    var x2 = x * x;
    var r = this.r;
    var y, y2, z, z2, d;
    
    for (y = -r; y <= r; y++) {
        y2 = y * y;

        if (x2 + y2 <= this.r2) {
            z2 = this.r2 - x2 - y2;
            z = sqrt(z2);
            d = sqrt(x2 + y2 + z2);
            
            var normal = { x: x / d, y: y / d, z: z / d };
            
            var specular = normalise(subtract(eye, {
                x: this.x + x,
                y: this.y + y,
                z: this.z + z
            }));
            
            var alias = x2 + y2 > this.rm2 ? 1 - sqrt(x2 + y2) + this.rm : 1;
            
            this.vectors.push([this.x + x, this.y + y, normal, specular, alias]);
            
        }
    }
    
    if (this.px === r) {
        this.calculatePixelColours(light);
    }
};

// Given a normalised light vectorcalculate
// the colour of each pixel on the sphere
Sphere.prototype.calculatePixelColours = function(light) {
    if (this.px < this.r) {
        return;
    }
    
    // Calculate fall off based on sphere's distance from light
    // Don't bother with a per-pixel value to make things faster
    var lightInt = lightIntensity * 8;
    var lightRay = subtract(light, this.v);
    var lightNorm = normalise(lightRay);
    var lightDist = vectorLength(lightRay);
    var fallOff = lightInt / (lightDist + 60);
    var diffuseFactor = fallOff * this.diffuseFactor;
    var specularFactor = fallOff * this.specularFactor;
    var lightColor = light.colour;
    
    var vector,
        normal,
        intensity,
        col,
        diffuseInt,
        d,
        reflection,
        specularInt;
    
    var vectors = this.vectors;
    var n = vectors.length;
    this.colors = [];
    
    for (var i = 0; i < n; i++) {
        vector = vectors[i];
        intensity = ambientIntensity;
        normal = vector[2];
        diffuseInt = dotProduct(normal, lightNorm);
        
        if (diffuseInt > 0) {
            intensity += diffuseInt * diffuseFactor;
            
            // Reflection
            d = 2 * diffuseInt; 
            reflection = {
                x: d * normal.x - lightNorm.x,
                y: d * normal.y - lightNorm.y,
                z: d * normal.z - lightNorm.z
            };
            
            specularInt = dotProduct(reflection, vector[3]);
            if (specularInt > 0) {
                intensity += specularFactor * pow(specularInt, this.shininess);
            }

            if (intensity < 1) {
                col = lerpColor(BACKGROUND, this.color, intensity * vector[4]);
            } else {
                // Bright light tends to the colour of the light
                col = lerpColor(this.color, lightColor, min(1, intensity - 1));
                col = lerpColor(BACKGROUND, col, vector[4]);
            }
        } else {
            col = lerpColor(BACKGROUND, col, ambientIntensity);
        }
        this.colors.push(col);
    }
};

Sphere.prototype.update = function() {
    if (this.px < this.r) {
        this.px++;
        this.setVectors();
    }
};

Sphere.prototype.draw = function() {
    noStroke();
    
    // Check whether we have loaded the images
    if (this.px < this.r) {
        this.update();
        this.update();
        this.update();
        
        fill(200, 0, 0);
        var p = 360 * (this.r + this.px) / 2 / this.r;
        arc(this.x, this.y, this.d, this.d, -90, p - 90);
        
        return;
    }
    
    strokeWeight(1);
    var vectors = this.vectors;
    var n = vectors.length;
    var i;
    
    for (i = 0; i < n; i++) {
        stroke(this.colors[i]);
        point(vectors[i][0], vectors[i][1]);
    }
};

/*********************************************
 *      Create objects
**********************************************/

var ball = new Sphere(width / 2, height * 0.75, 0, 40, TENNIS, 40, 0, 0.25);

light = new DraggablePoint(width / 2 - 25, 125, LIGHT);
light.z = 200;

var selectables = [light];
var sliders = [
    //new Slider(16, 28, 100, 0, 50, 15, 'Background light'),
    new Slider(20, 28, 100, 0, 100, 30, 'Spotlight'),
    //new Slider(16, 104, 100, 1, 50, 20, 'Shininess'),
    new Slider(20, 66, 100, 0, 100, 75, 'Diffuse', true),
    new Slider(20, 104, 100, 0, 100, 30, 'Specular', true),
];

/*********************************************
 *      Main loop
**********************************************/

var updateLight = function() {
    //BACKGROUND = lerpColor(color(0, 0, 0), WHITE, 0.05 + ambientIntensity * 1.2);
    
    lightIntensity = sliders[0].val;
    var diffuseIntensity = sliders[1].val;
    var specularIntensity = sliders[2].val;
    
    // Test whether lighting is close to the image
    var d1 = lightIntensity * diffuseIntensity / testIntensityProduct;
    var d2 = abs(testSpecular - specularIntensity);

    Program.runTest(function() {
        return d1 > 0.5 && d1 < 1.5 && d2 < 25;
    });
    
    ball.diffuseFactor = diffuseIntensity / 100;
    ball.specularFactor = specularIntensity / 50;
    ball.calculatePixelColours(light);
    
};
updateLight();

var draw = function() {
    background(BACKGROUND);
    
    ball.draw();
    light.draw();
    
    //image(threeImg, 20, 300);
    
    textSize(14);
    textAlign(CENTER, BASELINE);
    for (var i = 0; i < sliders.length; i++) {
        var s = sliders[i];
        fill(255);
        text(s.name + ": " + round(s.val), s.x + s.width / 2, s.y - 12);
        s.draw();
    }
};

/*********************************************
 *      Event handling
**********************************************/

mousePressed = function() {
    for (var i = 0; i < selectables.length; i++) {
        if (selectables[i].mouseOver()) {
            selected = selectables[i];
        }
    }
    for (var i = 0; i < sliders.length; i++) {
        sliders[i].selected();
    }
};

mouseDragged = function() {
    if (selected) {
        selected.move();
        ball.calculatePixelColours(light);
    }
    
    for (var i = 0; i < sliders.length; i++) {
        if (sliders[i].drag()) {
            updateLight();
        }
    }
};

mouseReleased = function() {
    selected = false;
    for (var i = 0; i < sliders.length; i++) {
        sliders[i].held = false;
    }
};

mouseOut = function() {
    mouseReleased();
};
