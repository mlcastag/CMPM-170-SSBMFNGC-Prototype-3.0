import Phaser from 'phaser';

const TILE_WIDTH = 96;
const TILE_HEIGHT = 48;
const MAP_SIZE = 13;
const CENTER = (MAP_SIZE - 1) / 2;
const INNER_RADIUS = 2.55;
const OUTER_RADIUS = 5.35;
const MOVES_PER_TURN = 4;
const ITEM_COUNT = 3;

const CELL_BLOCKS = [
  [6, 0],
  [9, 1],
  [11, 3],
  [12, 6],
  [11, 9],
  [9, 11],
  [6, 12],
  [3, 11],
  [1, 9],
  [0, 6],
  [1, 3],
  [3, 1],
];

export class PanopticonScene extends Phaser.Scene {
  constructor() {
    super('PanopticonScene');
  }

  create() {
    this.origin = { x: this.scale.width / 2, y: 48 };
    this.playerGrid = { x: CENTER, y: CENTER + 4 };
    this.lightGrid = { x: CENTER, y: CENTER + 3 };

    this.drawBackdrop();
    this.drawRingFloor();
    this.drawCellBlocks();
    this.drawTower();
    this.createItems();
    this.createPlayer();
    this.createInterface();
    this.createControls();
    this.hiddenTile = null;
    this.collected = 0;
    this.light = this.add.graphics();
    this.updatePlayerPosition();
    this.startPrisonerTurn();
  }

