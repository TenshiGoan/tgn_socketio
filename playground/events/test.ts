export default function test(cb: Function) {
  cb(`${useSocketIO().socket.id}`);
}
