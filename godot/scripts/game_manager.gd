extends Node

var score: int = 0

@onready var score_label: Label = $"../UI/ScoreLabel"

func _ready() -> void:
	update_score_display()

func add_score(points: int) -> void:
	score += points
	update_score_display()
	
	# Animate score text
	if score_label:
		var tween = create_tween()
		tween.tween_property(score_label, "scale", Vector2(1.2, 1.2), 0.1)
		tween.tween_property(score_label, "scale", Vector2(1.0, 1.0), 0.1)

func update_score_display() -> void:
	if score_label:
		score_label.text = "SCORE: " + str(score)

func reset_score() -> void:
	score = 0
	update_score_display()
