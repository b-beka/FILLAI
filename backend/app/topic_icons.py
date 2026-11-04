"""Допустимые имена иконок Lucide для сфер и подтем (kebab-case)"""

FALLBACK_ICON = "book"
GENERAL_SPHERE = "Общее"

ICON_NAMES: frozenset[str] = frozenset(
    """
    book book-open book-open-check library notebook-pen graduation-cap school backpack pencil
    ruler calculator sigma pi square-function percent infinity triangle
    atom flask-conical test-tube microscope dna magnet zap flame
    leaf trees sprout bug bird fish paw-print rabbit cat dog
    globe map map-pin compass mountain waves cloud-sun sun moon
    languages message-circle quote file-text scroll
    landmark castle swords shield crown scale gavel history hourglass clock
    code terminal cpu database server laptop monitor smartphone binary braces git-branch
    bot brain network wifi lock key-round
    briefcase building-2 factory store shopping-cart wallet banknote coins piggy-bank
    trending-up chart-bar chart-pie chart-line target handshake users user-round
    stethoscope heart-pulse pill syringe cross activity
    dumbbell trophy medal bike footprints volleyball person-standing
    music guitar piano mic headphones palette brush camera film clapperboard
    theater drama pen-line feather
    utensils chef-hat coffee wine cake-slice shirt scissors hammer wrench drill hard-hat
    car plane ship bus rocket truck
    gamepad-2 puzzle dices lightbulb sparkles star flag heart smile baby
    house tent battery
    """.split()
)
