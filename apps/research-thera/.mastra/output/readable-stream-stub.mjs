// Redirect readable-stream to native node:stream (available via nodejs_compat)
import stream from 'node:stream';
export const { Readable, Writable, Duplex, Transform, PassThrough, Stream, pipeline, finished } = stream;
export default stream;
