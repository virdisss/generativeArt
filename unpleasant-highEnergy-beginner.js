import * as PIXI from "https://cdn.skypack.dev/pixi.js";
import { KawaseBlurFilter } from "https://cdn.skypack.dev/@pixi/filter-kawase-blur";
import SimplexNoise from "https://cdn.skypack.dev/simplex-noise";
import hsl from "https://cdn.skypack.dev/hsl-to-hex";
import debounce from "https://cdn.skypack.dev/debounce";

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function map(n, start1, end1, start2, end2) {
  return ((n - start1) / (end1 - start1)) * (end2 - start2) + start2;
}

class ColorPalette {
  constructor() {
    this.setColors();
    this.setCustomProperties();
  }
  setColors() {
    // pick a random hue somewhere between 220 and 36
    this.hue = ~~random(210, 230);
    this.complimentaryHue1 = this.hue - 60;
    this.complimentaryHue2 = this.hue + 60;
    // define a fixed saturation and lightness
    this.saturation = 30;
    this.lightness = 30;

    // define a base color
    this.baseColor = hsl(this.hue, this.saturation, this.lightness);
    // define a complimentary color, 30 degrees away from the base
    this.complimentaryColor1 = hsl(
      this.complimentaryHue1,
      this.saturation,
      this.lightness
    );
    // define a second complimentary color, 60 degrees away from the base
    this.complimentaryColor2 = hsl(
      this.complimentaryHue2,
      this.saturation,
      this.lightness
    );

    // store the color choices in an array so that a random one can be picked later
    this.colorChoices = [
      this.baseColor,
      this.complimentaryColor1,
      this.complimentaryColor2
    ];
  }
  randomColor() {
    // pick a random color
    return this.colorChoices[~~random(0, this.colorChoices.length)].replace(
      "#",
      "0x"
    );
  }
  setCustomProperties() {
    // set CSS custom properties so that the colors defined here can be used throughout the UI
    document.documentElement.style.setProperty("--hue", this.hue);
    document.documentElement.style.setProperty(
      "--hue-complimentary1",
      this.complimentaryHue1
    );
    document.documentElement.style.setProperty(
      "--hue-complimentary2",
      this.complimentaryHue2
    );
  }
}

class Orb {
  // Pixi takes hex colors as hexidecimal literals (0x rather than a string with '#')
  constructor(fill = 0x000000) {
    // bounds = the area an orb is "allowed" to move within
    this.bounds = this.setBounds();
    // initialise the orb's { x, y } values to a random point within it's bounds
    this.x = random(this.bounds["x"].min, this.bounds["x"].max);
    this.y = random(this.bounds["y"].min, this.bounds["y"].max);

    // how large the orb is vs it's original radius (this will modulate over time)
    this.scale = 1;

    // what color is the orb?
    this.fill = fill;

    // the original radius of the orb, set relative to the window height
    this.radius = random(app.renderer.height / 4, app.renderer.height / 2.5);

    // starting points in "time" for the noise/self similar random values
    this.xOff = random(0, 1000);
    this.yOff = random(0, 1000);
    // how quickly the noise/self similar random values step/increment through time
    this.inc = 0.0015;

    // PIXI.Graphics is used to draw 2d primitives (in this case a circle) to the canvas
    this.graphics = new PIXI.Graphics();
    this.graphics.alpha = 0.825;

    this.graphics.filters = [new KawaseBlurFilter(9, 9, true)];

    // 250ms after the last window resize event, recalculate orb positions.
    window.addEventListener(
      "resize",
      debounce(() => {
        this.bounds = this.setBounds();
      }, 250)
    );
  }

  setBounds() {
    // how far from the { x, y } origin can each orb move
    const maxDistX = 0;
    const maxDistY =
      app.renderer.height < 360
        ? app.renderer.height / 1.6755
        : app.renderer.height / 3;
    // the { x, y } origin for each orb (the bottom right of the screen)
    const originX = app.renderer.width / 2;
    const originY = app.renderer.height / 2.5;

    // allow each orb to move x distance away from it's { x, y } origin
    return {
      x: {
        min: originX - maxDistX,
        max: originX + maxDistX
      },
      y: {
        min: originY - maxDistY,
        max: originY + maxDistY
      }
    };
  }

