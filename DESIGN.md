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

The pet lives in one small window, about the size of a pack of playing cards (250 by 350 pixels). It shows a picture of the critter, its name, health, fullness, and fitness bars, a small mood icon, and a small analog clock. Below the bars are four buttons: Feed, Medicine, Train, and Lights. The window has two tabs: Pet, for normal play, and Debug, for testing tools.

Claude placed the clock and the mood icon as round badges on the top corners of the picture, to save space. Buttons that would do nothing, such as Feed when the pet is full, are greyed out. (Claude default.)

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

The analog clock shows the system clock's time, unless a time has been set by hand in the Debug tab. The clock has hour, minute, and second hands. The owner chose that 2x speed also makes the clock run twice as fast, so bedtime arrives sooner while it is on. A clock that has been set by hand, or has run at 2x, stays ahead or behind until "Use system clock" is pressed in the Debug tab.

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
- **2x speed (owner).** Makes hunger, health, and the clock run twice as fast. Switching it off returns to normal speed.
- **Set the clock (owner).** Sets the clock to a chosen time of day; it keeps running from there. "Use system clock" returns to the real time.
- **Countdown and New pet (Claude additions).** A countdown to the next hunger drop, and a button that starts over with a new pet after asking for confirmation. Debug settings are kept when starting over.

All debug settings are remembered between visits.

### Name (owner)

Each new pet gets a randomly generated cute name, in the style of "Fleegul", "Snippers", or "Bart", shown with a small heart next to it. Names are built from short syllables, and a block list prevents rude words from appearing by accident.

### Critter art and blinking (owner, with a Claude stand-in)

The owner supplied a placeholder image to use until real art is made. It is stored as `assets/critter.jpg`. The owner asked for the critter to blink now and then. A true blink needs a second picture with the eyes closed, so the code is set up to swap to a closed-eyes image when one exists. Until then, the critter does a quick vertical squash every few seconds as a stand-in blink. The critter does not blink while asleep.

The placeholder image is a well-known character that the project does not own. It is fine for private testing, but it should be replaced with the owner's own art before the pet is shared publicly or packaged as an .exe.

## Open questions

- **The pet.** Its permanent name (or whether every pet keeps a random one), the kind of creature it is, and its final art are undecided.
- **What fitness and sleep are for.** Neither affects anything else yet.
- **Changing bedtime.** Whether the owner can change a pet's bedtime and wake time, and where, is undecided.
- **Death.** Whether the pet can die or run away when neglected is undecided.
