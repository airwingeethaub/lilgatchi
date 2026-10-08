# lilgatchi design record

This document records the decisions made about lilgatchi, the reasons behind them, the alternatives that were considered, and any standing rules that follow from them.

Each decision notes who made it. "Owner" means the project owner asked for it. "Claude default" means the owner did not specify it and Claude chose something reasonable; those are open to change and should be confirmed or replaced by the owner.

## What the project is

lilgatchi is a digital pet, in the spirit of handheld virtual pets: a small creature that the owner looks after over time. The project name is lilgatchi.

## Decisions

### Platform: browser first, standalone .exe later (owner)

The pet will be built first as a web page that runs in a browser, because that needs no installation and shows results immediately. The owner wants it to become a standalone Windows .exe eventually. The plan for that is to wrap the same web page in a desktop shell such as Electron or Tauri, which package a web page as its own program. Which of the two to use will be decided when the time comes.

The alternative of building a native desktop program from the start was not chosen, because the browser version is quicker to see and change while the pet is still taking shape, and nothing about it blocks the later move to an .exe.

Standing rules that follow from this decision, so that the move to an .exe stays simple:

- The pet is plain HTML, CSS, and JavaScript, and it must run without a server.
- Every image, font, and script lives in the repository. Nothing is loaded from the internet.
- All saving and loading of the pet's progress goes through a single storage module. In the browser it uses the browser's built-in storage. For the .exe, only that module should need to change, for example to save to a file.

### The window (owner)

The pet lives in one window, 500 by 700 pixels. It started at about the size of a pack of playing cards (250 by 350), and the owner later asked for it to be doubled; Claude took that to mean doubling both the width and the height, and scaled the text, buttons, and picture up to match. The window has four tabs:

- **Pet** shows the pet's picture, its name, its mood icon, a small analog clock, and any poop. Under the picture are Travel, Play, and Items buttons, and at the bottom the care buttons: Feed, Medicine, Train, Clean, and Lights.
- **Status** shows the health, fullness, fitness, and cleanliness bars. The owner moved these off the Pet tab, while keeping the mood icon next to the picture.
- **Attributes** shows the pet's species and its personality attributes.
- **Debug** holds testing tools.

Claude placed the clock and the mood icon as round badges on the top corners of the picture, to save space, and added the number next to each bar on the Status and Attributes tabs. Buttons that would do nothing, such as Feed when the pet is full, are greyed out. (Claude defaults.)

### Play (owner)

The Play button is a placeholder and does nothing yet. It is shown greyed out, with a "Coming soon" tooltip, so it is clear it is not broken (Claude default). Travel and Items started out as placeholders too; they now work, as described below.

### Windows over the main window (Claude default)

The owner asked for The Shop to open in a new window. Claude made the Travel menu, each location, the Items list, and the pet picker appear as windows drawn over the main window, filling it, rather than as separate browser windows. Browsers block or clutter separate pop-up windows, and the same approach will carry over to the .exe. Each has a button to close it (Leave, Close, Stay home, or Cancel), and the Escape key also closes it. Time keeps passing while one is open.

### Choosing a pet (owner)

There are three kinds of pet: Frog, Clown, and Dog. Pressing "New pet" in the Debug tab opens a picker showing a picture of each, and the chosen picture decides the species. The picker warns that the current pet will be replaced and has a Cancel button, which replaced the earlier confirmation pop-up (Claude default). The very first time the window opens, with no saved pet, the same picker appears without Cancel, so the owner chooses a pet before anything else (Claude default). A pet from before species existed used the frog picture, so it becomes a Frog.

### Attributes (owner)

Besides its species, each pet has five attributes: Rowdiness, Angst, 'Tism, Sin, and Diligence. They are shown as bars like the stats on the Status tab and all start at 0. Ways to raise them will come later. Claude gave them the same 0 to 5 range as the stats, in half units like fitness (Claude default).

### Stats (owner)

The pet has four stats, each ranging from 0 to 5 and shown as a five-segment bar:

- **Health** starts at 5. It can now move in half units, because a poop pile costs 0.5 health at a time.
- **Fullness** starts at 5. It moves in whole units.
- **Fitness** starts at 0. It moves in half units. The owner chose a maximum of 5 to match the other stats, rather than no maximum.
- **Cleanliness** (owner) starts at 5 (Claude default) and moves in half units.

