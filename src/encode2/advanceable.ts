export default class Advanceable {

  public buffer: Buffer;
  public offset = 0;

  constructor(buffer: Buffer | number, unsafe?: boolean) {
    if (Buffer.isBuffer(buffer)) {
      this.buffer = buffer;
    } else if (typeof buffer === "number") {
      if (unsafe) {
        this.buffer = Buffer.allocUnsafe(buffer);
      } else {
        this.buffer = Buffer.alloc(buffer);
      }
    }
  }

  read(len: number = 1) {
    this.offset += len;
    return this.buffer.slice(this.offset - len, this.offset);
  }

  peek(len: number = 1) {
    return this.buffer.slice(this.offset, this.offset + len);
  }

  advance(len: number = 1) {
    this.offset += len;
    return true;
  }

  available (len: number = 1) {
    return (this.offset + len - 1) < this.buffer.length;
  }

  write (data: Buffer)
  write (data: number[])
  write (data: string, encoding?: BufferEncoding)
  write (data: string | Buffer | number[], encoding?: BufferEncoding) {
    if (Buffer.isBuffer(data)) {
      data.copy(this.buffer, this.offset);
      this.offset += data.length;
    } else if (typeof data === "string") {
      this.buffer.write(data, this.offset, encoding);
      this.offset += Buffer.byteLength(data);
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        this.buffer[this.offset + i] = data[i];
      }
      this.offset += data.length;
    }
    return true;
  }
}