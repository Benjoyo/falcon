<template>
  <div id="drawing">
      <input v-if="!connected" v-model="url"/>
      <button v-if="!connected" @click="connect">Connect</button>
  </div>
</template>

<script>
import SVG from 'svg.js';
import EventUniverse from '../core/EventUniverse';
import TraceDrawer from '../core/drawer/TraceDrawer';
import FileReaderPromise from '../core/util/FileReaderPromise';

export default {
  mounted() {
    this.$on('tick', () => { 
      this.drawer.nextClock();
    });

    this.drawer = null;
  },
  data() {
    return {
      clock: 0,
      universe: null,
      url: 'ws://localhost:9889',
      websocket: null,
      connected: false,
    };   
  },
  methods: {
    connect() {
      this.universe = new EventUniverse('');
      this.drawer = new TraceDrawer(SVG('drawing'), this.universe);

      this.webSocket = new WebSocket(this.url);

      this.webSocket.onopen = () => {
        this.connected = true;
      };

      this.webSocket.onmessage = (event) => {
       // console.log(event.data);
        const jsonContent = JSON.parse(event.data);
        if (jsonContent !== undefined && jsonContent != null) {
          this.universe.push(jsonContent);
          this.$emit('tick', this.clock);
        }
      };

      this.back();
    },
    tick() {
      this.clock += 1;
      this.$emit('tick', this.clock);
    },
    back() {
      this.clock -= this.clock > 0 ? 1 : 0;
      this.$emit('tick', this.clock);
    },
    readFile(e) {
      const file = e.target.files[0];

      new FileReaderPromise(file).readAsText()
        .then((content) => {
          const jsonContent = JSON.parse(content);
          this.universe = new EventUniverse(jsonContent);
          this.drawer = new TraceDrawer(SVG('drawing'), this.universe);
          this.back();
        });
    },
  },
  computed: {
    bigbang() {
      return this.clock === 0;
    },
    blackhole() {
      return this.clock === this.universe.maxClock;
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
