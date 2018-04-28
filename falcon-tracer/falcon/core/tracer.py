import multiprocessing
import argparse
import logging
import logging.config
import events
import signal
import time
import sys
from bpf import BpfProgram
from falcon import util
import pkg_resources

# Configure logger
logging.config.fileConfig(pkg_resources.resource_filename('falcon', '../conf/logging.ini'))

class Tracer:
    def run(self, pid=0, nworkers=2):
        program_filepath = pkg_resources.resource_filename('falcon', 'core/resources/ebpf/probes.c')
        signal.signal(signal.SIGINT, util.ignore_signal)

        with open(program_filepath, 'r') as program_file:
            program = BpfProgram(text=program_file.read())
            program.filter_pid(pid)

            # Create and boot event handlers
            handlers = []
            for handler in Tracer.get_handlers():
                handler.boot()
                handlers.append(handler)

            # Create pipes and workers
            workers = []
            (output_stream, input_stream) = multiprocessing.Pipe()
            for _ in xrange(1):
                worker = events.EventProcessor(input_stream, handlers)
                worker.daemon = True
                workers.append(worker)
                worker.start()

            # Create event handler and listener worker
            bpf_event_handler = events.handling.BpfEventHandler(output_stream)
            bpf_event_handler.boot()

            bpf_listener_worker = events.bpf.BpfEventListener(program, bpf_event_handler)
            bpf_listener_worker.daemon = True
            bpf_listener_worker.start()

            # Wait for the producer to finish
            while bpf_listener_worker.is_alive():
                bpf_listener_worker.join()
            bpf_event_handler.shutdown()

            # Shutdown workers
            print 'Attempting to shutdown workers...'
            for worker in workers:
                output_stream.send('exit')

            for worker in workers:
                worker.join()

            # Shutdown handlers
            print 'Attempting to shutdown handlers...'
            for handler in handlers:
                handler.shutdown()

        return 0

    @staticmethod
    def get_handlers():
        handler_instances = [
            events.handling.logger.EventLogger()
        ]

        return handler_instances


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(prog='falcon-tracer', description='This program is the tracer of the Falcon pipeline tool.')

    parser.add_argument('--pid', type=int, nargs='?', default=0,
                        help="filter events of the given PID. (0 = all PIDs)")
    parser.add_argument('--workers', type=int, nargs='?', default=2,
                        help="amount of workers to process events")

    args = parser.parse_args()
    sys.exit(Tracer().run(
        nworkers=args.workers,
        pid=args.pid))

if __name__ == '__main__':
    main()
