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

The pet lives in one small window, about the size of a pack of playing cards (250 by 350 pixels). The window has four tabs:

- **Pet** shows the pet's picture, its name, its mood icon, and a small analog clock. Under the picture are Travel, Play, and Items buttons, and below those the care buttons: Feed, Medicine, Train, and Lights.
- **Status** shows the health, fullness, and fitness bars. The owner moved these off the Pet tab, while keeping the mood icon next to the picture.
- **Attributes** shows the pet's species and its personality attributes.
- **Debug** holds testing tools.

Claude placed the clock and the mood icon as round badges on the top corners of the picture, to save space, and added the number next to each bar on the Status and Attributes tabs. Buttons that would do nothing, such as Feed when the pet is full, are greyed out. (Claude defaults.)

### Travel, Play, and Items (owner)

These three buttons are placeholders and do nothing yet. They are shown greyed out, with a "Coming soon" tooltip, so it is clear they are not broken (Claude default).

### Choosing a pet (owner)

There are three kinds of pet: Frog, Clown, and Dog. Pressing "New pet" in the Debug tab opens a picker showing a picture of each, and the chosen picture decides the species. The picker warns that the current pet will be replaced and has a Cancel button, which replaced the earlier confirmation pop-up (Claude default). The very first time the window opens, with no saved pet, the same picker appears without Cancel, so the owner chooses a pet before anything else (Claude default). A pet from before species existed used the frog picture, so it becomes a Frog.

### Attributes (owner)

Besides its species, each pet has five attributes: Rowdiness, Angst, 'Tism, Sin, and Diligence. They are shown as bars like the stats on the Status tab and all start at 0. Ways to raise them will come later. Claude gave them the same 0 to 5 range as the stats, in half units like fitness (Claude default).

### Stats (owner)

The pet has three stats, each ranging from 0 to 5 and shown as a five-segment bar:

- **Health** starts at 5.
- **Fullness** starts at 5.
- **Fitness** starts at 0. It moves in half units, so its bar can show half-filled segments. The owner chose a maximum of 5 to match the other stats, rather than no maximum.

### Hunger and health (owner)

Fullness drops by 1 at a steady pace: every 5 minutes normally. Health drops at that same pace, but only while fullness is empty. In practice, each hunger step lowers fullness by 1 if there is any left, and otherwise lowers health by 1. Neither goes below 0.

Health does not recover on its own. The only way to raise it is Medicine. An earlier Claude default had health slowly recovering while the pet had food; the owner chose to remove that when Medicine was added.

There is no death or game over yet. A pet at 0 health shows as sick and can still be given medicine.

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

Fitness, the light, and sleep do not affect mood yet.

### Time while the window is closed (Claude default)

Time keeps passing while the window is closed, at normal speed, as on a real handheld pet. When the window opens again, the pet catches up on every hunger step it missed. The alternative of pausing the pet while closed was not chosen because it would make the pet feel less alive, but the owner may prefer it.

### Debug tab (owner, with Claude additions)

- **Hunger pace (owner).** Switches hunger between every 5 minutes and every 10 seconds. Health follows the same pace when fullness is empty. Switching keeps the progress toward the next drop as a share of the way there, so switching never causes a sudden burst of drops (Claude default).
- **Set the clock (owner).** Sets the clock to a chosen time of day; it keeps running from there. "Use system clock" returns to the real time.
- **New pet (Claude addition, now with the owner's picker).** Opens the pet picker described above. Debug settings are kept when starting over.
- **Countdown (Claude addition).** A countdown to the next hunger drop.

All debug settings are remembered between visits.

The owner removed an earlier 2x speed switch, which made hunger, health, and the clock run twice as fast. The 10-second hunger pace covers fast testing instead.

### Name (owner)

Each new pet gets a randomly generated cute name, in the style of "Fleegul", "Snippers", or "Bart", shown with a small heart next to it. Names are built from short syllables, and a block list prevents rude words from appearing by accident.

### Pet art and blinking (owner)

The owner supplied a placeholder picture for each species, to use until real art is made: `assets/frog.jpg`, `assets/clown.jpg`, and `assets/dog.jpg`. The clown is pixel art, so it is drawn with crisp pixels rather than blurred when resized (Claude default).

The owner asked for the pet to blink now and then. A true blink needs a second picture with the eyes closed. Claude first added a quick squash as a stand-in, and the owner had it removed. The code still swaps to a closed-eyes picture now and then if one is added for a species, so blinking will return once real art includes one. The pet does not blink while asleep.

The placeholder pictures come from outside the project, and at least the frog is a well-known character the project does not own. They are fine for private testing, but they should be replaced with the owner's own art before the pet is shared publicly or packaged as an .exe.

## Open questions

- **Names.** Whether every pet keeps a random name or the owner can choose one is undecided.
- **Final art.** Real art for each species, including a closed-eyes picture for blinking, is still to come.
- **What fitness, sleep, and attributes are for.** None of them affect anything else yet, and there is no way to raise the attributes.
- **Travel, Play, and Items.** What these do is undecided.
- **Changing bedtime.** Whether the owner can change a pet's bedtime and wake time, and where, is undecided.
- **Death.** Whether the pet can die or run away when neglected is undecided.
