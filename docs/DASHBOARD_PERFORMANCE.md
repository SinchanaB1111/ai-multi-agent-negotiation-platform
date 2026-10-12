# Dashboard Performance Logic

The Dashboard "Your Progress" card is now data-driven.

## Performance bands

- 0–49: Needs Improvement
- 50–69: Developing
- 70–84: Proficient
- 85–100: Advanced

The average score is calculated from completed sessions stored in the dashboard store. The Overall Performance label is derived from that average and the range is shown beside the label. Hovering the performance card exposes the explanation used by the UI.

No completed/scored sessions means `Not started` and the score displays `—`.
