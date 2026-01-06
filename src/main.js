import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 160,
    height: 144,
    parent: 'game-container',
    backgroundColor: '#9bbc0f',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [GameScene],
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: 4
    },
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true
    }
};

const game = new Phaser.Game(config);
