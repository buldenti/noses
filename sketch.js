// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
PoseNet example using p5.js
=== */
// How to make the pebbles stop at the ground
// https://editor.p5js.org/whatmakeart/sketches/mHoGNjdbF

let pebbles = []; // create an array to hold the pebble objects
let gravity = 1.04; // set a value for gravity

// create a Pebble class
class Pebble {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
  }
  // add method to show pebble
  showPebble() {
    // pass the parameters for "this" specific pebble
    circle(this.x, this.y, this.size);
  }

  // add drop method to pebble class
  dropPebble(ground) {
    // pebble falls by multiplying "this" specific "y" by "gravity"
    this.y = this.y * gravity;

    // check if pebble hit the ground
    // add half the size (radius) to height and see if greater than the "ground" value passed in
    // could pass a different value for ground to make pebbles stop sooner
    // if it is at the ground then set the "this.y" to the ground minus the radius since the pixels count from the top of the screen
    if (this.y + this.size / 2 >= ground) {
      this.y = ground - this.size / 2;
      //this.x++
    }
  }
}

let video;
let poseNet;
let poses = [];
let drawing;

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on("pose", function (results) {
    poses = results;
  });
  // Hide the video element, and just show the canvas
  video.hide();
}

function modelReady() {
  select("#status").html("Model Loaded");
}

function draw() {
  //
  push();
  translate(video.width, 0); // move video to left 1 full width
  scale(-1, 1); // flip the video
  image(video, 0, 0, width, height);
  drawKeypoints();

  //console.log(poses);
  // We can call both functions to draw all keypoints and the skeletons

  for (let i = 0; i < pebbles.length; i++) {
    pebbles[i].showPebble();
    // pass the height in for ground or any other y position then call dropPebble
    pebbles[i].dropPebble(height);
  }
  pop();
}

/// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    let pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = pose.keypoints[j]; // This seems to only capture the first keypoint, consider changing to pose.keypoints[j] to use all keypoints
      let leftPosition = pose.keypoints[1].position.x;
      let rightPosition = pose.keypoints[2].position.x;
      let noseSize = abs(leftPosition - rightPosition);
      fill(255, 0, 0);
      noStroke();
      //console.log(pose.keypoints.[1].position);
      if (pebbles.length >= 8000) {
        pebbles.shift(); // Remove the oldest pebble if the array size limit is reached
      }

      pebbles.push(new Pebble(keypoint.position.x, keypoint.position.y, noseSize));
    }
  }
}

// Resize the canvas when the
// browser's size changes.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
