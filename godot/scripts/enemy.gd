extends CharacterBody2D

@export var speed: float = 30.0
@export var gravity: float = 600.0

var direction: int = -1
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var floor_check_left: RayCast2D = $FloorCheckLeft
@onready var floor_check_right: RayCast2D = $FloorCheckRight

func _ready() -> void:
	animated_sprite.play("walk")
	
	# Set up collision
	collision_layer = 4  # Enemies layer
	collision_mask = 2   # Collide with ground
	
	add_to_group("enemies")

func _physics_process(delta: float) -> void:
	# Apply gravity
	if not is_on_floor():
		velocity.y += gravity * delta
	
	# Move horizontally
	velocity.x = direction * speed
	
	# Check for edges and walls
	if is_on_wall() or (direction < 0 and not floor_check_left.is_colliding()) or (direction > 0 and not floor_check_right.is_colliding()):
		direction *= -1
		animated_sprite.flip_h = direction > 0
	
	move_and_slide()

func die() -> void:
	# Add score
	var game_manager = get_node("/root/Main/GameManager")
	if game_manager:
		game_manager.add_score(200)
	
	queue_free()

func _on_hitbox_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		# Check if player is jumping on enemy
		if body.velocity.y > 0 and body.position.y < position.y - 4:
			body.velocity.y = -200
			die()
		else:
			# Player dies
			body.die()
