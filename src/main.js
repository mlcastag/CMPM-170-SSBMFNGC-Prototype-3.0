import Phaser from 'phaser';
import './styles.css';
import { PanopticonScene } from './scenes/PanopticonScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#111820',
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PanopticonScene],
};

new Phaser.Game(config);

