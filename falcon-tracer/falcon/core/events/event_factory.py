from falcon.core.events.types import *
from falcon.core.events.base_event import EventType


class EventFactory:
    @staticmethod
    def create(data, event_type=None):
        event_type = event_type if event_type is not None else data.type
        assert(event_type is not None)

        if EventType.is_socket(event_type):
            return EventFactory._create_socket_event(data, event_type)
        elif EventType.is_process(event_type):
            return EventFactory._create_process_event(data, event_type)

        return None

    @staticmethod
    def _create_socket_event(data, event_type):
        if event_type == EventType.SOCKET_CONNECT:
            return SocketConnect(data.pid, data.tgid, data.comm, data.socket.sport, data.socket.dport, data.socket.saddr, data.socket.daddr, data.socket.family)
        elif event_type == EventType.SOCKET_ACCEPT:
            # The source and destination fields are swapped here, due to the kernel structures.
            return SocketAccept(data.pid, data.tgid, data.comm, data.socket.dport, data.socket.sport, data.socket.daddr, data.socket.saddr, data.socket.family)
        elif event_type == EventType.SOCKET_SEND:
            return SocketSend(data.pid, data.tgid, data.comm, data.socket.sport, data.socket.dport, data.socket.saddr, data.socket.daddr, data.socket.family, data.extra.bytes)
        elif event_type == EventType.SOCKET_RECEIVE:
            # The source and destination fields are swapped here, due to the kernel structures.
            return SocketReceive(data.pid, data.tgid, data.comm, data.socket.dport, data.socket.sport, data.socket.daddr, data.socket.saddr, data.socket.family, data.extra.bytes)

    @staticmethod
    def _create_process_event(data, event_type):
        if event_type == EventType.PROCESS_CREATE:
            return ProcessCreate(data.pid, data.tgid, data.comm, data.extra.child_pid)
        elif event_type == EventType.PROCESS_JOIN:
            return ProcessJoin(data.pid, data.tgid, data.comm, data.extra.child_pid)
        elif event_type == EventType.PROCESS_START:
            return ProcessStart(data.extra.child_pid, data.pid, data.comm)
        elif event_type == EventType.PROCESS_END:
            return ProcessEnd(data.extra.child_pid, data.pid, data.comm)