Bars show half-filled segments for half units.

### Hunger and health (owner)

Fullness drops by 1 at a steady pace: every 5 minutes normally. Health drops at that same pace, but only while fullness is empty. In practice, each hunger step lowers fullness by 1 if there is any left, and otherwise lowers health by 1. Neither goes below 0.

Health does not recover on its own. The only way to raise it is Medicine. An earlier Claude default had health slowly recovering while the pet had food; the owner chose to remove that when Medicine was added.

There is no death or game over yet. A pet at 0 health shows as sick and can still be given medicine.

### Cleanliness and the Bathhouse (owner)

Cleanliness drops by 0.5 every 30 minutes, down to 0. This is a fixed 30 minutes; the debug hunger pace does not change it (Claude default). Going to the Bathhouse fills cleanliness to 5 straight away and restarts the 30-minute countdown (Claude default). Cleanliness does not affect anything else yet, and it is separate from poop: cleaning up poop does not change cleanliness, and poop does not lower it (Claude default).

### Poop (owner)

The pet poops at random intervals of 30 to 100 minutes, with every length in that range equally likely. Each poop appears as a poop emoji at a random spot on the pet's picture, kept away from the edges and from the clock and mood badges (Claude default). It stays there until cleaned up. The Clean button removes all of them at once (Claude default), and is greyed out when there is nothing to clean.

If more than 4 poops pile up (5 or more), health drops by 0.5 every 5 minutes for as long as the pile stays. This is a fixed 5 minutes, not tied to the debug hunger pace. Cleaning restarts that countdown, so a new pile gets a full 5 minutes before it hurts (Claude default).

To keep the picture readable, poop stops piling up at 12 (Claude default). Poop happens at all hours, including while the pet is asleep or away traveling, and it darkens with the picture when the light is off.

### Care actions

- **Feed (owner; amounts are a Claude default).** Each press adds 1 fullness, up to 5.
- **Medicine (owner; amount is a Claude default).** Each press adds 1 health, up to 5. It has no cost or downside for now.
- **Train (owner).** Physical training. Each press adds 0.5 fitness, and has a 5% chance of lowering health by 1. Training stops once fitness reaches 5 (a Claude default following from the maximum). Training costs nothing else, such as fullness, for now (Claude default). A small "+½" or "Ouch!" floats up over the picture to show the result (Claude default).
- **Lights (owner).** Turns the light off or back on. While the light is off, the picture of the pet is darkened. The light stays as it was left, including between visits (Claude default).

### Bedtime and sleep (owner, with a Claude default)

Each pet has a bedtime, 9 PM by default, and a wake time, which the owner set at 7 AM. When the light is off and the clock is between bedtime and wake time, the pet is asleep, and small Z's float up from its picture. With the light off during the day, the picture is dark but there are no Z's. Bedtime and wake time are stored per pet so they can differ between pets later; there is no way to change them in the window yet (Claude default). Sleeping has no other effect on the pet yet.

### The clock (owner)

The analog clock shows the system clock's time, unless a time has been set by hand in the Debug tab. The clock has hour, minute, and second hands, and always runs at normal speed. A time set by hand keeps running from there until "Use system clock" is pressed in the Debug tab.

Earlier, the owner chose for the 2x speed switch to make the clock run fast as well. The owner later removed the 2x switch and said the hunger speed setting should not affect the clock. The hunger pace setting never did; it changes only how often hunger drops.

### Mood (owner asked for an icon; rules are a Claude default)

The mood icon is one of four faces, based on health and fullness:

- Sick: health is 1 or 0.
- Sad: fullness is 1 or 0, or health is 2.
- Okay: fullness or health is 3.
- Happy: both are 4 or 5.

Fitness, cleanliness, poop, the light, and sleep do not affect mood yet.

### Time while the window is closed (Claude default)

Time keeps passing while the window is closed, at normal speed, as on a real handheld pet. When the window opens again, the pet catches up on everything it missed, in the order it would have happened: hunger, cleanliness, poop, and the poop pile's effect on health. The alternative of pausing the pet while closed was not chosen because it would make the pet feel less alive, but the owner may prefer it.

### Items and money (owner, with Claude defaults)

