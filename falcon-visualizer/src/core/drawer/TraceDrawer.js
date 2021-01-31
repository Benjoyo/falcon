import SVG from 'svg.js';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/material.css';
import 'tippy.js/themes/light-border.css';

const topPadding = 45;
const threadPadding = 200;
const clockPadding = 50;
const eventRadius = 10;
const drawThreadTimeline = Symbol('drawThreadTimeline');
const drawClockEvents = Symbol('drawClockEvents');
const calculateThreadPosition = Symbol('calculateThreadPosition');
const calculateNextClockPosition = Symbol('calculateNextClockPosition');
const generateEventId = Symbol('generateEventId');
const generateTimelineId = Symbol('generateTimelineId');
const updateRunningTimelines = Symbol('updateRunningTimelines');
const generateThreadColor = Symbol('generateThreadColor');
const colorPatterns = ['red', 'green', 'blue', 'fuchsia', 'gray', 'purple', 
'lime', 'maroon', 'navy', 'olive', 'orange', 'black', 'aqua', 
'silver', 'teal', 'white', 'yellow'].reverse();

export default class TraceDrawer {
  constructor(drawing, universe) {
    this.elementsPerClock = {};
    this.drewThreads = [];
    this.drewClocks = 0;
    this.drawing = drawing;
    this.universe = universe;
    this.processColors = {};
  }

  /**
   * Magic happens here.
   */
  nextClock() {
    this[drawClockEvents](this.drewClocks);
    window.scrollTo(document.documentElement.scrollLeft, document.body.scrollHeight);
  }

  /**
   * Clear all events.
   */
  reset() {
    this.drewThreads = [];
    this.drewClocks = 0;
    this.drawing.clear();
  }

  [drawThreadTimeline](thread, clockPosition = 0, color) {
    if (this.drewThreads.includes(thread)) {
      return this[calculateThreadPosition](thread);
    }

    this.drewThreads.push(thread);
    const threadPosition = this[calculateThreadPosition](thread);
    this.drawing.width(this.drewThreads.length * (threadPadding * 4));
    const threadLineY1 = clockPosition > 0 ? clockPosition : clockPosition + topPadding;
    const threadLineY2 = threadLineY1 + (topPadding / 2);
    this.drawing.line(threadPosition, threadLineY1, threadPosition, threadLineY2)
        .stroke({ width: 1, color: color || '#000000' })
        .attr({ 'stroke-dasharray': '5, 5' })
        .id(TraceDrawer[generateTimelineId](thread));

    const threadLabel = this.drawing.plain(thread.split('||')[0]).font({ fill: color || '#000000', size: 20 });
    const threadLabelBox = threadLabel.bbox();
    threadLabel.move(threadPosition - threadLabelBox.cx, 0);

    return threadPosition;
  }

  [drawClockEvents](clock) {
    const event = this.universe.get(clock);

    if (event === undefined) return;

    const clockPosition = this[calculateNextClockPosition]();

    // Draw clock label.
    this.drawing.height(clockPosition + clockPadding);
    this.drawing.plain(`${clock}`).move(16, clockPosition - eventRadius);

    
      const eventGroup = this.drawing.group();
      // Draw a new timeline if the thread does not exist and get its position.
      const threadColor = this[generateThreadColor](event.pid);
      const threadPosition = this[drawThreadTimeline](event.getThreadIdentifier(), 0, threadColor);

      var id = TraceDrawer[generateEventId](event.id);

      // Draw event.
      const eventShape = eventGroup.circle(eventRadius * 2)
        .fill(threadColor || '#000000')
        .move(threadPosition - eventRadius, clockPosition - eventRadius)
        .id(id);

        
      var tooltip = '';

      const eventShapeBox = eventShape.bbox();
      const eventLabel = eventGroup.plain(`${event.type}`);
      eventLabel.move(eventShapeBox.x + (3 * eventRadius), eventShapeBox.y - ((eventRadius - eventLabel.font('size')) / 2));

      if ('SND' == event.type) {
        tooltip += 'Sender: ' + event.src + '<br>'
        tooltip += 'Receiver(s): ' + event.dst + '<br>'; 
        tooltip += 'Msg-ID: ' + event.data.data.message; 
      } else if ('RCV' == event.type) {
        tooltip += 'Receiver: ' + event.dst + '<br>'
        tooltip += 'Sender(s): ' + event.src + '<br>';
        tooltip += 'Msg-ID: ' + event.data.data.message; 
      } else {
        tooltip = event.data.data.message;
      }

      // Draw connector.
      if (event.hasDependency()) {
        if (['SND', 'RCV'].includes(event.type)) {
          const dependencyShape = SVG.get(TraceDrawer[generateEventId](event.dependency));
          // dependency may not exist if connection to server started in the middle of the trace
          if (dependencyShape != null && dependencyShape !== undefined) {
            const dependencyShapeBox = dependencyShape.bbox();
            const connectorShape = this.drawing.line(
              dependencyShapeBox.cx, dependencyShapeBox.cy,
              dependencyShapeBox.cx, dependencyShapeBox.cy,
            ).stroke({ width: 1 });
            connectorShape.attr({ x2: eventShapeBox.cx, y2: eventShapeBox.cy });
            connectorShape.back();
          }
        } 
      }

      // add tooltip (on click)
      tippy('#'+id, {
        content: tooltip, 
        trigger: 'click',
        animation: 'scale',
        theme: 'light-border',
        allowHTML: true,
      });

      // Update Timeline.
      const timelineShape = SVG.get(TraceDrawer[generateTimelineId](event.getThreadIdentifier()));
      timelineShape.attr({ x2: eventShapeBox.cx, y2: eventShapeBox.cy });

      this[updateRunningTimelines](eventShapeBox.cy);

    this.drewClocks += 1;
  }

  [updateRunningTimelines](y) {
    this.drewThreads
      .forEach((thread) => {
        const timelineShape = SVG.get(TraceDrawer[generateTimelineId](thread));
        timelineShape.attr({ y2: y });
      });
  }

  static [calculateThreadPosition](index) {
    return (index * threadPadding) + (threadPadding / 2);
  }

  [calculateThreadPosition](thread) {
    const index = this.universe.getThreadOrderedIndex(thread);
    return index >= 0 ? TraceDrawer[calculateThreadPosition](index) : null;
  }

  [calculateNextClockPosition]() {
    return topPadding + (this.drewClocks * clockPadding) + (clockPadding / 2);
  }

  static [generateEventId](eventId) {
    return `event${eventId}`;
  }

  static [generateTimelineId](eventId) {
    return `timeline${eventId}`;
  }

  /* eslint no-bitwise: 0 */
  /* eslint no-restricted-syntax: 1 */
  [generateThreadColor](threadId) {
    if (this.processColors[threadId] === undefined) {
      this.processColors[threadId] = colorPatterns.pop();
    }
    return this.processColors[threadId];
  }
}
