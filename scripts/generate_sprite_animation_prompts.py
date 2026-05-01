from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "prompts" / "sprites" / "animation-set"


COMMON_STYLE = [
    "pixel-art RTS sprite",
    "late-90s pre-rendered look",
    "crisp readable pixels",
    "strong silhouette",
    "consistent proportions",
]


CHARACTERS = {
    "teacher-aide": {
        "name": "Teacher's Aide",
        "role": "faculty worker / gatherer unit",
        "rear_feature": "back of cardigan, lanyard, and satchel visible from behind",
        "side_feature": "clipboard, folder stack, or small toolbox visible in profile",
        "front_feature": "tired eyes, lanyard, cardigan, and clipboard clearly visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with slightly cursed staffroom energy",
        "highlight": "muted school-office colors with eerie photocopier-blue highlights",
        "bullets": [
            "overworked Australian school teacher's aide",
            "tired but determined expression only visible where appropriate",
            "practical cardigan, slightly worn and oversized",
            "collared shirt",
            "dark sensible pants",
            "practical shoes",
            "lanyard with keys",
            "messy tied-back hair or short frazzled hair",
            "small satchel or tote bag full of forms, folders, and confiscated items",
            "carries a clipboard, folder stack, or small toolbox",
            "looks like the only person in the school who knows how to fix the photocopier",
        ],
        "idle": [
            "stands in a tired ready stance, clutching clipboard or folder stack",
            "subtle breathing, tiny lanyard/key movement, one weary blink",
            "returns to the same practical worker stance with fixed feet",
        ],
        "walk": [
            "brisk practical staffroom walk with clipboard or toolbox held close",
            "satchel and lanyard swing slightly while the feet step clearly",
            "loop must feel efficient, overworked, and focused on fixing something",
        ],
        "attack": [
            "quick defensive clipboard or folder swat",
            "frame 1 raises clipboard with reluctant determination",
            "frame 2 short close-range swat with tiny paper-flick impact",
            "frame 3 returns to tired ready stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 staggers as the paperwork slips",
            "frame 2 drops to a seated or kneeling exhausted pose",
            "frame 3 slumps beside scattered forms like they need a sick day",
        ],
        "portrait_rows": ["IDLE", "TALK", "STRESSED"],
        "portrait": [
            "IDLE row: subtle breathing, tired blink, tiny lanyard/key movement",
            "TALK row: mouth movement, one eyebrow raised, paperwork slightly lifted",
            "STRESSED row: eyes wider, jaw tense, keys and papers shaking slightly",
        ],
        "personality": [
            "overworked, underpaid, unreasonably capable",
            "polite but one paper jam away from total collapse",
            "dry school-staffroom satire",
            "expression says: \"I already logged that maintenance request twice.\"",
        ],
    },
    "substitute-teacher": {
        "name": "Substitute Teacher",
        "role": "faculty basic melee unit",
        "rear_feature": "back of worn cardigan, lanyard, and lesson folder visible from behind",
        "side_feature": "rolled lesson folder, clipboard, or emergency DVD case visible in profile",
        "front_feature": "tired eyes, crooked lanyard, cardigan, and lesson folder clearly visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed relief-teacher energy",
        "highlight": "muted cardigan and school-office colors with eerie staffroom highlights",
        "bullets": [
            "exhausted relief teacher who has seen enough",
            "worn beige cardigan",
            "collared shirt",
            "sensible dark pants",
            "practical shoes",
            "crooked lanyard with too many keys",
            "messy hair and tired posture",
            "carries a rolled lesson plan folder, clipboard, or emergency DVD case",
            "looks like they arrived expecting silent reading and found a classroom uprising",
        ],
        "idle": [
            "stands in a tense impatient stance, clutching rolled lesson folder",
            "tiny foot tap, lanyard movement, slow exhausted blink",
            "returns to the same tight ready pose",
        ],
        "walk": [
            "brisk irritated shuffle toward a noisy classroom",
            "cardigan and lanyard bounce slightly, folder held ready",
            "loop must feel cheap, practical, and fed-up",
        ],
        "attack": [
            "rolled-folder melee attack",
            "frame 1 raises clipboard or rolled folder with exhausted irritation",
            "frame 2 quick close-range swat with a tiny impact spark",
            "frame 3 returns to tense ready stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 recoils with disbelief, folder slipping",
            "frame 2 collapses into a seated or kneeling pose",
            "frame 3 slumps like they are requesting never to cover this class again",
        ],
        "portrait_rows": ["IDLE", "TALK", "STRESSED"],
        "portrait": [
            "IDLE row: slow blink, tiny shoulder slump, lanyard barely moving",
            "TALK row: mouth movement, eyebrow twitch, folder or DVD case lifted slightly",
            "STRESSED row: eyes wider, jaw clenched, papers shake slightly",
        ],
        "personality": [
            "has no idea what the lesson plan is",
            "came prepared to put on a DVD and survive the day",
            "cheap, disposable early defense energy",
            "expression says: \"Nobody told me about this class.\"",
        ],
    },
    "pe-teacher": {
        "name": "P.E. Teacher",
        "role": "faculty elite melee shock troop",
        "rear_feature": "back of sports polo, cap, whistle cord, and broad shoulders visible from behind",
        "side_feature": "whistle, cap, stopwatch, and bulky athletic profile visible",
        "front_feature": "booming expression, whistle, cap, sports polo, and zinc stripe visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed oval-at-dawn energy",
        "highlight": "muted sports colors with eerie whistle-metal highlights",
        "bullets": [
            "bulky Australian sports teacher build",
            "school sports polo",
            "short shorts or tracksuit pants",
            "running shoes",
            "whistle on lanyard",
            "cap or sun visor",
            "zinc sunscreen stripe on nose where visible",
            "stopwatch or clipboard at belt",
            "looks like they believe every problem can be solved by running a lap",
        ],
        "idle": [
            "wide athletic stance with chest puffed out",
            "bounces slightly on heels, whistle bobbing, one hand ready to point",
            "returns to the same overconfident coaching pose",
        ],
        "walk": [
            "powerful marching jog with heavy confident steps",
            "arms pump, whistle swings, cap stays stable",
            "loop must feel like storming across the oval to break up nonsense",
        ],
        "attack": [
            "charge melee ability",
            "frame 1 leans forward into a sprint start, arms loaded",
            "frame 2 powerful shoulder bump or whistle-led charge impact with small dust burst",
            "frame 3 snaps back into wide athletic stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 staggers with offended disbelief",
            "frame 2 drops to one knee as whistle swings loose",
            "frame 3 slumps dramatically, furious that cardio failed",
        ],
        "portrait_rows": ["IDLE", "SHOUT", "CHARGE"],
        "portrait": [
            "IDLE row: confident breathing, whistle bob, slight head nod",
            "SHOUT row: mouth opens as if yelling across the oval, whistle raised slightly",
            "CHARGE row: head dips forward, eyes widen with competitive focus",
        ],
        "personality": [
            "believes 90 percent of life's problems can be solved by running a lap of the oval",
            "intense, competitive, and way too excited about fitness testing",
            "expression says: \"Drop and give me two laps.\"",
        ],
    },
    "maths-teacher": {
        "name": "Maths Teacher",
        "role": "faculty ranged DPS unit",
        "rear_feature": "back of cardigan or vest, lanyard, and chalk-dusted sleeves visible",
        "side_feature": "glasses lens, chalk hand, calculator or ruler visible in profile",
        "front_feature": "both eyes behind glasses, stern face, chalk, and calculator or ruler visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed geometry-class energy",
        "highlight": "muted classroom colors with eerie chalk-white highlights",
        "bullets": [
            "precise Australian maths teacher",
            "neat but frazzled teacher clothes",
            "collared shirt with cardigan or vest",
            "sensible pants or skirt",
            "glasses",
            "lanyard",
            "chalk dust on sleeves",
            "calculator or ruler clipped to belt",
            "holds chalk like a dart",
            "looks like they calculate chalk trajectories with terrifying accuracy",
        ],
        "idle": [
            "stands perfectly still with stern posture",
            "adjusts glasses, taps chalk into one palm, tiny chalk dust motion",
            "returns to the same precise ready stance",
        ],
        "walk": [
            "brisk exact teacher stride, no wasted movement",
            "chalk hand stays ready, cardigan or vest shifts slightly",
            "loop must feel efficient, irritated, and mathematically precise",
        ],
        "attack": [
            "ranged chalk throw",
            "frame 1 raises chalk and aims with mathematical precision",
            "frame 2 snaps arm forward, releasing chalk with a tiny chalk-dust streak",
            "frame 3 returns to stern ready stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 glasses slip and chalk dust puffs",
            "frame 2 drops calculator or chalk while knees buckle",
            "frame 3 slumps in offended dignity like the equation has failed",
        ],
        "portrait_rows": ["IDLE", "LECTURE", "CALCULATING"],
        "portrait": [
            "IDLE row: tiny glasses adjustment, slow blink, subtle chalk dust",
            "LECTURE row: mouth movement, raised eyebrow, chalk or ruler lifted like a pointer",
            "CALCULATING row: eyes narrow, glasses flash slightly, chalk hand twitches",
        ],
        "personality": [
            "calculates chalk trajectories with terrifying precision",
            "clever, intense, and offended by wrong answers",
            "expression says: \"I have shown my working, and you are still wrong.\"",
        ],
    },
    "science-teacher": {
        "name": "Science Teacher",
        "role": "faculty area-of-effect ranged unit",
        "rear_feature": "back of lab coat, goggles strap, and test tubes visible from behind",
        "side_feature": "goggle lens, glowing flask, and stained lab coat visible in profile",
        "front_feature": "crooked goggles, delighted eyes, lab coat, and glowing flask clearly visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed science-lab energy",
        "highlight": "muted lab colors with eerie green chemical glow",
        "bullets": [
            "chaotic Australian public school science teacher",
            "white lab coat over outdated teacher clothes",
            "safety goggles worn or pushed up crookedly",
            "messy hair with a singed edge",
            "rubber gloves",
            "stained sleeves",
            "pockets full of test tubes and pens",
            "holds a glowing chemical flask with unsafe enthusiasm",
            "looks like they have not updated the safety manual since 1998",
        ],
        "idle": [
            "stands with unstable enthusiasm while swirling a glowing flask",
            "tiny bubbles, goggle wobble, lab coat shift",
            "returns to delighted ready stance without drifting feet",
        ],
        "walk": [
            "hurried awkward lab shuffle while carrying the flask carefully but not carefully enough",
            "lab coat bounces, test tubes rattle, goggles wobble",
            "loop must feel excited and academically irresponsible",
        ],
        "attack": [
            "volatile flask throw",
            "frame 1 winds up with glowing flask, lab coat shifting",
            "frame 2 throws flask with a small compact chemical trail",
            "frame 3 returns to delighted ready stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 recoils as goggles jolt and flask sloshes",
            "frame 2 drops safely into a dramatic slump with a harmless puff of smoke",
            "frame 3 lies or kneels in failed-experiment embarrassment",
        ],
        "portrait_rows": ["IDLE", "EXPLAIN", "EXCITED"],
        "portrait": [
            "IDLE row: flask bubbles gently, tiny goggle wobble, slow blink",
            "EXPLAIN row: mouth movement, one gloved finger lifted, flask swirls slightly",
            "EXCITED row: eyes widen, grin grows, tiny harmless chemical puff",
        ],
        "personality": [
            "has not updated the safety manual since 1998",
            "treats every explosion as a learning opportunity",
            "expression says: \"This is probably curriculum-aligned.\"",
        ],
    },
    "tuckshop-lady": {
        "name": "Tuckshop Lady",
        "role": "faculty healer unit",
        "rear_feature": "back of apron, hairnet or canteen cap, and pie tray visible",
        "side_feature": "pie tray, oven mitt, and sauce bottle visible in profile",
        "front_feature": "apron, pie tray, hairnet or cap, and strict warm expression visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed canteen-window energy",
        "highlight": "warm pie colors with eerie cafeteria highlights",
        "bullets": [
            "no-nonsense Australian school canteen worker",
            "white apron",
            "hairnet or canteen cap",
            "practical shirt and skirt or pants",
            "sensible shoes",
            "oven mitt or serving glove",
            "tray of hot meat pies",
            "tiny sauce bottle tucked into apron",
            "looks kind but terrifyingly strict about sauce costing extra",
        ],
        "idle": [
            "stands behind an invisible canteen counter posture with pie tray ready",
            "pie steam rises slightly, apron shifts, calm blink",
            "returns to warm but strict service stance",
        ],
        "walk": [
            "short practical canteen-worker steps while balancing a tray of pies",
            "apron and tray move subtly, sauce bottle stays tucked in",
            "loop must feel careful, steady, and no-nonsense",
        ],
        "attack": [
            "healing meat pie throw",
            "frame 1 lifts hot meat pie from tray",
            "frame 2 tosses pie forward with a small warm healing sparkle",
            "frame 3 returns to service stance with tray ready",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 tray wobbles and pie steam puffs",
            "frame 2 drops to a tired seated or kneeling pose",
            "frame 3 slumps beside tray, still guarding the sauce bottle",
        ],
        "portrait_rows": ["IDLE", "CALLING", "STRICT"],
        "portrait": [
            "IDLE row: gentle blink, pie steam rises slightly, apron shifts subtly",
            "CALLING row: mouth movement as if calling the next order, tray lifts slightly",
            "STRICT row: eyes narrow, sauce bottle pointed slightly, expression warns that sauce is not free",
        ],
        "personality": [
            "heals staff by throwing hot meat pies",
            "generous with food, strict about sauce money",
            "expression says: \"Love, it costs 50 cents for sauce.\"",
        ],
    },
    "bowling-machine": {
        "name": "Bowling Machine",
        "role": "faculty defense tower",
        "rear_feature": "rear wheels, back casing, and hopper visible, no front chute dominating",
        "side_feature": "ball chute, feeder wheel, and wheeled base visible in profile",
        "front_feature": "front chute centered, hopper visible above, casing symmetrical",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed sports-storage energy",
        "highlight": "muted metal and cricket-ball colors with eerie red highlights",
        "bullets": [
            "school cricket bowling machine set to fast bowler mode",
            "squat wheeled machine body",
            "ball feeder hopper",
            "visible spinning wheel or chute",
            "taped-on staffroom warning label shape but no readable text",
            "bucket of red cricket balls attached or nearby within the sprite",
            "looks emotionless, overpowered, and unable to understand pity",
        ],
        "idle": [
            "machine sits in standby with tiny mechanical vibration",
            "hopper and casing barely shake, cricket ball visible in feeder",
            "returns to the same static defense-tower pose",
        ],
        "walk": [
            "wheeled reposition animation for placement or deployment",
            "small wheels roll, casing rattles, hopper stays attached",
            "loop must feel like heavy sports equipment being dragged into position",
        ],
        "attack": [
            "rapid cricket ball firing",
            "frame 1 feeder wheel spins up with small vibration",
            "frame 2 cricket ball launches with compact motion streak",
            "frame 3 machine recoils slightly and resets",
        ],
        "death": [
            "cartoon breakdown animation, not explosive gore",
            "frame 1 casing shakes and feeder jams",
            "frame 2 machine slumps, wheel pops loose, tiny harmless sparks",
            "frame 3 broken defense-tower pose with cricket balls spilled nearby",
        ],
        "portrait_rows": ["IDLE", "SPINUP", "BREAKDOWN"],
        "portrait": [
            "IDLE row: tiny mechanical vibration, hopper barely shifts, standby pose",
            "SPINUP row: wheels or internal parts blur slightly, casing shakes, ball moves into chute",
            "BREAKDOWN row: casing dips, tiny sparks, cricket balls wobble",
        ],
        "personality": [
            "set to fast bowler mode",
            "does not understand mercy",
            "staffroom-approved defensive equipment with unsafe confidence",
            "expression equivalent: blank machine menace",
        ],
    },
    "year-7": {
        "name": "Year 7 Schoolkid",
        "role": "student swarmer enemy",
        "rear_feature": "oversized olive-green backpack fully visible and centered",
        "side_feature": "one eye, spiky hair, and huge backpack visible in profile",
        "front_feature": "angry confused face, untucked shirt, and backpack straps visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed first-day-of-high-school energy",
        "highlight": "muted school-uniform colors with eerie backpack-green highlights",
        "bullets": [
            "tiny chaotic new student",
            "messy brown spiky hair",
            "white untucked school shirt",
            "navy shorts",
            "white socks",
            "sneakers",
            "oversized olive-green backpack bigger than their torso",
            "sugar-fueled posture",
            "angry and confused expression only visible where appropriate",
            "looks like they have no map, no timetable, and unlimited energy",
        ],
        "idle": [
            "jittery sugar-fueled stance under the huge backpack",
            "hair spikes wobble, backpack straps shift, quick blink",
            "returns to the same angry confused pose",
        ],
        "walk": [
            "fast chaotic schoolkid run with backpack bouncing too much",
            "small legs pump quickly, backpack lags behind then catches up",
            "loop must feel weak, numerous, and impossible to organize",
        ],
        "attack": [
            "backpack melee attack",
            "frame 1 winds up by twisting with the huge backpack",
            "frame 2 swings or bumps with the backpack, tiny impact spark",
            "frame 3 wobbly recovery, still angry and confused",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 backpack overbalances the student",
            "frame 2 tumbles or sits down under the oversized backpack",
            "frame 3 sprawls harmlessly with backpack on top like a failed timetable run",
        ],
        "portrait_rows": ["IDLE", "SHOUT", "PANIC"],
        "portrait": [
            "IDLE row: jittery blink, backpack straps shift slightly, restless bounce",
            "SHOUT row: mouth movement, eyebrows angry, head bobs with sugar-fueled outrage",
            "PANIC row: eyes widen, hair spikes wobble, backpack straps shake",
        ],
        "personality": [
            "fast, weak, and numerous",
            "runs on pure sugar and confusion",
            "has a backpack bigger than they are",
            "expression says: \"Where is room B12 and why is everyone yelling?\"",
        ],
    },
    "footy-kid": {
        "name": "Footy Kid",
        "role": "student tank enemy",
        "rear_feature": "back of blue and yellow footy jersey and broad shoulders visible",
        "side_feature": "football tucked under one arm, stocky profile, and boots visible",
        "front_feature": "stocky face, jersey front with no readable text, and football visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed lunchtime-footy energy",
        "highlight": "muted sports colors with eerie oval-green highlights",
        "bullets": [
            "big school sports kid",
            "blue and yellow footy jersey with no readable numbers or text",
            "navy shorts",
            "long socks",
            "scuffed boots or sneakers",
            "football tucked under one arm",
            "mouthguard or cheek stripe where visible",
            "stocky build, slow but hard to stop",
            "looks like they have practiced a drop punt since birth",
        ],
        "idle": [
            "heavy stubborn stance with football tucked in",
            "slow breathing, shoulders rise, ball shifts slightly",
            "returns to the same tanky ready pose",
        ],
        "walk": [
            "slow heavy run or jog with football tucked under one arm",
            "feet plant hard, shoulders sway, jersey bounces slightly",
            "loop must feel tanky and hard to stop",
        ],
        "attack": [
            "footy tackle melee attack",
            "frame 1 crouches and braces with football tucked in",
            "frame 2 lunges into a shoulder tackle with a tiny dust or impact spark",
            "frame 3 heavy recovery, still holding the ball",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 stumbles as the football pops loose slightly",
            "frame 2 drops to one knee or sits back hard",
            "frame 3 slumps beside the football like the siren finally sounded",
        ],
        "portrait_rows": ["IDLE", "CHANT", "BRACE"],
        "portrait": [
            "IDLE row: heavy breathing, football shifts slightly, slow blink",
            "CHANT row: mouth movement as if calling for the ball, eyebrows intense, head bobs",
            "BRACE row: chin tucks down, shoulders rise, expression locks into tackle mode",
        ],
        "personality": [
            "slower but high health",
            "absorbs a lot of damage",
            "has practiced a drop punt since birth",
            "expression says: \"Everything is a tackle drill.\"",
        ],
    },
    "bully": {
        "name": "The Bully",
        "role": "student heavy hitter enemy",
        "rear_feature": "broad back, oversized hoodie or stretched uniform, and low school bag visible",
        "side_feature": "heavy arm swing, low bag, and looming profile visible",
        "front_feature": "broad shoulders, scruffy moustache or stubble, and looming expression visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed back-of-the-bike-sheds energy",
        "highlight": "muted school colors with eerie corridor-shadow highlights",
        "bullets": [
            "huge older-looking school student",
            "stretched school shirt or dark hoodie over uniform",
            "dark pants or shorts",
            "heavy shoes",
            "rough school bag slung low",
            "scruffy moustache or stubble only visible where direction allows",
            "broad shoulders and looming posture",
            "looks like they have been in Year 10 for three years",
        ],
        "idle": [
            "slow intimidating stance with shoulders forward",
            "heavy breathing, bag strap shifts, eyes narrow where visible",
            "returns to the same corridor-blocking pose",
        ],
        "walk": [
            "slow heavy corridor stomp",
            "shoulders sway, bag swings low, feet plant with weight",
            "loop must feel high-health and hard to move",
        ],
        "attack": [
            "heavy shove melee attack",
            "frame 1 pulls one shoulder back and raises a heavy arm",
            "frame 2 performs a big shove or bag bump with a compact impact spark",
            "frame 3 settles back into a looming stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 staggers backward with shocked pride",
            "frame 2 drops to a seated slump as bag slips down",
            "frame 3 slumps in defeated corridor-king embarrassment",
        ],
        "portrait_rows": ["IDLE", "TAUNT", "LOOM"],
        "portrait": [
            "IDLE row: slow intimidating blink, shoulders shift heavily, bag strap moves slightly",
            "TAUNT row: mouth movement, smug eyebrow raise, head tilts forward",
            "LOOM row: shoulders rise, eyes narrow, face moves slightly closer in a threatening cartoon lean",
        ],
        "personality": [
            "very high health and damage",
            "needs focused fire to take down",
            "comically overconfident",
            "expression says: \"Move, this hallway is mine.\"",
        ],
    },
    "mean-girl": {
        "name": "Mean Girl",
        "role": "student ranged support enemy",
        "rear_feature": "back of neat uniform, styled hair, and phone held away from camera",
        "side_feature": "phone, styled hair, small bag, and smug profile visible",
        "front_feature": "both eyes, neat uniform, pink accessories, and raised phone visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed group-chat energy",
        "highlight": "muted school colors with toxic pink highlights",
        "bullets": [
            "sharp Australian school student",
            "neat school uniform with pink accessories",
            "perfectly styled hair",
            "phone held like a weapon of mass reputation damage",
            "small handbag or school bag",
            "smug posture",
            "expression only visible where appropriate",
            "looks like she can ruin your reputation before recess ends",
        ],
        "idle": [
            "stands smugly with phone ready",
            "tiny hair movement, phone glint, slow confident blink",
            "returns to the same toxic calm stance",
        ],
        "walk": [
            "controlled confident walk while looking at phone",
            "small bag and hair move subtly, phone stays raised",
            "loop must feel calm, judgemental, and dangerous to reputations",
        ],
        "attack": [
            "toxic gossip ranged attack",
            "frame 1 raises phone and starts typing with smug precision",
            "frame 2 releases a compact pink gossip pulse or tiny phone projectile",
            "frame 3 returns to smug stance, phone still up",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 recoils as phone signal or gossip spark fizzles",
            "frame 2 slumps dramatically while clutching the phone",
            "frame 3 sits or kneels in offended disbelief",
        ],
        "portrait_rows": ["IDLE", "GOSSIP", "SMIRK"],
        "portrait": [
            "IDLE row: tiny blink, phone glints subtly, hair barely shifts",
            "GOSSIP row: mouth movement, phone rises, eyes sharpen with toxic confidence",
            "SMIRK row: one eyebrow lifts, smile grows, tiny pink gossip spark near phone",
        ],
        "personality": [
            "throws projectiles and slows nearby faculty with toxic gossip",
            "phone is a weapon of mass reputation damage",
            "expression says: \"Everyone already knows.\"",
        ],
    },
    "eshay": {
        "name": "Eshay",
        "role": "student fast striker enemy",
        "rear_feature": "tracksuit back, cap, and bum bag strap visible from behind",
        "side_feature": "cap, bum bag, fast stride, and wiry profile visible",
        "front_feature": "cocky grin, cap, tracksuit, and bum bag visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed train-station-after-school energy",
        "highlight": "muted streetwear colors with eerie red highlights",
        "bullets": [
            "wiry Australian train-station troublemaker student",
            "red or dark tracksuit jacket",
            "shorts or track pants",
            "sneakers",
            "cap",
            "bum bag worn across chest or waist",
            "restless fast posture",
            "looks like they are always asking for a spare cigarette at the train station",
            "slang energy without readable text",
        ],
        "idle": [
            "restless twitchy stance, always ready to bolt",
            "cap dips, bum bag strap shifts, quick blink",
            "returns to the same cocky ready pose",
        ],
        "walk": [
            "very fast darting run with cheeky forward lean",
            "feet blur slightly, bum bag bounces, cap stays low",
            "loop must feel extremely quick and hard to pin down",
        ],
        "attack": [
            "fast striker melee attack",
            "frame 1 leans forward into a quick rush",
            "frame 2 snaps into a fast close-range bump or swipe with a tiny speed streak",
            "frame 3 rebounds into a twitchy ready stance",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 skids out of control",
            "frame 2 tumbles into a harmless crouched or seated pose",
            "frame 3 slumps with cap askew and bum bag still intact",
        ],
        "portrait_rows": ["IDLE", "CHATTER", "RUSH"],
        "portrait": [
            "IDLE row: fast blink, cap dips slightly, bum bag strap shifts",
            "CHATTER row: mouth movement, cocky head tilt, eyebrows bounce",
            "RUSH row: eyes sharpen, head leans forward, tiny speed streaks kept close to the face",
        ],
        "personality": [
            "extremely fast movement and attack speed",
            "cheeky, twitchy, and overconfident",
            "asks everyone for a spare cigarette at the train station",
            "expression says: \"Eetswa, lad.\"",
        ],
    },
    "class-clown": {
        "name": "Class Clown",
        "role": "student disruptor enemy",
        "rear_feature": "back of messy untucked uniform visible, prank pockets visible from behind",
        "side_feature": "red clown nose, water bomb, and theatrical profile visible",
        "front_feature": "both eyes, red clown nose, crooked tie, and water bomb visible",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed assembly-prank energy",
        "highlight": "muted school colors with bright clown-red and water-blue highlights",
        "bullets": [
            "school student dressed like a troublemaker",
            "untucked uniform",
            "crooked tie or loose shirt",
            "tiny red clown nose where visible",
            "messy hair",
            "pockets full of prank items",
            "holds a blue water bomb",
            "theatrical posture",
            "looks like disruptive behavior is their love language",
        ],
        "idle": [
            "bouncy theatrical stance with water bomb hidden or ready",
            "clown nose wiggles, shoulders bounce, mischievous blink",
            "returns to prank-ready pose",
        ],
        "walk": [
            "sneaky exaggerated tiptoe-run with messy uniform bouncing",
            "water bomb held carefully, pockets wobble",
            "loop must feel like a prank about to happen",
        ],
        "attack": [
            "water bomb stun attack",
            "frame 1 winds up with blue water bomb",
            "frame 2 throws water bomb with a compact blue splash trail",
            "frame 3 recovers with theatrical giggle posture",
        ],
        "death": [
            "cartoon defeat animation, not gore",
            "frame 1 slips on their own prank energy",
            "frame 2 drops into a harmless seated slump with water splash",
            "frame 3 lies or sits stunned by their own joke",
        ],
        "portrait_rows": ["IDLE", "LAUGH", "PRANK"],
        "portrait": [
            "IDLE row: tiny grin, blink, clown nose wiggle",
            "LAUGH row: mouth opens in silent laugh, shoulders bounce, eyes squint",
            "PRANK row: water bomb rises into view, eyes widen with mischief, tiny blue splash sparkle",
        ],
        "personality": [
            "throws water bombs that stun staff",
            "disruptive behavior is their love language",
            "will do anything for a laugh",
            "expression says: \"Watch this.\"",
        ],
    },
    "year-7-rat-king": {
        "name": "Year 7 Rat King",
        "role": "student boss enemy",
        "rear_feature": "tangled olive-green backpacks dominate the rear silhouette, no clear front faces",
        "side_feature": "rolling mass side silhouette with backpacks, limbs, shoes, and hair tufts visible",
        "front_feature": "multiple tiny confused faces, backpacks, shirts, and socks visible in tangled front view",
        "style_vibe": "gothic dark fantasy schoolyard vibe with cursed backpack-avalanche energy",
        "highlight": "muted school-uniform colors with eerie backpack-green highlights",
        "bullets": [
            "giant rolling ball of tangled Year 7 students",
            "oversized backpacks knotted together",
            "many small school shoes, socks, and sleeves sticking out",
            "messy brown hair tufts",
            "white shirts and navy shorts repeated through the mass",
            "olive-green backpacks form the main silhouette",
            "chaotic but funny, like poor locker organization became a boss monster",
            "no gore, no injury, just tangled cartoon chaos",
        ],
        "idle": [
            "huge tangled backpack mass wobbles in place",
            "tiny faces blink asynchronously, straps shift, shoes twitch",
            "returns to same rolling boss silhouette",
        ],
        "walk": [
            "slow rolling boss movement with tangled backpacks rotating",
            "limbs and school shoes wobble around the mass",
            "loop must feel heavy, chaotic, and poorly organized",
        ],
        "attack": [
            "boss rolling slam and minion spit",
            "frame 1 tangled mass squashes back, backpacks tightening",
            "frame 2 lurches forward with compact dust burst and one tiny loose Year 7 silhouette popping from the mass",
            "frame 3 wobbles back into rolling shape",
        ],
        "death": [
            "cartoon boss defeat animation, not gore",
            "frame 1 tangled mass shakes and straps loosen",
            "frame 2 collapses into a heap of backpacks, shoes, and confused Year 7 silhouettes",
            "frame 3 final harmless pile like locker organization has finally won",
        ],
        "portrait_rows": ["IDLE", "ROAR", "SPIT"],
        "portrait": [
            "IDLE row: tangled backpacks wobble, tiny faces blink asynchronously, straps shift slightly",
            "ROAR row: several tiny mouths open in chaotic shouting, mass shakes, hair tufts wobble",
            "SPIT row: one tiny Year 7 silhouette pops partly forward from the backpack mass, straps stretch and recoil",
        ],
        "personality": [
            "boss enemy",
            "rolling mass of tangled Year 7 backpacks",
            "spits out loose Year 7s when hit",
            "expression says: \"We all got lost at once.\"",
        ],
    },
}


