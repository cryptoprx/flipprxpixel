extends Area2D

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collect_particles: CPUParticles2D = $CollectParticles

var float_offset: float = 0.0
var base_y: float = 0.0

func _ready() -> void:
	base_y = position.y
	animated_sprite.play("spin")
	
	# Set up collision
	collision_layer = 8  # Collectibles layer
	collision_mask = 1   # Detect player
	
	# Connect signal
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	# Floating animation
	float_offset += delta * 2.0
	position.y = base_y + sin(float_offset) * 4.0

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		collect()

func collect() -> void:
	# Emit particles
	collect_particles.emitting = true
	
	# Add score
	var game_manager = get_node("/root/Main/GameManager")
	if game_manager:
		game_manager.add_score(100)
	
	# Hide sprite but keep node alive for particles
	animated_sprite.visible = false
	collision_layer = 0
	
	# Remove after particles finish
	await get_tree().create_timer(0.3).timeout
	queue_free()
