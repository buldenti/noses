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
let debounceInterval = 100; // Minimum time between pebble creations
let leftHand, rightHand; // collision bodies

class Pebble {
  constructor(x, y, size, createTime, pebbleColor) {
    this.body = Bodies.circle(x, y, size / 2, {
      restitution: 0.5 + 0.5 * (1 - size / 50), // Higher restitution for smaller pebbles,
      friction: 0.5,
      mass: 0.1 * size ** 3, // Scale mass as the cube of the radius
      density: 0.1 * size, // Scale density linearly with the size
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

  engine = Engine.create({
    positionIterations: 6,
    velocityIterations: 4,
    constraintIterations: 2,
    enableSleeping: false,
    events: [],
    plugin: {},
    timing: {
      timestamp: 0,
      timeScale: 1,
    },
    broadphase: {
      controller: Matter.Grid,
    },
    world: world,
    render: {
      visible: true,
    },
    collisionSlop: 0.1, // Try reducing this value
  });
  world = engine.world;
  engine.world.gravity.y = 1;

  // Create floor and walls
  let floor = Bodies.rectangle(width / 2, height, width, 20, { isStatic: true });
  let leftWall = Bodies.rectangle(0, height / 2, 20, height, { isStatic: true });
  let rightWall = Bodies.rectangle(width, height / 2, 20, height, { isStatic: true });
  World.add(world, [floor, leftWall, rightWall]);

  // Define high values for mass and density
  const highMass = 10000; // Very high mass
  const highDensity = 100; // Very high density

  // Modify the hand and foot body definitions
  leftHand = Bodies.circle(100, 300, 30, {
    isStatic: false,
    mass: highMass,
    density: highDensity,
    collisionFilter: {
      category: 0x0002,
      mask: 0x0001,
    },
  });
  rightHand = Bodies.circle(100, 300, 30, {
    isStatic: false,
    mass: highMass,
    density: highDensity,
    collisionFilter: {
      category: 0x0002,
      mask: 0x0001,
    },
  });
  leftFoot = Bodies.circle(100, 300, 30, {
    isStatic: false,
    mass: highMass,
    density: highDensity,
    collisionFilter: {
      category: 0x0002,
      mask: 0x0001,
    },
  });
  rightFoot = Bodies.circle(200, 300, 30, {
    isStatic: false,
    mass: highMass,
    density: highDensity,
    collisionFilter: {
      category: 0x0002,
      mask: 0x0001,
    },
  });

  // Re-add the updated bodies to the world
  World.add(world, [leftHand, rightHand, leftFoot, rightFoot]);

  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on("pose", (results) => (poses = results));
  video.hide();

  //matterCollisions();
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
  drawHands(); // Draw the hand rectangles
  updateHands();
  Engine.update(engine);
  pebbles = pebbles.filter((pebble) => {
    if (millis() - pebble.createTime > 60000) {
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
            random(4, 50),
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
    updateBodyPosition(leftHand, pose.keypoints[9]); // Assuming left wrist is keypoint 9
    updateBodyPosition(rightHand, pose.keypoints[10]); // Assuming right wrist is keypoint 10
  });
}

function updateBodyPosition(body, keypoint) {
  if (keypoint.score > 0.9) {
    Matter.Body.setPosition(body, {
      x: keypoint.position.x,
      y: keypoint.position.y,
    });
  }
}

function drawHands() {
  // Draw left hand
  const posLeft = leftHand.position;
  fill(255, 0, 0); // Red color for left hand
  ellipse(posLeft.x, posLeft.y, 6, 6); // Diameter set to 60 for visualization

  // Draw right hand
  const posRight = rightHand.position;
  fill(0, 255, 0); // Green color for right hand
  ellipse(posRight.x, posRight.y, 6, 6);
}

function updateLimbs() {
  // Limit updates to every few frames to reduce computation
  if (frameCount % 3 === 0) {
    poses.forEach(({ pose }) => {
      updateBodyPosition(leftFoot, pose.keypoints[15]); // Assuming left ankle is keypoint 15
      updateBodyPosition(rightFoot, pose.keypoints[16]); // Assuming right ankle is keypoint 16
    });
  }
}

function updateBodyPosition(body, keypoint) {
  if (keypoint.score > 0.9) {
    Matter.Body.setPosition(body, {
      x: keypoint.position.x,
      y: keypoint.position.y,
    });
  }
}

function drawLimbs() {
  // Draw hands code...

  // Draw left foot
  const posLeftFoot = leftFoot.position;
  fill(0, 0, 255); // Blue color for left foot
  ellipse(posLeftFoot.x, posLeftFoot.y, 30, 30); // Visualization diameter

  // Draw right foot
  const posRightFoot = rightFoot.position;
  fill(255, 255, 0); // Yellow color for right foot
  ellipse(posRightFoot.x, posRightFoot.y, 30, 30);
}

function matterCollisions() {
  Matter.Events.on(engine, "collisionStart", function (event) {
    let pairs = event.pairs;

    pairs.forEach(function (pair) {
      let limb = null;
      let pebble = null;

      // Determine if the collision is between a hand/foot and a pebble
      if ([leftHand, rightHand, leftFoot, rightFoot].includes(pair.bodyA)) {
        limb = pair.bodyA;
        pebble = pebbles.find((p) => p.body === pair.bodyB);
      } else if ([leftHand, rightHand, leftFoot, rightFoot].includes(pair.bodyB)) {
        limb = pair.bodyB;
        pebble = pebbles.find((p) => p.body === pair.bodyA);
      }

      if (limb && pebble) {
        // Calculate relative velocity and use it to determine the force magnitude
        let relativeVelocity = Matter.Vector.sub(limb.velocity, pebble.body.velocity);
        let speed = Matter.Vector.magnitude(relativeVelocity);

        // Increase the force magnitude for a more explosive effect
        let forceMagnitude = speed * pebble.body.mass * 0.2; // Increased multiplier
        let forceDirection = Matter.Vector.normalise(relativeVelocity);
        let force = Matter.Vector.mult(forceDirection, forceMagnitude);

        // Apply the force to the pebble
        Matter.Body.applyForce(pebble.body, pebble.body.position, force);

        // Optionally, create a visual effect or sound
        if (speed > 5) {
          // Trigger explosion effect or sound here
        }
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