  update() {
    if (this.turn === 'over') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
        this.scene.restart();
      }
      return;
    }

    if (this.turn === 'waiting') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        if (this.nextTurn === 'guard') {
          this.startGuardTurn();
        } else {
          this.startPrisonerTurn();
        }
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.handleSpace();
      return;
    }

    // Out of moves: the prisoner stays visible so the player can see where
    // he landed, and hides once ENTER is pressed.
    if (this.turn === 'prisoner' && this.movesLeft === 0) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.hidePrisoner();
      }
      return;
    }

    const justDown = (key) => Phaser.Input.Keyboard.JustDown(this.keys[key]);
    const horizontal = Number(justDown('right') || justDown('d'))
      - Number(justDown('left') || justDown('a'));
    const vertical = Number(justDown('down') || justDown('s'))
      - Number(justDown('up') || justDown('w'));

    // One key press is one tile. Each key steps along a grid axis, which
    // reads as a diagonal on screen.
    if ((horizontal === 0) === (vertical === 0)) {
      return;
    }

    if (this.turn === 'prisoner') {
      this.movePrisoner(horizontal, vertical);
    } else {
      this.moveLight(horizontal, vertical);
    }
  }

  project(gridX, gridY, elevation = 0) {
    return {
      x: this.origin.x + (gridX - gridY) * (TILE_WIDTH / 2),
      y: this.origin.y + (gridX + gridY) * (TILE_HEIGHT / 2) - elevation,
    };
  }

  drawBackdrop() {
    const backdrop = this.add.graphics();
    backdrop.fillGradientStyle(0x17232b, 0x17232b, 0x0a1015, 0x0a1015, 1);
    backdrop.fillRect(0, 0, this.scale.width, this.scale.height);

    const glow = this.add.graphics();
    glow.fillStyle(0xd6bc7b, 0.035);
    glow.fillCircle(this.scale.width / 2, 330, 420);
  }

  drawRingFloor() {
    const floor = this.add.graphics();
    floor.lineStyle(1, 0x576168, 0.45);

    for (let y = 0; y < MAP_SIZE; y += 1) {
      for (let x = 0; x < MAP_SIZE; x += 1) {
        const radius = Math.hypot(x - CENTER, y - CENTER);

        if (radius < INNER_RADIUS - 0.7 || radius > OUTER_RADIUS + 0.8) {
          continue;
        }

        const point = this.project(x, y);
        const diamond = this.diamond(point.x, point.y, TILE_WIDTH / 2, TILE_HEIGHT / 2);
        const isWalkway = radius >= INNER_RADIUS && radius <= OUTER_RADIUS;
        const checker = (x + y) % 2 === 0;

        floor.fillStyle(
          isWalkway ? (checker ? 0x53605f : 0x485553) : 0x303b3e,
          isWalkway ? 1 : 0.8,
        );
        floor.fillPoints(diamond, true);
        floor.strokePoints(diamond, true);
      }
    }
  }

  drawCellBlocks() {
    CELL_BLOCKS.forEach(([x, y], index) => {
      const color = index % 2 === 0 ? 0x667077 : 0x5b666d;
      this.drawPrism(x, y, 56, color);
    });
  }

  drawPrism(gridX, gridY, height, topColor) {
    const graphics = this.add.graphics();
    const base = this.project(gridX, gridY);
    const top = this.project(gridX, gridY, height);
    const halfWidth = TILE_WIDTH * 0.43;
    const halfHeight = TILE_HEIGHT * 0.43;
    const topDiamond = this.diamond(top.x, top.y, halfWidth, halfHeight);
    const baseDiamond = this.diamond(base.x, base.y, halfWidth, halfHeight);

    graphics.fillStyle(0x354147, 1);
    graphics.fillPoints([topDiamond[1], topDiamond[2], baseDiamond[2], baseDiamond[1]], true);
    graphics.fillStyle(0x252f35, 1);
    graphics.fillPoints([topDiamond[2], topDiamond[3], baseDiamond[3], baseDiamond[2]], true);
    graphics.fillStyle(topColor, 1);
    graphics.fillPoints(topDiamond, true);
    graphics.lineStyle(2, 0x1b242a, 0.85);
    graphics.strokePoints(topDiamond, true);

    const door = this.project(gridX, gridY, 22);
    graphics.fillStyle(0x141c21, 0.9);
    graphics.fillRect(door.x - 9, door.y, 18, 27);
    graphics.setDepth((gridX + gridY) * 100);
  }

  drawTower() {
    const tower = this.add.graphics();
    const base = this.project(CENTER, CENTER);
    const shaftTop = this.project(CENTER, CENTER, 128);
    const shaftTopDiamond = this.diamond(shaftTop.x, shaftTop.y, 42, 21);
    const shaftBaseDiamond = this.diamond(base.x, base.y, 42, 21);

    tower.fillStyle(0x5a666b, 1);
    tower.fillPoints(
      [shaftTopDiamond[1], shaftTopDiamond[2], shaftBaseDiamond[2], shaftBaseDiamond[1]],
      true,
    );
    tower.fillStyle(0x3c484e, 1);
    tower.fillPoints(
      [shaftTopDiamond[2], shaftTopDiamond[3], shaftBaseDiamond[3], shaftBaseDiamond[2]],
      true,
    );

    const roomBase = this.project(CENTER, CENTER, 108);
    const roomTop = this.project(CENTER, CENTER, 164);
    const roomBottomDiamond = this.diamond(roomBase.x, roomBase.y, 82, 39);
    const roomTopDiamond = this.diamond(roomTop.x, roomTop.y, 82, 39);

    tower.fillStyle(0x8b744d, 1);
    tower.fillPoints(
      [roomTopDiamond[1], roomTopDiamond[2], roomBottomDiamond[2], roomBottomDiamond[1]],
      true,
    );
    tower.fillStyle(0x67543c, 1);
    tower.fillPoints(
      [roomTopDiamond[2], roomTopDiamond[3], roomBottomDiamond[3], roomBottomDiamond[2]],
      true,
    );

    tower.lineStyle(8, 0xc8e4df, 0.78);
    tower.beginPath();
    tower.moveTo(roomTop.x - 62, roomTop.y + 14);
    tower.lineTo(roomTop.x, roomTop.y + 45);
    tower.lineTo(roomTop.x + 62, roomTop.y + 14);
    tower.strokePath();

    const roof = this.project(CENTER, CENTER, 174);
    const roofDiamond = this.diamond(roof.x, roof.y, 94, 45);
    tower.fillStyle(0x222d33, 1);
    tower.fillPoints(roofDiamond, true);
    tower.lineStyle(3, 0xb89b62, 0.8);
    tower.strokePoints(roofDiamond, true);

    tower.fillStyle(0xe1c575, 1);
    tower.fillCircle(roof.x, roof.y - 3, 6);
    tower.setDepth((CENTER + CENTER) * 100);
  }

  createItems() {
    const tiles = [];

    for (let y = 0; y < MAP_SIZE; y += 1) {
      for (let x = 0; x < MAP_SIZE; x += 1) {
        const radius = Math.hypot(x - CENTER, y - CENTER);
        const fromStart = Math.hypot(x - this.playerGrid.x, y - this.playerGrid.y);
        // Tiles straight behind the tower on screen, or tucked just behind a
        // cell block, get drawn over, so only spawn where the item stays visible.
        const behindTower = x + y < CENTER + CENTER && Math.abs(x - y) < 2;
        const behindBlock = CELL_BLOCKS.some(([blockX, blockY]) => Math.abs(blockX - x) <= 1
          && Math.abs(blockY - y) <= 1
          && blockX + blockY > x + y);

        if (radius >= INNER_RADIUS && radius <= OUTER_RADIUS && fromStart > 2
          && !behindTower && !behindBlock) {
          tiles.push({ x, y });
        }
      }
    }

    Phaser.Utils.Array.Shuffle(tiles);

    this.items = tiles.slice(0, ITEM_COUNT).map(({ x, y }) => {
      const point = this.project(x, y);
      const item = this.add.circle(point.x, point.y - 12, 10, 0xd13b3b, 1);
      item.setStrokeStyle(2, 0x5a1414, 1);
      item.setDepth((x + y) * 100 + 8);
      return { x, y, item };
    });
  }

  createPlayer() {
    const shadow = this.add.ellipse(0, 1, 31, 15, 0x081015, 0.5);
    const body = this.add.ellipse(0, -18, 23, 34, 0xd56b4b, 1);
    const head = this.add.circle(0, -39, 9, 0xf0c6a2, 1);
    const facing = this.add.triangle(0, -18, 0, 0, 9, 4, 0, 8, 0xffdd77, 1);

    this.player = this.add.container(0, 0, [shadow, body, head, facing]);
  }

  createInterface() {
    const panel = this.add.graphics();
    panel.fillStyle(0x071015, 0.82);
    panel.fillRoundedRect(24, 22, 420, 150, 10);
    panel.lineStyle(1, 0x9f8c62, 0.65);
    panel.strokeRoundedRect(24, 22, 420, 150, 10);
    panel.setDepth(100000);

    this.add.text(44, 38, 'PANOPTICON / BLOCK 01', {
      color: '#e2c680',
      fontFamily: 'monospace',
      fontSize: '22px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setDepth(100001);

    this.turnText = this.add.text(44, 73, '', {
      color: '#e2c680',
      fontFamily: 'monospace',
      fontSize: '15px',
    }).setDepth(100001);
    this.statusText = this.add.text(44, 108, '', {
      color: '#cbd3cf',
      fontFamily: 'monospace',
      fontSize: '15px',
    }).setDepth(100001);
    this.controlsText = this.add.text(44, 143, '', {
      color: '#cbd3cf',
      fontFamily: 'monospace',
      fontSize: '15px',
    }).setDepth(100001);

    const middle = { x: this.scale.width / 2, y: this.scale.height / 2 };

    this.bannerBox = this.add.rectangle(middle.x, middle.y, 560, 170, 0x071015, 0.92);
    this.bannerBox.setStrokeStyle(2, 0x9f8c62, 0.8);
    this.bannerBox.setDepth(100002);

    this.bannerTitle = this.add.text(middle.x, middle.y - 36, '', {
      color: '#e2c680',
      fontFamily: 'monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(100003);
    this.bannerText = this.add.text(middle.x, middle.y + 28, '', {
      color: '#cbd3cf',
      fontFamily: 'monospace',
      fontSize: '18px',
      align: 'center',
    }).setOrigin(0.5).setDepth(100003);
  }

  createControls() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      r: Phaser.Input.Keyboard.KeyCodes.R
    });
  }

  startPrisonerTurn() {
    this.turn = 'prisoner';
    this.movesLeft = MOVES_PER_TURN;
    this.hiddenTile = null;
    this.player.setVisible(true);
    this.light.setVisible(false);
    this.setBanner(null);
    this.updateInterface();
  }

  startGuardTurn() {
    this.turn = 'guard';
    this.setBanner(null);
    this.drawLight();
    this.light.setVisible(true);
    this.updateInterface();
  }

  // Pauses between turns so the other player can look away first.
  waitForTurn(nextTurn) {
    this.turn = 'waiting';
    this.nextTurn = nextTurn;
    this.light.setVisible(false);

    if (nextTurn === 'guard') {
      this.setBanner("GUARD'S TURN", 'Prisoner, look away.\nGuard, press ENTER.');
    } else {
      this.setBanner('NOTHING THERE', 'Guard, look away.\nPrisoner, press ENTER.');
    }
  }

  endGame(title, text) {
    this.turn = 'over';
    this.setBanner(title, `${text}\nPress R to restart.`);
  }

  movePrisoner(dx, dy) {
    const next = this.tryMove(this.playerGrid, dx, dy);

    if (!next) {
      return;
    }

    this.playerGrid = next;
    this.movesLeft -= 1;
    this.updatePlayerPosition();
    this.collectItem();

    if (this.turn === 'over') {
      return;
    }

    this.updateInterface();
  }

  moveLight(dx, dy) {
    const next = this.tryMove(this.lightGrid, dx, dy);

    if (next) {
      this.lightGrid = next;
      this.drawLight();
    }
  }

  tryMove(grid, dx, dy) {
    const next = { x: grid.x + dx, y: grid.y + dy };
    const radius = Math.hypot(next.x - CENTER, next.y - CENTER);
    return radius >= INNER_RADIUS && radius <= OUTER_RADIUS ? next : null;
  }

  currentTile(){
    return { x: Math.round(this.playerGrid.x), y: Math.round(this.playerGrid.y) };
  }

  collectItem() {
    const t = this.currentTile();
    const index = this.items.findIndex(({ x, y }) => x === t.x && y === t.y);

    if (index === -1) {
      return;
    }

    this.items[index].item.destroy();
    this.items.splice(index, 1);
    this.collected += 1;

    if (this.items.length === 0) {
      this.endGame('ESCAPED', `The prisoner collected all ${ITEM_COUNT} objects.`);
    }
  }

  drawLight(){
    const t = this.lightGrid;
    const p = this.project(t.x, t.y);
    this.light.clear();
    this.light.fillStyle(0xffe066, 0.55);
    this.light.fillPoints(this.diamond(p.x, p.y, TILE_WIDTH / 2, TILE_HEIGHT / 2),true);
    this.light.lineStyle(2, 0xfff2a8, 0.9);
    this.light.strokePoints(this.diamond(p.x, p.y, TILE_WIDTH / 2, TILE_HEIGHT / 2), true);
    this.light.setDepth((t.x + t.y) * 100 + 5);
  }

  handleSpace(){
    if (this.turn === 'prisoner') {
      this.hidePrisoner();
    } else if (this.turn === 'guard') {
      this.search();
    }
  }

  // Hiding ends the prisoner's turn.
  hidePrisoner() {
    this.hiddenTile = this.currentTile();
    this.player.setVisible(false);
    this.waitForTurn('guard');
  }

  search() {
    const t = this.hiddenTile;

    if (t.x === this.lightGrid.x && t.y === this.lightGrid.y) {
      this.player.setVisible(true);
      this.endGame('CAUGHT', 'The guard found the prisoner.');
    } else {
      this.waitForTurn('prisoner');
    }
  }

  updatePlayerPosition() {
    const point = this.project(this.playerGrid.x, this.playerGrid.y);
    this.player.setPosition(point.x, point.y);
    this.player.setDepth((this.playerGrid.x + this.playerGrid.y) * 100 + 10);
  }

  updateInterface() {
    if (this.turn === 'prisoner' && this.movesLeft === 0) {
      this.turnText.setText("PRISONER'S TURN - OUT OF MOVES");
      this.statusText.setText(`Moves left: 0   Objects: ${this.collected}/${ITEM_COUNT}`);
      this.controlsText.setText('Press ENTER or SPACE to hide');
    } else if (this.turn === 'prisoner') {
      this.turnText.setText("PRISONER'S TURN");
      this.statusText.setText(`Moves left: ${this.movesLeft}   Objects: ${this.collected}/${ITEM_COUNT}`);
      this.controlsText.setText('WASD/arrows to move, SPACE to hide');
    } else {
      this.turnText.setText("GUARD'S TURN");
      this.statusText.setText(`Objects: ${this.collected}/${ITEM_COUNT}`);
      this.controlsText.setText('WASD/arrows to aim light, SPACE to search');
    }
  }

  setBanner(title, text = '') {
    this.bannerBox.setVisible(Boolean(title));
    this.bannerTitle.setVisible(Boolean(title)).setText(title ?? '');
    this.bannerText.setVisible(Boolean(title)).setText(text);
  }

  diamond(x, y, halfWidth, halfHeight) {
    return [
      { x, y: y - halfHeight },
      { x: x + halfWidth, y },
      { x, y: y + halfHeight },
      { x: x - halfWidth, y },
    ];
  }
}
