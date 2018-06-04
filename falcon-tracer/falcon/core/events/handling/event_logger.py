import logging
from falcon.core.events.event_factory import EventFactory, EventType
from falcon.core.events.handling.base_handler import BaseHandler

class FalconEventLogger(BaseHandler):
    def __init__(self, writer):
        self._writer = writer
        super(FalconEventLogger, self).__init__()

    def boot(self):
        self._writer.open()

    def handle(self, cpu, data, size):
        event = EventFactory.create(data)

        if data.type == EventType.PROCESS_CREATE:
            self._writer.write(event)
            self._writer.write(EventFactory.create(data, event_type=EventType.PROCESS_START))
        elif data.type == EventType.PROCESS_JOIN:
            self._writer.write(EventFactory.create(data, event_type=EventType.PROCESS_END))
            self._writer.write(event)
        else:
            self._writer.write(event)

    def shutdown(self):
        self._writer.close()
