extends CharacterBody2D

# Movement variables
@export var speed: float = 120.0
@export var acceleration: float = 600.0
@export var friction: float = 800.0
@export var jump_velocity: float = -280.0
@export var gravity: float = 600.0
@export var max_fall_speed: float = 400.0

# Advanced jump mechanics
var coyote_time: float = 0.0
var jump_buffer_time: float = 0.0
const COYOTE_TIME_MAX: float = 0.15
const JUMP_BUFFER_MAX: float = 0.1

# Animation
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var jump_particles: CPUParticles2D = $JumpParticles

# Game state
var is_dead: bool = false

func _ready() -> void:
	# Set up collision layers
	collision_layer = 1  # Player layer
	collision_mask = 2   # Collide with ground

func _physics_process(delta: float) -> void:
	if is_dead:
		return
	
	# Update timers
	if is_on_floor():
		coyote_time = COYOTE_TIME_MAX
	else:
		coyote_time -= delta
	
	if jump_buffer_time > 0:
		jump_buffer_time -= delta
	
	# Apply gravity
	if not is_on_floor():
		velocity.y = min(velocity.y + gravity * delta, max_fall_speed)
	
	# Handle jump input
	if Input.is_action_just_pressed("jump"):
		jump_buffer_time = JUMP_BUFFER_MAX
	
	# Jump with coyote time and buffer
	if jump_buffer_time > 0 and coyote_time > 0:
		velocity.y = jump_velocity
		jump_buffer_time = 0
		coyote_time = 0
		animated_sprite.play("jump")
		jump_particles.emitting = true
	
	# Variable jump height
	if Input.is_action_just_released("jump") and velocity.y < 0:
		velocity.y *= 0.5
	
	# Horizontal movement with acceleration
	var input_axis: float = Input.get_axis("move_left", "move_right")
	
	if input_axis != 0:
		# Accelerate
		velocity.x = move_toward(velocity.x, input_axis * speed, acceleration * delta)
		animated_sprite.flip_h = input_axis < 0
		
		if is_on_floor():
			animated_sprite.play("walk")
	else:
		# Apply friction
		velocity.x = move_toward(velocity.x, 0, friction * delta)
		
		if is_on_floor():
			animated_sprite.play("idle")
	
	# Update animation when in air
	if not is_on_floor() and velocity.y > 0:
		animated_sprite.play("fall")
	
	move_and_slide()
	
	# Check for death (fall off screen)
	if position.y > 200:
		die()

func die() -> void:
	is_dead = true
	get_tree().reload_current_scene()

func collect_coin() -> void:
	# Called by coin when collected
	pass
