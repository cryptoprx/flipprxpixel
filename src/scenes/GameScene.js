import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('step1', '/step1.PNG');
        this.load.image('step2', '/step2.PNG');
        this.load.image('step3', '/step3.PNG');
        this.load.image('step4', '/step4.PNG');
        this.load.image('jump1', '/jump1.PNG');
        this.load.image('jump2', '/jump2.PNG');
        this.load.image('jump3', '/jump3.PNG');
    }

    create() {
        this.cameras.main.setBackgroundColor('#87CEEB');
        
        this.createPixelTiles();
        this.createPlayer();
        this.createControls();
        this.createUI();
        this.createCollectibles();
        this.createEnemies();
    }

    createPixelTiles() {
        const mountainGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        mountainGraphics.fillStyle(0x4A5568, 1);
        mountainGraphics.fillRect(8, 0, 16, 32);
        mountainGraphics.fillRect(4, 8, 24, 24);
        mountainGraphics.fillRect(0, 16, 32, 16);
        mountainGraphics.fillStyle(0x6B7280, 1);
        mountainGraphics.fillRect(0, 20, 12, 12);
        mountainGraphics.fillRect(8, 12, 8, 8);
        mountainGraphics.fillStyle(0xFFFFFF, 1);
        mountainGraphics.fillRect(12, 2, 4, 4);
        mountainGraphics.fillRect(10, 6, 8, 2);
        mountainGraphics.generateTexture('mountain', 32, 32);
        mountainGraphics.destroy();
        
        const hillGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        hillGraphics.fillStyle(0x22C55E, 1);
        hillGraphics.fillRect(4, 8, 24, 16);
        hillGraphics.fillRect(0, 16, 32, 8);
        hillGraphics.fillStyle(0x16A34A, 1);
        hillGraphics.fillRect(0, 20, 32, 4);
        hillGraphics.generateTexture('hill', 32, 24);
        hillGraphics.destroy();
        
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x8B4513, 1);
        graphics.fillRect(0, 0, 16, 16);
        graphics.fillStyle(0xD2691E, 1);
        graphics.fillRect(1, 1, 14, 14);
        graphics.fillStyle(0xA0522D, 1);
        graphics.fillRect(2, 2, 2, 2);
        graphics.fillRect(6, 2, 2, 2);
        graphics.fillRect(10, 2, 2, 2);
        graphics.fillRect(3, 6, 2, 2);
        graphics.fillRect(8, 6, 2, 2);
        graphics.fillRect(2, 10, 2, 2);
        graphics.fillRect(7, 10, 2, 2);
        graphics.fillRect(12, 10, 2, 2);
        graphics.fillStyle(0x654321, 1);
        graphics.fillRect(0, 0, 16, 1);
        graphics.fillRect(0, 0, 1, 16);
        graphics.generateTexture('ground', 16, 16);
        graphics.destroy();

        const brickGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        brickGraphics.fillStyle(0xFF6347, 1);
        brickGraphics.fillRect(0, 0, 16, 16);
        brickGraphics.fillStyle(0xFF7F50, 1);
        brickGraphics.fillRect(1, 1, 14, 14);
        brickGraphics.fillStyle(0xFFB6A3, 1);
        brickGraphics.fillRect(2, 2, 6, 6);
        brickGraphics.fillRect(10, 2, 4, 6);
        brickGraphics.fillRect(2, 10, 6, 4);
        brickGraphics.fillRect(10, 10, 4, 4);
        brickGraphics.fillStyle(0xCD5C5C, 1);
        brickGraphics.fillRect(1, 1, 14, 1);
        brickGraphics.fillRect(1, 1, 1, 14);
        brickGraphics.fillStyle(0x8B0000, 1);
        brickGraphics.fillRect(15, 0, 1, 16);
        brickGraphics.fillRect(0, 15, 16, 1);
        brickGraphics.fillRect(8, 0, 1, 8);
        brickGraphics.fillRect(0, 8, 8, 1);
        brickGraphics.generateTexture('brick', 16, 16);
        brickGraphics.destroy();

        const questionGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        questionGraphics.fillStyle(0xFFD700, 1);
        questionGraphics.fillRect(0, 0, 16, 16);
        questionGraphics.fillStyle(0xFFA500, 1);
        questionGraphics.fillRect(2, 2, 12, 12);
        questionGraphics.fillStyle(0xFFE55C, 1);
        questionGraphics.fillRect(3, 3, 10, 10);
        questionGraphics.fillStyle(0xFF8C00, 1);
        questionGraphics.fillRect(6, 4, 2, 2);
        questionGraphics.fillRect(8, 4, 2, 2);
        questionGraphics.fillRect(8, 6, 2, 2);
        questionGraphics.fillRect(7, 8, 2, 2);
        questionGraphics.fillRect(7, 11, 2, 2);
        questionGraphics.fillStyle(0xB8860B, 1);
        questionGraphics.fillRect(0, 15, 16, 1);
        questionGraphics.fillRect(15, 0, 1, 16);
        questionGraphics.generateTexture('question', 16, 16);
        questionGraphics.destroy();

        const pipeGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        pipeGraphics.fillStyle(0x228B22, 1);
        pipeGraphics.fillRect(0, 0, 16, 16);
        pipeGraphics.fillStyle(0x006400, 1);
        pipeGraphics.fillRect(2, 2, 12, 12);
        pipeGraphics.fillStyle(0x32CD32, 1);
        pipeGraphics.fillRect(4, 4, 8, 8);
        pipeGraphics.fillStyle(0x228B22, 1);
        pipeGraphics.fillRect(6, 6, 4, 4);
        pipeGraphics.generateTexture('pipe', 16, 16);
        pipeGraphics.destroy();

        const cloudGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        cloudGraphics.fillStyle(0xFFFFFF, 1);
        cloudGraphics.fillRect(4, 2, 8, 2);
        cloudGraphics.fillRect(2, 4, 12, 4);
        cloudGraphics.fillRect(4, 8, 8, 2);
        cloudGraphics.generateTexture('cloud', 16, 16);
        cloudGraphics.destroy();

        const bushGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bushGraphics.fillStyle(0x228B22, 1);
        bushGraphics.fillRect(2, 4, 4, 4);
        bushGraphics.fillRect(6, 2, 4, 6);
        bushGraphics.fillRect(10, 4, 4, 4);
        bushGraphics.fillStyle(0x32CD32, 1);
        bushGraphics.fillRect(3, 5, 2, 2);
        bushGraphics.fillRect(7, 3, 2, 2);
        bushGraphics.fillRect(11, 5, 2, 2);
        bushGraphics.generateTexture('bush', 16, 16);
        bushGraphics.destroy();
        
        this.mountains = this.add.group();
        for (let i = 0; i < 5; i++) {
            const mountain = this.add.image(i * 120 + 60, 100, 'mountain');
            mountain.setScrollFactor(0.3);
            this.mountains.add(mountain);
        }
        
        this.hills = this.add.group();
        for (let i = 0; i < 8; i++) {
            const hill = this.add.image(i * 80 + 40, 120, 'hill');
            hill.setScrollFactor(0.5);
            this.hills.add(hill);
        }
        
        this.platforms = this.physics.add.staticGroup();
        
        for (let i = 0; i < 30; i++) {
            this.platforms.create(i * 16 + 8, 136, 'ground');
        }
        
        for (let i = 0; i < 5; i++) {
            this.platforms.create(64 + i * 16, 104, 'brick');
        }
        
        this.platforms.create(32, 88, 'question');
        this.platforms.create(96, 88, 'question');
        this.platforms.create(128, 88, 'question');
        this.platforms.create(240, 88, 'question');
        this.platforms.create(320, 72, 'question');
        this.platforms.create(400, 88, 'question');
        
        for (let i = 0; i < 2; i++) {
            this.platforms.create(144 + i * 16, 120, 'pipe');
            this.platforms.create(144 + i * 16, 104, 'pipe');
        }
        
        for (let i = 0; i < 3; i++) {
            this.platforms.create(200 + i * 16, 120, 'pipe');
            this.platforms.create(200 + i * 16, 104, 'pipe');
            this.platforms.create(200 + i * 16, 88, 'pipe');
        }
        
        for (let i = 0; i < 4; i++) {
            this.platforms.create(272 + i * 16, 104, 'brick');
        }
        
        for (let i = 0; i < 3; i++) {
            this.platforms.create(352 + i * 16, 96, 'brick');
        }
        
        for (let i = 0; i < 2; i++) {
            this.platforms.create(416 + i * 16, 112, 'brick');
        }
        
        this.add.image(40, 24, 'cloud');
        this.add.image(96, 32, 'cloud');
        this.add.image(152, 28, 'cloud');
        this.add.image(240, 20, 'cloud');
        this.add.image(320, 32, 'cloud');
        this.add.image(400, 24, 'cloud');
        
        this.add.image(24, 128, 'bush');
        this.add.image(112, 128, 'bush');
        this.add.image(184, 128, 'bush');
        this.add.image(280, 128, 'bush');
        this.add.image(368, 128, 'bush');
        this.add.image(440, 128, 'bush');
    }

    createPlayer() {
        this.player = this.physics.add.sprite(32, 128, 'step1');
        this.player.setDisplaySize(16, 16);
        this.player.setBounce(0);
        this.player.setCollideWorldBounds(false);
        this.player.body.setSize(16, 16);
        this.player.body.setMaxVelocity(120, 400);
        this.player.body.setDrag(800, 0);
        
        this.playerSpeed = 120;
        this.playerAcceleration = 600;
        this.jumpVelocity = -280;
        this.coyoteTime = 0;
        this.jumpBufferTime = 0;
        
        if (!this.anims.exists('walk')) {
            this.anims.create({
                key: 'walk',
                frames: [
                    { key: 'step1' },
                    { key: 'step2' },
                    { key: 'step3' },
                    { key: 'step4' }
                ],
                frameRate: 10,
                repeat: -1
            });
        }
        
        if (!this.anims.exists('jump')) {
            this.anims.create({
                key: 'jump',
                frames: [
                    { key: 'jump1' },
                    { key: 'jump2' },
                    { key: 'jump3' }
                ],
                frameRate: 10,
                repeat: 0
            });
        }
        
        if (!this.anims.exists('idle')) {
            this.anims.create({
                key: 'idle',
                frames: [{ key: 'step1' }],
                frameRate: 1
            });
        }
        
        this.physics.add.collider(this.player, this.platforms);
    }

    createControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.jumpKey2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        
        this.cameras.main.setBounds(0, 0, 480, 144);
        this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
        this.cameras.main.setDeadzone(40, 20);
        this.physics.world.setBounds(0, 0, 480, 144);
    }

    createUI() {
        this.score = 0;
        this.scoreText = this.add.text(8, 8, 'SCORE: 0', {
            fontSize: '8px',
            fill: '#FFFFFF',
            fontFamily: 'Courier New',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.scoreText.setScrollFactor(0);
    }

    createCollectibles() {
        this.coins = this.physics.add.group();
        this.createCoin(32, 72);
        this.createCoin(96, 72);
        this.createCoin(128, 72);
        this.createCoin(80, 88);
        this.createCoin(240, 72);
        this.createCoin(280, 88);
        this.createCoin(320, 56);
        this.createCoin(360, 80);
        this.createCoin(400, 72);
        this.createCoin(424, 96);
        
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    }

    createEnemies() {
        this.enemies = this.physics.add.group();
        this.createEnemy(120, 120);
        this.createEnemy(180, 120);
        this.createEnemy(250, 120);
        this.createEnemy(340, 120);
        this.createEnemy(410, 120);
        
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    }

    createCoin(x, y) {
        if (!this.textures.exists('coin')) {
            const coinGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            coinGraphics.fillStyle(0xFFD700, 1);
            coinGraphics.fillRect(2, 0, 4, 8);
            coinGraphics.fillRect(0, 2, 8, 4);
            coinGraphics.fillStyle(0xFFA500, 1);
            coinGraphics.fillRect(3, 2, 2, 4);
            coinGraphics.generateTexture('coin', 8, 8);
            coinGraphics.destroy();
        }
        
        const coin = this.coins.create(x, y, 'coin');
        coin.body.setAllowGravity(false);
        
        this.tweens.add({
            targets: coin,
            y: y - 4,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.tweens.add({
            targets: coin,
            angle: 360,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    createEnemy(x, y) {
        if (!this.textures.exists('enemy')) {
            const enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            enemyGraphics.fillStyle(0x8B4513, 1);
            enemyGraphics.fillRect(0, 4, 12, 8);
            enemyGraphics.fillRect(2, 2, 8, 2);
            enemyGraphics.fillStyle(0xFF4500, 1);
            enemyGraphics.fillRect(1, 5, 10, 6);
            enemyGraphics.fillStyle(0x000000, 1);
            enemyGraphics.fillRect(3, 5, 2, 2);
            enemyGraphics.fillRect(7, 5, 2, 2);
            enemyGraphics.fillStyle(0xFFFFFF, 1);
            enemyGraphics.fillRect(4, 6, 1, 1);
            enemyGraphics.fillRect(8, 6, 1, 1);
            enemyGraphics.generateTexture('enemy', 12, 12);
            enemyGraphics.destroy();
        }
        
        const enemy = this.enemies.create(x, y, 'enemy');
        enemy.setBounce(0);
        enemy.setCollideWorldBounds(true);
        enemy.setVelocityX(-30);
        enemy.body.setSize(12, 12);
        
        enemy.direction = -1;
    }

    collectCoin(player, coin) {
        const particles = this.add.particles(coin.x, coin.y, 'coin', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 8,
            blendMode: 'ADD'
        });
        
        this.time.delayedCall(300, () => {
            particles.destroy();
        });
        
        coin.destroy();
        this.score += 100;
        this.scoreText.setText('SCORE: ' + this.score);
        
        this.tweens.add({
            targets: this.scoreText,
            scale: 1.2,
            duration: 100,
            yoyo: true
        });
    }

    hitEnemy(player, enemy) {
        if (player.body.velocity.y > 0 && player.y < enemy.y - 4) {
            enemy.destroy();
            player.setVelocityY(-200);
            this.score += 200;
            this.scoreText.setText('SCORE: ' + this.score);
        } else {
            this.scene.restart();
            this.score = 0;
        }
    }

    update(time, delta) {
        const deltaSeconds = delta / 1000;
        
        if (this.player.body.touching.down) {
            this.coyoteTime = 0.15;
        } else {
            this.coyoteTime -= deltaSeconds;
        }
        
        if (this.jumpBufferTime > 0) {
            this.jumpBufferTime -= deltaSeconds;
        }
        
        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-this.playerAcceleration);
            this.player.flipX = true;
            if (this.player.body.touching.down) {
                this.player.anims.play('walk', true);
            }
        } else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(this.playerAcceleration);
            this.player.flipX = false;
            if (this.player.body.touching.down) {
                this.player.anims.play('walk', true);
            }
        } else {
            this.player.setAccelerationX(0);
            if (this.player.body.touching.down) {
                this.player.anims.play('idle', true);
            }
        }
        
        const jumpPressed = this.cursors.up.isDown || this.jumpKey.isDown || this.jumpKey2.isDown;
        const jumpJustPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || 
                                Phaser.Input.Keyboard.JustDown(this.jumpKey) || 
                                Phaser.Input.Keyboard.JustDown(this.jumpKey2);
        
        if (jumpJustPressed) {
            this.jumpBufferTime = 0.1;
        }
        
        if (this.jumpBufferTime > 0 && this.coyoteTime > 0) {
            this.player.setVelocityY(this.jumpVelocity);
            this.player.anims.play('jump', true);
            this.jumpBufferTime = 0;
            this.coyoteTime = 0;
            
            const jumpDust = this.add.particles(this.player.x, this.player.y + 8, 'coin', {
                speed: { min: 10, max: 30 },
                angle: { min: 60, max: 120 },
                scale: { start: 0.3, end: 0 },
                lifespan: 200,
                quantity: 3
            });
            
            this.time.delayedCall(200, () => {
                jumpDust.destroy();
            });
        }
        
        if (!jumpPressed && this.player.body.velocity.y < 0) {
            this.player.setVelocityY(this.player.body.velocity.y * 0.5);
        }

        if (this.player.y > 160) {
            this.scene.restart();
            this.score = 0;
        }
        
        this.enemies.children.entries.forEach(enemy => {
            if (enemy.body.velocity.x === 0) {
                enemy.direction *= -1;
                enemy.setVelocityX(enemy.direction * 30);
            }
            
            if (enemy.body.blocked.left || enemy.body.blocked.right) {
                enemy.direction *= -1;
                enemy.setVelocityX(enemy.direction * 30);
            }
        });
    }
}
