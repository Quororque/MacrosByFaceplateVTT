# FaceplateVTT Compendium Module

This module contains a curated collection of roll tables and automation macros for Delta Green on Foundry VTT. It is designed to reduce bookkeeping, speed up play, and provide narrative tools for both players and handlers.

## Roll Tables

### Failure Setbacks
Narrative complications for failed skill checks across a variety of situations.

- Bureaucratic Setbacks
- Device Setbacks
- Driving Setbacks
- Evidence / Clue Setbacks
- Law Enforcement Setbacks
- Legal Setbacks
- Scientific Setbacks
- SIGINT / Computer Science Setbacks
- Speech / Charisma Setbacks
- Urban Navigation Setbacks
- Wilderness Navigation Setbacks

### Game Automation
Utility roll tables used by automation macros.

- Contested CHA Roll
- Long Burst past Short Range
- Short Burst past Short Range

### NPC Personalities

#### Types
Quick generators for defining NPC backgrounds.

- Criminal Type
- Law Enforcement Type
- Random Civilian Type

#### Values
Personality and motivation generators.

- Hidden Motives
- Personality Type
- Trustworthiness
- View of Government

### Wounds

Organized by hit location with separate severity tables.

#### Body
- Abdomen
  - Minor Wounds
  - Serious Wounds
  - Critical Wounds
- Arm
- Catastrophic
- Head
- Leg
- Torso

### Mind

Psychological consequences and stress reactions.

- Coping Reactions (d6)
- Panic Reactions (d6)

### Random Hit

Combat utility tables.

- Downgraded Random Hit Location
- Downgraded Slow Projectile Deviation
- Downgraded Vehicle Random Hit
- Random Hit Location (d10)
- Slow Projectile Deviation (d8)
- Vehicle Random Hit (d10)

---

## Macros

### Public Macros

General-purpose gameplay utilities intended for everyday use.

- Combat Helper
- Harming & Healing Manager
- Injury & Random Hits Helper
- Player Identity Manager
- SANLOSS Macro

### Combat Automation

Macros that automate common combat bookkeeping.

- Add Health Point
- Add Willpower Point
- Bleeding Tracker
- Deduct Health Point
- Deduct Willpower Point
- Purge Combat Initiative

### Non-combat Automation

General utility and quality-of-life tools.

- Clear Chat Log
- Delete Last Message from Author
- NPC Identity Manager
- Show/Hide Main Soundboard
- Show/Hide Ultraviolence Soundboard
- Stop All Music
- Unknown Language Helper

---

## Worldscripts

This module contains worldscripts which must be manually installed by the end user. They facilitate hooks for Bleeding Tracker and Purge Combat Initiative. It's rather straightforward, install like any other worldscript and it will work. Make sure to import the appropriate roll tables and macros in your world beforehand.