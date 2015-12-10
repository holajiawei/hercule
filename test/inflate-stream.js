import test from 'ava';
import nock from 'nock';
import InflateStream from '../lib/inflate-stream';


test.cb('should handle no input', (t) => {
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    if (this.read() !== null) t.fail();
  });

  testStream.on('end', function end() {
    t.pass();
    t.end();
  });

  testStream.end();
});


test.cb('should skip input without link', (t) => {
  const input = {
    chunk: 'The quick brown fox jumps over the lazy dog./n',
  };
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.notOk(chunk.link);
    }
  });

  testStream.on('end', function end() {
    t.pass();
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should inflate input with file link', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: __dirname + '/fixtures/local-link/size.md',
      hrefType: 'file',
    },
    parents: [],
    references: [],
  };
  const expected = 'big';
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should skip input with invalid file link', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: __dirname + '/i-dont-exist.md',
      hrefType: 'file',
    },
    parents: [],
    references: [],
  };
  const expected = ':[Example](size.md)';
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should inflate input with string link', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: 'tiny',
      hrefType: 'string',
    },
  };
  const expected = 'tiny';
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should inflate input with http link', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: 'http://github.com/size.md',
      hrefType: 'http',
    },
  };
  const expected = 'big';
  const testStream = new InflateStream();

  nock('http://github.com').get('/size.md').reply(200, 'big\n');

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should skip input with invalid http link', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: 'http://github.com/i-dont-exist.md',
      hrefType: 'http',
    },
  };
  const expected = ':[Example](size.md)';
  const testStream = new InflateStream();

  nock('http://github.com').get('/size.md').reply(404);

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});


test.cb('should not make modifications if hrefType is unrecognised', (t) => {
  const input = {
    chunk: ':[Example](size.md)',
    link: {
      href: 'http://example.com',
      hrefType: 'null',
    },
  };
  const expected = ':[Example](size.md)';
  const testStream = new InflateStream();

  testStream.on('readable', function read() {
    let chunk = null;
    while ((chunk = this.read()) !== null) {
      t.same(chunk.chunk, expected);
    }
  });

  testStream.on('end', function end() {
    t.end();
  });

  testStream.write(input);
  testStream.end();
});
