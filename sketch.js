let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  engine,
  world;

let pebbles = [];
let video;
let poseNet;
let poses = [];
let lastPebbleTime = 0; // Debounce control
let debounceInterval = 150; // Minimum time between pebble creations
let leftHand, rightHand; // collision bodies

class Pebble {
  constructor(x, y, size, createTime, pebbleColor) {
    this.body = Bodies.circle(x, y, size / 2, {
      restitution: 0.8,
      friction: 0.5,
      mass: 0.5, // Realistic mass for better physics interaction
      density: 0.5,
    });
    this.size = size;
    this.createTime = createTime;
    this.pebbleColor = pebbleColor;
    this.originalSize = size; // Store original size for resetting
    World.add(world, this.body);
  }

  showPebble() {
    const pos = this.body.position;
    const angle = this.body.angle;
    push();
    translate(pos.x, pos.y);
    rotate(angle);
    fill(this.pebbleColor);
    ellipse(0, 0, this.size);
    pop();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);
  video = createCapture(VIDEO);
  video.size(width, height);

  engine = Engine.create();
  world = engine.world;
  engine.world.gravity.y = 1;

  // Create floor and walls
  let floor = Bodies.rectangle(width / 2, height, width, 20, { isStatic: true });
  let leftWall = Bodies.rectangle(0, height / 2, 20, height, { isStatic: true });
  let rightWall = Bodies.rectangle(width, height / 2, 20, height, { isStatic: true });
  World.add(world, [floor, leftWall, rightWall]);

  // Create rectangular bodies for left and right arms
  // Initially position these at a default location
  leftHand = Bodies.rectangle(100, 100, 10, 100, { isStatic: false, render: { visible: true } });
  rightHand = Bodies.rectangle(100, 100, 10, 100, { isStatic: false, render: { visible: true } });
  World.add(world, [leftHand, rightHand]);

  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on("pose", (results) => (poses = results));
  video.hide();

  Matter.Events.on(engine, "collisionStart", function (event) {
    let pairs = event.pairs;
    pairs.forEach(function (pair) {
      let hand = null;
      let pebble = null;

      // Determine if the collision is between a hand and a pebble
      if (pair.bodyA === leftHand || pair.bodyA === rightHand) {
        hand = pair.bodyA;
        pebble = pebbles.find((p) => p.body === pair.bodyB);
      } else if (pair.bodyB === leftHand || pair.bodyB === rightHand) {
        hand = pair.bodyB;
        pebble = pebbles.find((p) => p.body === pair.bodyA);
      }

      if (hand && pebble) {
        // Calculate relative velocity
        let relativeVelocity = Matter.Vector.sub(hand.velocity, pebble.body.velocity);
        let speed = Matter.Vector.magnitude(relativeVelocity);

        // Apply a force based on the speed of the collision
        let forceMagnitude = speed * pebble.body.mass * 0.05; // Adjust multiplier based on desired intensity
        let forceDirection = Matter.Vector.normalise(relativeVelocity);
        let force = Matter.Vector.mult(forceDirection, forceMagnitude);

        // Apply the force to the pebble
        Matter.Body.applyForce(pebble.body, pebble.body.position, force);
      }
    });
  });
}

function modelReady() {
  select("#status").html("Model Loaded");
}

function draw() {
  push();
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  drawKeypoints();
  updateHands();
  Engine.update(engine);
  pebbles = pebbles.filter((pebble) => {
    if (millis() - pebble.createTime > 13000) {
      World.remove(world, pebble.body);
      return false;
    }
    return true;
  });
  pebbles.forEach((pebble) => pebble.showPebble());
  pop();
}

function drawKeypoints() {
  if (millis() - lastPebbleTime > debounceInterval) {
    poses.forEach(({ pose }) => {
      pose.keypoints
        .filter((kp) => kp.score > 0.5 && (kp.part === "nose" || kp.part === "mouth"))
        .forEach((keypoint) => {
          let newPebble = new Pebble(
            keypoint.position.x,
            keypoint.position.y,
            random(4, 40),
            millis(),
            color(random(360), 80, 90)
          );
          pebbles.push(newPebble);
        });
    });
    lastPebbleTime = millis();
  }
}

function updateHands() {
  poses.forEach(({ pose }) => {
    // Update for right arm
    if (pose.keypoints[10].score > 0.5 && pose.keypoints[9].score > 0.5) {
      // Check if both elbow and hand are detected
      let deltaX = pose.keypoints[10].position.x - pose.keypoints[9].position.x; // Elbow - Hand
      let deltaY = pose.keypoints[10].position.y - pose.keypoints[9].position.y;
      let angle = Math.atan2(deltaY, deltaX);
      let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      Matter.Body.setPosition(rightHand, {
        x: (pose.keypoints[10].position.x + pose.keypoints[9].position.x) / 2,
        y: (pose.keypoints[10].position.y + pose.keypoints[9].position.y) / 2,
      });
      Matter.Body.setAngle(rightHand, angle);
      Matter.Body.set(rightHand, { width: 10, height: length });
    }

    // Update for left arm
    if (pose.keypoints[6].score > 0.5 && pose.keypoints[7].score > 0.5) {
      let deltaX = pose.keypoints[6].position.x - pose.keypoints[7].position.x;
      let deltaY = pose.keypoints[6].position.y - pose.keypoints[7].position.y;
      let angle = Math.atan2(deltaY, deltaX);
      let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      Matter.Body.setPosition(leftHand, {
        x: (pose.keypoints[6].position.x + pose.keypoints[7].position.x) / 2,
        y: (pose.keypoints[6].position.y + pose.keypoints[7].position.y) / 2,
      });
      Matter.Body.setAngle(leftHand, angle);
      Matter.Body.set(leftHand, { width: 10, height: length });
    }
  });
}

function matterCollisions() {
  Matter.Events.on(engine, "collisionStart", function (event) {
    let pairs = event.pairs;
    pairs.forEach(function (pair) {
      let hand = null;
      let pebble = null;

      // Determine if the collision is between a hand and a pebble
      if (pair.bodyA === leftHand || pair.bodyA === rightHand) {
        hand = pair.bodyA;
        pebble = pebbles.find((p) => p.body === pair.bodyB);
      } else if (pair.bodyB === leftHand || pair.bodyB === rightHand) {
        hand = pair.bodyB;
        pebble = pebbles.find((p) => p.body === pair.bodyA);
      }

      if (hand && pebble) {
        // Calculate relative velocity
        let relativeVelocity = Matter.Vector.sub(hand.velocity, pebble.body.velocity);
        let speed = Matter.Vector.magnitude(relativeVelocity);

        // Apply a force based on the speed of the collision
        let forceMagnitude = speed * pebble.body.mass * 0.05; // Adjust multiplier based on desired intensity
        let forceDirection = Matter.Vector.normalise(relativeVelocity);
        let force = Matter.Vector.mult(forceDirection, forceMagnitude);

        // Apply the force to the pebble
        Matter.Body.applyForce(pebble.body, pebble.body.position, force);
      }
    });
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  World.remove(world, [floor, leftWall, rightWall]);
  floor = Bodies.rectangle(width / 2, height, width, 20, { isStatic: true });
  leftWall = Bodies.rectangle(0, height / 2, 20, height, { isStatic: true });
  rightWall = Bodies.rectangle(width, height / 2, 20, height, { isStatic: true });
  World.add(world, [floor, leftWall, rightWall]);
}
