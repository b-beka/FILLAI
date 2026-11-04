"""Допустимые имена иконок Lucide для сфер и подтем (kebab-case)"""

FALLBACK_ICON = "book"

ICON_NAMES: frozenset[str] = frozenset(
    """
    book book-open book-open-check library notebook-pen graduation-cap school backpack pencil pen-tool
    ruler calculator sigma pi square-function function-square percent infinity triangle
    atom flask-conical flask-round test-tube microscope dna beaker magnet zap flame
    leaf trees sprout bug bird fish paw-print rabbit cat dog
    globe globe-2 earth map map-pin compass mountain waves cloud-sun sun moon
    languages message-circle messages-square speech quote text file-text scroll
    landmark castle swords shield crown scale gavel history hourglass clock
    code code-xml terminal cpu database server laptop monitor smartphone binary braces git-branch
    bot brain network wifi shield-check lock key-round
    briefcase building-2 factory store shopping-cart wallet banknote coins piggy-bank
    trending-up chart-bar chart-pie chart-line target handshake users user-round
    stethoscope heart-pulse pill syringe cross hospital activity
    dumbbell trophy medal bike footprints volleyball swords person-standing
    music music-2 guitar piano mic headphones palette brush paintbrush camera film clapperboard
    theater drama pen-line feather
    utensils chef-hat coffee wine cake-slice shirt scissors hammer wrench drill hard-hat
    car plane train ship bus rocket truck
    gamepad-2 puzzle dices lightbulb sparkles star flag heart smile baby
    home house tent plug battery lamp scale-3d
    """.split()
)
