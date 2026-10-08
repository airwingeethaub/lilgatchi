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

The pet lives in one small window, about the size of a pack of playing cards (250 by 350 pixels). It shows a picture of the critter, its name, a health bar, a fullness bar, and a small mood icon. The window has two tabs: Pet, for normal play, and Debug, for testing tools.

### Stats and hunger (owner)

Health and fullness each range from 0 to 5 units, shown as five segments. A new pet starts at 5 for both. Fullness drops by 1 every 5 minutes.

### Feeding (owner, with Claude defaults)

A Feed button feeds the pet. The owner asked for the button; Claude chose that each press adds 1 fullness, and that the button is disabled and reads "Full!" when fullness is already 5.

### Health rules (Claude default)

The owner did not say how health changes, so Claude chose the following. Every 5 minutes, after fullness drops, health drops by 1 if fullness is now 0, and otherwise recovers by 1, up to 5. A starving pet slowly gets sicker, and feeding it lets it recover. Health stops at 0. There is no death or game over yet; a pet at 0 health simply shows as sick and can still be fed back to health.

### Mood (owner asked for an icon; rules are a Claude default)

The mood icon is one of four faces, based on the two stats:

- Sick: health is 1 or 0.
- Sad: fullness is 1 or 0, or health is 2.
- Okay: fullness or health is 3.
- Happy: both are 4 or 5.

### Time while the window is closed (Claude default)

Time keeps passing while the window is closed, at normal speed, as on a real handheld pet. When the window opens again, the pet catches up on every 5-minute step it missed. The alternative of pausing the pet while closed was not chosen because it would make the pet feel less alive, but the owner may prefer it.

### Debug tab (owner, with Claude additions)

The Debug tab has a 2x speed switch that makes game time pass twice as fast, and switching it off returns to normal speed. The setting is remembered between visits. Claude also added a countdown to the next hunger drop, to make testing easier, and a "New pet" button that starts over with a new pet after asking for confirmation.

### Name (owner)

Each new pet gets a randomly generated cute name, in the style of "Fleegul", "Snippers", or "Bart", shown with a small heart next to it. Names are built from short syllables, and a block list prevents rude words from appearing by accident.

### Critter art and blinking (owner, with a Claude stand-in)

The owner supplied a placeholder image to use until real art is made. It is stored as `assets/critter.jpg`. The owner asked for the critter to blink now and then. A true blink needs a second picture with the eyes closed, so the code is set up to swap to a closed-eyes image when one exists. Until then, the critter does a quick vertical squash every few seconds as a stand-in blink.

The placeholder image is a well-known character that the project does not own. It is fine for private testing, but it should be replaced with the owner's own art before the pet is shared publicly or packaged as an .exe.

## Open questions

- **The pet.** Its permanent name (or whether every pet keeps a random one), the kind of creature it is, and its final art are undecided.
- **More care actions.** Earlier, Claude suggested play and sleep actions and a happiness or energy stat. These have not been asked for.
- **Death.** Whether the pet can die or run away when neglected is undecided.
