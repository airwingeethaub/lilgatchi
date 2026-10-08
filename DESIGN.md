# lilgatchi design record

This document records the decisions made about lilgatchi, the reasons behind them, the alternatives that were considered, and any standing rules that follow from them.

## What the project is

lilgatchi is a digital pet, in the spirit of handheld virtual pets: a small creature that the owner looks after over time. The project name is lilgatchi.

## Decisions

### Platform: browser first, standalone .exe later

The pet will be built first as a web page that runs in a browser, because that needs no installation and shows results immediately. The owner wants it to become a standalone Windows .exe eventually. The plan for that is to wrap the same web page in a desktop shell such as Electron or Tauri, which package a web page as its own program. Which of the two to use will be decided when the time comes.

The alternative of building a native desktop program from the start was not chosen, because the browser version is quicker to see and change while the pet is still taking shape, and nothing about it blocks the later move to an .exe.

Standing rules that follow from this decision, so that the move to an .exe stays simple:

- The pet is plain HTML, CSS, and JavaScript, and it must run without a server.
- Every image, font, and script lives in the repository. Nothing is loaded from the internet.
- All saving and loading of the pet's progress goes through a single storage module. In the browser it uses the browser's built-in storage. For the .exe, only that module should need to change, for example to save to a file.

## Open questions

- **The pet.** Its name, the kind of creature it is, and how it looks are undecided.
- **Care mechanics.** Claude has proposed hunger, happiness, and energy meters that decline over time, with Feed, Play, and Sleep actions, a mood that reflects how well the pet is cared for, and saved progress between visits. None of this has been agreed.