  update() {
    // self similar "psuedo-random" or noise values at a given point in "time"
    const xNoise = simplex.noise2D(this.xOff, this.xOff);
    const yNoise = simplex.noise2D(this.yOff, this.yOff);
    const scaleNoise = simplex.noise2D(this.xOff, this.yOff);

    // map the xNoise/yNoise values (between -1 and 1) to a point within the orb's bounds
    this.x = map(xNoise, -1, 1, this.bounds["x"].min, this.bounds["x"].max);
    this.y = map(yNoise, -1, 1, this.bounds["y"].min, this.bounds["y"].max);
    // map scaleNoise (between -1 and 1) to a scale value
    // somewhere between half of the orb's original size,
    // and 100% of it's original size
    this.scale = map(scaleNoise, -1, 1, 0.5, 1);

    // step through "time"
    this.xOff += this.inc;
    this.yOff += this.inc;
  }

  render() {
    // update the PIXI.Graphics position and scale values
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    this.graphics.scale.set(this.scale);

    // clear anything currently drawn to graphics
    this.graphics.clear();

    // tell graphics to fill any shapes drawn after this with the orb's fill color
    this.graphics.beginFill(this.fill);
    // draw a circle at { 0, 0 } with it's size set by this.radius
    this.graphics.drawCircle(0, 0, this.radius);
    // let graphics know we won't be filling in any more shapes
    this.graphics.endFill();
  }
}

// Create PixiJS app
const simplex = new SimplexNoise();
const colorPalette = new ColorPalette();

const app = new PIXI.Application({
  view: document.querySelector(".unpleasant-highEnergy-beginner"),
  width: 164,
  height: 164,
  backgroundColor: 0xff8768
});

const blurContainer = new PIXI.Container();
blurContainer.filters = [new KawaseBlurFilter(1, 1, true)];
app.stage.addChild(blurContainer);

const svgTexture = PIXI.Texture.from("mask2.svg");
const mask = new PIXI.Sprite(svgTexture);
mask.scale.set(0.2, 0.2);

mask.texture.baseTexture.on("loaded", () => {
  const maskContainer = new PIXI.Container();
  maskContainer.pivot.x = 0;
  maskContainer.pivot.y = 0;
  maskContainer.position.set(
    (app.renderer.width - mask.width) / 2,
    (app.renderer.height - mask.height) / 2
  );

  let pixiGraph = new PIXI.Graphics();
  pixiGraph.beginFill(0xff8766);
  pixiGraph.drawRect(-30, -30, app.renderer.width, app.renderer.height);
  blurContainer.addChild(pixiGraph);

  let anotherPixiGraph = new PIXI.Graphics();
  anotherPixiGraph.beginFill(0xffbd38);
  anotherPixiGraph.lineStyle(2, 0x000000, 1);
  anotherPixiGraph.drawRect(-30, -30, app.renderer.width, app.renderer.height);

  maskContainer.addChild(anotherPixiGraph);
  maskContainer.addChild(mask);
  maskContainer.mask = mask;
  blurContainer.addChild(maskContainer);

  const orbs = [];
  for (let i = 0; i < 3; i++) {
    const orb = new Orb(colorPalette.randomColor());
    maskContainer.addChild(orb.graphics);
    orbs.push(orb);
  }

  let noiseFilter = new PIXI.filters.NoiseFilter(0.05);
  let colorMatrix = new PIXI.filters.ColorMatrixFilter();
  app.stage.filters = [noiseFilter, colorMatrix];

  // Animate!
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    app.ticker.add(() => {
      // update and render each orb, each frame. app.ticker attempts to run at 60fps
      orbs.forEach((orb) => {
        orb.update();
        orb.render();
      });
    });
  } else {
    // perform one update and render per orb, do not animate
    orbs.forEach((orb) => {
      orb.update();
      orb.render();
    });
  }
});