ANIMATION_LAYOUTS = {
    "idle": ("idle pose", "subtle motion", "return to idle"),
    "walk": ("left step", "passing stride", "right step"),
    "attack": ("wind-up", "impact or release", "recovery"),
    "death": ("stagger", "collapse or breakdown", "final defeated pose"),
}


def bullet_lines(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def north_prompt(character: dict[str, object], animation: str) -> str:
    columns = ANIMATION_LAYOUTS[animation]
    anim_lines = character[animation]
    return f"""Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
This sheet must contain exactly 3 direction rows: NORTH, NORTH-EAST, EAST.
Do not omit, merge, replace, or relabel any direction.

- NORTH (row 1): full back view, no face visible, {character["rear_feature"]}
- NORTH-EAST (row 2): back-right angle, mostly back visible, slight right turn, no clear face
- EAST (row 3): full right-side profile, only one eye or profile detail visible, body sideways, {character["side_feature"]}

If face is visible in NORTH -> incorrect
If body is not clearly angled in NE -> incorrect
If EAST looks front-facing -> incorrect

---

CHARACTER:
{character["name"]} {character["role"]}
{bullet_lines(character["bullets"])}

---

STYLE:
{bullet_lines(COMMON_STYLE)}
- {character["style_vibe"]}
- {character["highlight"]}
- comical satire, not horror

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 3 rows total (top to bottom):
  NORTH, NORTH-EAST, EAST
- 3 columns:
  1. {columns[0]}
  2. {columns[1]}
  3. {columns[2]}
- consistent spacing
- centered sprites
- fixed bottom-center foot or base anchor
- same scale in every frame

---

ANIMATION:
{animation.upper()} animation
{bullet_lines(anim_lines)}
- no readable text
- no UI elements
- effects must stay inside the frame slots

---

OUTPUT:
- one sprite sheet
- exactly 3 direction rows and 3 animation columns
- no text
- no UI
- directions must be correct
"""


def south_prompt(character: dict[str, object], animation: str) -> str:
    columns = ANIMATION_LAYOUTS[animation]
    anim_lines = character[animation]
    return f"""Create a production-ready 2D pixel-art animation sprite sheet for an isometric RTS game.

CAMERA:
Camera is positioned from the SOUTH (RTS view).

DIRECTION RULES (STRICT):
This sheet must contain exactly 3 direction rows: EAST, SOUTH-EAST, SOUTH.
Do not omit, merge, replace, or relabel any direction.

- EAST (row 1): full right-side profile, only one eye or profile detail visible, body sideways, {character["side_feature"]}
- SOUTH-EAST (row 2): front-right angle, chest or front mass partially visible, right shoulder or right side closer to camera, face or front detail slightly turned
- SOUTH (row 3): full front view, both eyes or centered front detail visible, shoulders or front silhouette symmetrical, {character["front_feature"]}

If face or front detail is not visible in SOUTH -> incorrect
If EAST does not read as a full right-side profile -> incorrect
If SE looks side-on instead of angled -> incorrect
If SOUTH does not read as a full front view -> incorrect

---

CHARACTER:
{character["name"]} {character["role"]}
{bullet_lines(character["bullets"])}

---

STYLE:
{bullet_lines(COMMON_STYLE)}
- {character["style_vibe"]}
- {character["highlight"]}
- comical satire, not horror

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients

---

LAYOUT:
- 3 rows total (top to bottom):
  EAST, SOUTH-EAST, SOUTH
- 3 columns:
  1. {columns[0]}
  2. {columns[1]}
  3. {columns[2]}
- consistent spacing
- centered sprites
- fixed bottom-center foot or base anchor
- same scale in every frame

---

ANIMATION:
{animation.upper()} animation
{bullet_lines(anim_lines)}
- no readable text
- no UI elements
- effects must stay inside the frame slots

---

OUTPUT:
- one sprite sheet
- exactly 3 direction rows and 3 animation columns
- no text
- no UI
- directions must be correct
"""


def portrait_prompt(character: dict[str, object]) -> str:
    portrait_rows = ", ".join(character["portrait_rows"])
    return f"""Create a production-ready 2D pixel-art animated portrait sprite sheet for an isometric RTS game UI.

CHARACTER:
{character["name"]} {character["role"]}
{bullet_lines(character["bullets"])}

---

PERSONALITY:
{bullet_lines(character["personality"])}

---

STYLE:
- pixel-art RTS unit portrait
- late-90s pre-rendered look
- crisp readable pixels
- gothic dark fantasy schoolyard vibe
- {character["style_vibe"]}
- subtle eerie rim light
- {character["highlight"]}
- comical, expressive, not horror
- readable at small UI size

---

BACKGROUND:
- solid bright chroma green (#00FF00)
- no checkerboard
- no gradients
- no scenery

---

LAYOUT:
- 3 rows total (top to bottom):
  {portrait_rows}
- 4 columns:
  animation frames 1, 2, 3, 4
- consistent head size or portrait mass size
- centered portrait
- fixed head and shoulder anchor, or fixed base anchor for machine and boss portraits
- same scale in every frame

---

ANIMATION:
{bullet_lines(character["portrait"])}

---

OUTPUT:
- one portrait sprite sheet
- no text
- no UI
- no labels
- chroma green background only
"""


def main() -> None:
    manifest: dict[str, dict[str, object]] = {}
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    for slug, character in CHARACTERS.items():
        char_dir = OUT_ROOT / slug
        char_dir.mkdir(parents=True, exist_ok=True)
        files: list[str] = []

        for animation in ("idle", "walk", "attack", "death"):
            north_name = f"{animation}-north.txt"
            south_name = f"{animation}-south.txt"
            (char_dir / north_name).write_text(north_prompt(character, animation), encoding="utf-8")
            (char_dir / south_name).write_text(south_prompt(character, animation), encoding="utf-8")
            files.extend([north_name, south_name])

        (char_dir / "portrait.txt").write_text(portrait_prompt(character), encoding="utf-8")
        files.append("portrait.txt")
        manifest[slug] = {
            "name": character["name"],
            "role": character["role"],
            "files": files,
        }

    readme = """Complete Sprite Animation Prompt Set
====================================

This folder is the clean automation-ready prompt set.

Each character folder contains:
- idle-north.txt
- idle-south.txt
- walk-north.txt
- walk-south.txt
- attack-north.txt
- attack-south.txt
- death-north.txt
- death-south.txt
- portrait.txt

North files generate a 3-row gameplay sheet:
NORTH, NORTH-EAST, EAST.

South files generate a 3-row gameplay sheet:
EAST, SOUTH-EAST, SOUTH.

Portrait files generate a 3-row by 4-column animated UI portrait sheet.

All prompts use:
- solid chroma green background (#00FF00)
- no text, no UI, no labels
- fixed anchors
- comedic Schoolyard Defence characterization
- a gothic dark fantasy schoolyard vibe

Bowling Machine is included as a combat entity. Its walk prompt is a wheeled reposition/deployment animation.
"""
    (OUT_ROOT / "README.txt").write_text(readme, encoding="utf-8")
    (OUT_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