Every new pet starts with $1,000 and three items: a pint of MD 20/20, a Nokia N-Gage, and half a pack of Pall Mall menthols. The Items button opens a list of everything the pet owns, with its money at the top and a Use button for each item.

The owner asked for items to be used up as makes sense. Claude chose:

- **MD 20/20** is counted in pints. Using it drinks the whole pint, so the starting bottle is used up in one go.
- **Pall Mall menthols** are counted in cigarettes. Half a pack is 10, and each use smokes one.
- **The Nokia N-Gage, the vape, the rusty longsword, and the bug in a jar** are not used up. They can be used again and again.

Items run out at zero and disappear from the list. Using an item shows a short line about what the pet did, but has no effect on stats or attributes yet (Claude default). Money cannot be used directly; it is spent at The Shop.

A pet from before items existed was given the same starting items and money.

### Travel (owner)

The Travel button opens a menu of places to go: The Shop and the Bathhouse. Going to one opens a window showing the pet at that place, with a Leave button to come home. The pet's picture is shown inside a placeholder scene that Claude drew: shelves and a counter for The Shop, and a tiled room with a tub for the Bathhouse. These are meant to be replaced with real art.

### The Shop (owner)

The Shop sells a vape, a rusty longsword, and a bug in a jar, for $500 each. With the starting $1,000, the pet can afford two. Claude chose that the stock never runs out, that more than one of the same item can be bought, and that the Buy button is greyed out when the pet cannot afford it. The Shop shows how many of each item the pet already has.

### Debug tab (owner, with Claude additions)

- **Hunger pace (owner).** Switches hunger between every 5 minutes and every 10 seconds. Health follows the same pace when fullness is empty. Switching keeps the progress toward the next drop as a share of the way there, so switching never causes a sudden burst of drops (Claude default).
- **Set the clock (owner).** Sets the clock to a chosen time of day; it keeps running from there. "Use system clock" returns to the real time.
- **New pet (Claude addition, now with the owner's picker).** Opens the pet picker described above. Debug settings are kept when starting over.
- **Countdown (Claude addition).** A countdown to the next hunger drop.
- **Poop tools (Claude addition).** A countdown to the next poop, the number of poops on the floor, and a "Poop now" button that adds one straight away, for testing the pile without waiting.

All debug settings are remembered between visits.

The owner removed an earlier 2x speed switch, which made hunger, health, and the clock run twice as fast. The 10-second hunger pace covers fast testing instead.

### Name (owner)

Each new pet gets a randomly generated cute name, in the style of "Fleegul", "Snippers", or "Bart", shown with a small heart next to it. Names are built from short syllables, and a block list prevents rude words from appearing by accident.

### Pet art and blinking (owner)

The owner supplied a placeholder picture for each species, to use until real art is made: `assets/frog.jpg`, `assets/clown.jpg`, and `assets/dog.jpg`. The clown is pixel art, so it is drawn with crisp pixels rather than blurred when resized (Claude default).

The owner asked for the pet to blink now and then. A true blink needs a second picture with the eyes closed. Claude first added a quick squash as a stand-in, and the owner had it removed. The code still swaps to a closed-eyes picture now and then if one is added for a species, so blinking will return once real art includes one. The pet does not blink while asleep.

Claude drew simple placeholder scenes for The Shop and the Bathhouse, stored in `assets/locations/`, each as a backdrop behind the pet and a foreground in front of it.

The placeholder pet pictures come from outside the project, and at least the frog is a well-known character the project does not own. They are fine for private testing, but they should be replaced with the owner's own art before the pet is shared publicly or packaged as an .exe.

## Open questions

- **Names.** Whether every pet keeps a random name or the owner can choose one is undecided.
- **Final art.** Real art for each species, including a closed-eyes picture for blinking, is still to come.
- **What fitness, cleanliness, sleep, and attributes are for.** None of them affect anything else yet, and there is no way to raise the attributes.
- **What items do.** Using an item has no effect yet. Items may later raise or lower stats or attributes.
- **Play.** What the Play button does is undecided.
- **More places and stock.** Whether there will be more travel destinations, or more for sale, is undecided.
- **Changing bedtime.** Whether the owner can change a pet's bedtime and wake time, and where, is undecided.
- **Death.** Whether the pet can die or run away when neglected is undecided.
