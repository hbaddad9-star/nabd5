# motion.js — source fragments

The browser receives these files joined in the order below as `/js/motion.js`, between `_open.txt` (the file header and the opening of the wrapper function) and `_close.txt` (its closing line).
The room's monitor (traces, alarm tones) and the page's reveal motion. v7 removed the monitors of the rooms that no longer exist.


| file | responsibility |
|---|---|
| 010-prefs-reveal-count.js | reduced motion, hero split, scroll reveals, count-up |
| 020-view-chrome.js | progress bar, sweep, view change, parallax |
| 030-ecg-model.js | normal ranges, ECG and pleth beat shapes |
| 040-audio.js | the shared audio context, wake-up, beep |
| 050-monitor.js | makeMonitor: the canvas loop, heart-rate drift, alarms, tile help |
| 060-monitor-adapters.js | the emergency room's monitor |
| 070-boot.js | boot and the page observer |
