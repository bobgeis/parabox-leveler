
# parabox-leveler Specification

## Overview

parabox-leveler is a tool for creating levels for the steam version of Patrick's Parabox.

Patrick's Parabox is a puzzle game developed by Patrick Traynor. It is played on a 2D grid where the user views the player character from above and manipulates blocks to solve puzzles. The blocks can be pushed in four directions and sometimes entered. There are complexities and the enterable blocks and be sublevels, or references to the enclosing space creating "paradoxical" effects.

The parabox-leveler tool should show a web-UI to allow a user to create and edit Parabox levels and then emit the level in the appropriate format (either copied to clipboard or downloaded as a text file).

The file format is described in the document docs/file-format-notes.md and there are example levels in docs/simple-examples/ with screenshots showing what the corresponding level looks like when loaded in the game.

The web UI should be intuitive and allow the users to visually create and edit levels. Note that more complicated levels with nested sublevels may require additional UI controls to manage the hierarchy, such as a level explorer panel or nested level selection.

