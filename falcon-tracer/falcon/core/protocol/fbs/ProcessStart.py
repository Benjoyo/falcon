# automatically generated by the FlatBuffers compiler, do not modify

# namespace: fbs

import flatbuffers

class ProcessStart(object):
    __slots__ = ['_tab']

    @classmethod
    def GetRootAsProcessStart(cls, buf, offset):
        n = flatbuffers.encode.Get(flatbuffers.packer.uoffset, buf, offset)
        x = ProcessStart()
        x.Init(buf, n + offset)
        return x

    # ProcessStart
    def Init(self, buf, pos):
        self._tab = flatbuffers.table.Table(buf, pos)

def ProcessStartStart(builder): builder.StartObject(0)
def ProcessStartEnd(builder): return builder.EndObject()
